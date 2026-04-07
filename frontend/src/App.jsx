import React, { useState, useCallback } from 'react';
import ReactFlow, { addEdge, Background, Controls, applyNodeChanges } from 'reactflow';
import { StartPipeline } from '../wailsjs/go/main/App';

import MutationNode from './components/MutationNode';
import WordlistNode from './components/WordlistNode';
import Sidebar from './components/Sidebar';

import 'reactflow/dist/style.css';

const nodeTypes = {
    mutation: MutationNode,
    wordlist: WordlistNode,
};

let id = 10;
const getID = () => `node_${id++}`;

const initialNodes = [
    { id: 'wordlist-1', type: 'wordlist', position: { x: 400, y: 300}, data: { label: 'wordlist.txt', fileSize: '0'}, draggable: true }
];

export default function App() {
    const [nodes, setNodes] = useState(initialNodes);
    const [edges, setEdges] = useState([]);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const [isPaletteOpen, setIsPaletteOpen] = useState(true);

    const onNodesChange = useCallback((changes) => {
        const filteredChanges = changes.filter((change) => {
            if (change.type === 'remove') {
                const nodeToRemove = nodes.find((n) => n.id === change.id);
                return nodeToRemove?.type !== 'wordlist';
            }
            return true;
        });
        setNodes((nds) => applyNodeChanges(filteredChanges, nds));
    }, [nodes]);

    const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onNodeDataChange = useCallback((nodeId, newValue) => {
        setNodes((nds) => nds.map((node) =>
            node.id === nodeId ? { ...node, data: { ...node.data, value: newValue } } : node
        )); 
    }, []);

    const onDrop = useCallback((event) => {
        event.preventDefault();
        const type = event.dataTransfer.getData('application/reactflow');
        if (!type) return;

        const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const displayLabel = type.charAt(0).toUpperCase() + type.slice(1);

        const newNode = {
            id: getID(),
            type: 'mutation',
            position,
            data: { 
                type, 
                //Default values
                value: type === 'capitalize' ? 'uppercase' : '',
                label: displayLabel,
                onChange: onNodeDataChange },
        };
        setNodes((nds) => nds.concat(newNode));
    }, [reactFlowInstance, onNodeDataChange]);

    const onDragStart = (event, nodeType) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    }

    // TO DO
    // Make this work properly. Needs to ignore the wordlist node 
    // And possibly add a default language for capitalization
    // const handleRun = () => {
    //     const manifest = nodes.map(node => {
    //         let actualType = node.data.type;
    //         if (actualType === 'pend') {
    //             const edge = edges.find(e => e.source === node.id || e.target === node.id);
    //             const isLeft = edge?.sourceHandle === 'left' || edge?.targetHandle === 'left';
    //             actualType = isLeft ? 'prepend': 'append';
    //         }
    //         return [{ type: actualType, params: { charset: node.data.value } }];
    //     });
    //     StartPipeline(manifest).then(console.log);
    // };
    // adding in a new implementation for the handleRun
    const handleRun = () => {
        // Find the wordlist node which will be the central hub of the pipeline
        // everything connecting to and flows from the central node
        const wordlistNode = nodes.find(n => n.type === 'wordlist');
        if (!wordlistNode) return;

        // Collects all vertically stacked nodes starting from a given node id
        // Vertical connections represent OR alternatives — they all run independently
        // on the same word and each produce their own set of variants
        // Uses a queue (BFS) to find all nodes in the vertical stack
        // visited is shared with the main traversal so we never process a node twice
        const getOrGroup = (startId, visited) => {
            const group = [];
            const queue = [startId];
            while (queue.length > 0) {
                const id = queue.shift();
                if (visited.has(id)) continue;
                visited.add(id);
                const node = nodes.find(n => n.id === id);
                if (!node) continue;
                group.push(node);
                // Find all vertically connected neighbors (top/bottom)
                // add them to the queue to be processed
                // Also checks that the neighbor node still exists in case it was deleted
                // but the edge was not cleaned up.
                edges
                    .filter(e =>
                        ((e.source === id && (e.sourceHandle === 'top' || e.sourceHandle === 'bottom')) ||
                            (e.target === id && (e.targetHandle === 'top' || e.targetHandle === 'bottom'))) &&
                        nodes.some(n => n.id === (e.source === id ? e.target : e.source))
                    )
                    .forEach(e => {
                        const neighborId = e.source === id ? e.target : e.source;
                        if (!visited.has(neighborId)) queue.push(neighborId);
                    });
            }
            return group;
        };

        // Converts a single visual node into a MutSpec object that the Go backend can understand
        // type is passed in explicitly for pend nodes since append vs prepend is determined
        // by which side of the wordlist the chain is on, not by the node itself
        // for capitalize nodes the type is determined by the dropdown value.

        const toMutSpec = (node, type) => {
            if (node.data.type === 'pend') {
                // type is either prepend of append passed in from traverse chain
                return { type, params: { charset: node.data.value || '' } };
            }
            if (node.data.type === 'capitalize') {
                // reads the droodown value from the node for upper or lower
                const capType = node.data.value === 'lowercase' ? 'lowercase' : 'uppercase';
                //english is the defaul tlang which uses standard go casting rules
                // other languages like turkish have special casing rules and can be added later
                return { type: capType, params: { language: 'english' } };
            }
            // fallback for any other nodes to be added in the future
            return { type: node.data.type, params: {} };
        };

        // Traverses a horizontal chain away from the wordlist
        // Each horizontal step (left/right handle connection) is a new sequential stage
        // in the pipeline — stages run one after another left to right in the manifest
        // Vertical stacks at each step are collected as OR alternatives for that stage
        // direction is either 'prepend' (going left) or 'append' (going right)
        // and is passed to toMutSpec so pend nodes get the correct type
        const traverseChain = (startEdge, direction, visited) => {
            //
            const stages = [];
            const firstNodeId = startEdge.source === wordlistNode.id
                ? startEdge.target
                : startEdge.source;

            let currentId = firstNodeId;

            while (currentId && !visited.has(currentId)) {
                const orGroup = getOrGroup(currentId, visited);
                if (orGroup.length === 0) break;

                const stage = orGroup.map(node => toMutSpec(node, direction));
                stages.push(stage);

                // Find the next horizontal node in the chain going away from wordlist
                let nextId = null;
                for (const node of orGroup) {
                    const nextEdge = edges.find(e => {
                        if (direction === 'prepend') {
                            // Going left, so follow left handle connections
                            return (e.source === node.id && e.sourceHandle === 'left' ||
                                    e.target === node.id && e.targetHandle === 'left') &&
                                !visited.has(e.source === node.id ? e.target : e.source);
                        } else {
                            // Going right, so follow right handle connections
                            return (e.source === node.id && e.sourceHandle === 'right' ||
                                    e.target === node.id && e.targetHandle === 'right') &&
                                !visited.has(e.source === node.id ? e.target : e.source);
                        }
                    });
                    if (nextEdge) {
                        nextId = nextEdge.source === node.id ? nextEdge.target : nextEdge.source;
                        break;
                    }
                }
                currentId = nextId;
            }

            return stages;
        };

        const manifest = [];
        const visited = new Set([wordlistNode.id]);

        // Step 1 — find and add capitalize stage first
        const capitalizeEdge = edges.find(e =>
            (e.source === wordlistNode.id && (e.sourceHandle === 'top' || e.sourceHandle === 'bottom')) ||
            (e.target === wordlistNode.id && (e.targetHandle === 'top' || e.targetHandle === 'bottom'))
        );
        if (capitalizeEdge) {
            const capStartId = capitalizeEdge.source === wordlistNode.id
                ? capitalizeEdge.target
                : capitalizeEdge.source;
            const capGroup = getOrGroup(capStartId, visited);
            if (capGroup.length > 0) {
                manifest.push(capGroup.map(node => toMutSpec(node, null)));
            }
        }

        // Step 2 — traverse prepend chain going left
        const leftEdge = edges.find(e =>
            (e.source === wordlistNode.id && e.sourceHandle === 'left') ||
            (e.target === wordlistNode.id && e.targetHandle === 'left')
        );
        if (leftEdge) {
            const prependStages = traverseChain(leftEdge, 'prepend', visited);
            manifest.push(...prependStages);
        }

        // Step 3 — traverse append chain going right
        const rightEdge = edges.find(e =>
            (e.source === wordlistNode.id && e.sourceHandle === 'right') ||
            (e.target === wordlistNode.id && e.targetHandle === 'right')
        );
        if (rightEdge) {
            const appendStages = traverseChain(rightEdge, 'append', visited);
            manifest.push(...appendStages);
        }

        console.log('manifest:', JSON.stringify(manifest, null, 2));
        StartPipeline(manifest).then(result => {
            console.log(result);
            alert(JSON.stringify(manifest, null, 2));
        });
    };

    const isValidConnection = (connection) => {
        // this is logic that lets only one connection at each connection point so we dont get
        // multiple things trying to connect to one spot on a block
        // we also need to check if a node still exists or it will lock out re connections if a node is deleted.
        const handleAlreadyUsed = edges.some(e =>
            ((e.target === connection.target && e.targetHandle === connection.targetHandle) ||
                (e.source === connection.source && e.sourceHandle === connection.sourceHandle)) &&
            nodes.some(n => n.id === e.source) &&
            nodes.some(n => n.id === e.target)
        );
        // end of one connector logic added
        if (handleAlreadyUsed) return false;
        const sourceNode = nodes.find(n => n.id === connection.source);
        const targetNode = nodes.find(n => n.id === connection.target);
        const isHorizontal = (connection.sourceHandle === 'left' || connection.sourceHandle === 'right') && 
        (connection.targetHandle === 'left' || connection.targetHandle === 'right');
        const isVertical = (connection.sourceHandle === 'top' || connection.sourceHandle === 'bottom') && 
        (connection.targetHandle === 'top' || connection.targetHandle === 'bottom');

        if (sourceNode?.data.type === 'capitalize' || targetNode?.data.type === 'capitalize') {
            const capitalizeNode = sourceNode?.data.type === 'capitalize' ? sourceNode : targetNode;
            const otherNode = sourceNode === capitalizeNode ? targetNode : sourceNode;
            return (otherNode?.type === 'wordlist' || otherNode?.data.type === 'capitalize') && isVertical;
        }
        if ((sourceNode?.type === 'wordlist' || targetNode?.type === 'wordlist') && isVertical) return false;
        return isHorizontal || isVertical;
    };

    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex'}}>
            <Sidebar isPaletteOpen={isPaletteOpen} onDragStart={onDragStart} />
            <div style={{ flexGrow: 1, position: 'relative' }}>
                <div style={{ position: 'absolute', zIndex: 10, top: 10, left: 10, display: 'flex', gap: '10px'}}>
                    <button onClick={() => setIsPaletteOpen(!isPaletteOpen)}>Toggle Sidebar</button>
                    <button onClick={handleRun}>RUN PIPELINE</button>
                </div>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    onNodesChange={onNodesChange}
                    onConnect={onConnect}
                    onInit={setReactFlowInstance}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    isValidConnection={isValidConnection}
                    style={{ background: '#ffffff' }}
                >
                    <Background color="#aaa" gap={16} />
                    <Controls />
                </ReactFlow>
            </div>
        </div>
    );
}