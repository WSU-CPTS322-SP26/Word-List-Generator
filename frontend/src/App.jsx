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
    const handleRun = () => {
        const manifest = nodes.map(node => {
            let actualType = node.data.type;
            if (actualType === 'pend') {
                const edge = edges.find(e => e.source === node.id || e.target === node.id);
                const isLeft = edge?.sourceHandle === 'left' || edge?.targetHandle === 'left';
                actualType = isLeft ? 'prepend': 'append';
            }
            return [{ type: actualType, params: { charset: node.data.value } }];
        });
        StartPipeline(manifest).then(console.log);
    };

    const isValidConnection = (connection) => {
        // this is logic that lets only one connection at each connection point so we dont get
        // multiple things trying to connect to one spot on a block
        const handleAlreadyUsed = edges.some(e =>
            (e.target === connection.target && e.targetHandle === connection.targetHandle) ||
            (e.source === connection.source && e.sourceHandle === connection.sourceHandle)
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