// Import default React tools
import React, { useState, useCallback } from 'react';
import ReactFlow, { addEdge, Background, Controls, applyNodeChanges, Handle, Position, useEdges, useNodes } from 'reactflow';

// Import custom function from app.go
import { StartPipeline } from '../wailsjs/go/main/App';

// Import Style
import 'reactflow/dist/style.css';


let id = 10;
const getID = () => `node_${id++}`;

const MutationNode = ({ id, data }) => {
    const edges = useEdges();
    const nodes = useNodes();

    {/* Checking if it's a capitalize block */}
    const isCapitalize = data.type === 'capitalize'

    const isOptionInStack = edges.some((edge) => {
        const isPart = edge.source === id || edge.target === id;
        const isVert = (edge.sourceHandle === 'top' || edge.sourceHandle === 'bottom' ||
                        edge.targetHandle === 'top' || edge.targetHandle === 'bottom');

        if (isPart && isVert) {
            const otherId = edge.source === id ? edge.target : edge.source;
            const otherNode = nodes.find(n => n.id === otherId);
            
            if (otherNode?.type === 'mutation') {

                const otherHasHorizontal = edges.some(e =>
                    (e.source === otherId && (e.sourceHandle === 'left' || e.sourceHandle === 'right')) ||
                    (e.target === otherId && (e.targetHandle === 'left' || e.targetHandle === 'right'))
                );

                const thisHasHorizontal = edges.some(e => 
                    (e.source === id && (e.sourceHandle === 'left' || e.sourceHandle === 'right')) ||
                    (e.target === id && (e.targetHandle === 'left' || e.targetHandle === 'right'))
                );

                if (thisHasHorizontal) return false;
                if (otherHasHorizontal) return true;

                return edge.source === id;
            }
        }
        return false
    });

    const showSideHandles = !isCapitalize && !isOptionInStack;

    return (
        <div style={{ 
                padding: '10px', 
                borderRadius: '5px', 
                background: '#fff',
                border: '2px solid #333',
                minWidth: '150px', 
                position: 'relative' 
            }}>
            {/* L-R Handles: Optional */ }
                {showSideHandles && (
                    <>
                        <Handle type="target" position={Position.Left} id="left" />
                        <Handle type="source" position={Position.Right} id="right" />
                    </> 
                )}

            {/* Top-Bottom Handles */}
            <Handle type="target" position={Position.Top} id="top" />
            <Handle type="source" position={Position.Bottom} id="bottom" />
            
            <div style={{ textAlign: 'center', fontWeight: 'bold', color: '#333' }}>
                {data.label}
            </div>
        </div>
    );
};

const WordlistNode = ({ data }) => {
    return (
        <div style={{
            padding: '15px',
            borderRadius: '8px',
            background: '#e3f2fd',
            border: '2px solid #1976d2',
            minWidth: '180px',
            position: 'relative',
            boxShadow: '0 4px 6px rgba(0,0,0.1)'
        }}>
            <Handle type="target" position={Position.Left} id="left" />
            <Handle type="source" position={Position.Right} id="right" />
            <Handle type="target" position={Position.Top} id="top" />
            <Handle type="source" position={Position.Bottom} id="bottom" />
    
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '1976d2', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Original Wordlist
                </div>
                <div style={{ fontWeight: 'bold', color: '#333', marginTop: '4px' }}>
                    {data.label || 'No File Loaded'}
                </div>

                <button 
                    className="nodrag"
                    onClick={() => console.log("TODO: Open a dialogue box")}
                    style={{
                        marginTop: '10px',
                        cursor: 'pointer',
                        width: '100%',
                        padding: '5px',
                        borderRadius: '4px',
                        border: '1px solid #1976d2',
                        background: '#fff',
                        color: '#1976d2',
                        fontWeight: 'bold'
                    }}
                >
                    Load Wordlist
                </button>
                
                {data.fileSize && (
                    <div style={{ fontSize: '11px', color: '#666' }}>{data.fileSize} words</div>
                )}
            </div>
        </div>
    );
};

const nodeTypes = {
    mutation: MutationNode,
    wordlist: WordlistNode,
};

const initialNodes = [
    {
        id: 'wordlist-1',
        type: 'wordlist',
        position: { x: 400, y: 300},
        data: { label: 'wordlist.txt', fileSize: '0'},
        draggable: true,
    }
];

export default function App() {
    //Getting the initial nodes
    const [nodes, setNodes] = useState(initialNodes);
    // Getting edge feature from reactflow
    const [edges, setEdges] = useState([]);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const [isPaletteOpen, setIsPaletteOpen] = useState(true);

    // Ability to move blocks
    const onNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        [setNodes]
    );

    const onConnect = useCallback(
        (params) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    // Dragging onto canvas
    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onNodeDataChange = useCallback((nodeId, newValue) => {
        setNodes((nds) => nds.map((node) =>
            node.id === nodeId ? { ...node, data: { ...node.data, value: newValue } } : node
        )); 
    }, []);



    // Dropping onto canvas (creating new node)
    const onDrop = useCallback(
        (event) => {
            event.preventDefault();

            // Getting block type of dragged element
            const type = event.dataTransfer.getData('application/reactflow');
            if (!type) return;

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const count = nodes.filter(n => n.data.type === type).length + 1;
            const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);

            const newNode = {
                id: getID(),
                type: 'mutation',
                position,
                data: {
                    type: type, 
                    value: '', 
                    label : `${capitalizedType} ${count}`,
                    onChange: onNodeDataChange
                },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, nodes]
    );

    // Palette Buttons
    const onDragStart = (event, nodeType) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    }

    // The "Run" button: generates manifest for StartPipeline to read into a mutspec and then create a pipeline
    const handleRun = () => {
        // Maps all nodes on the screen to an object, 
        // TODO: Support for multiple operations in the same stage
        const manifest = nodes.map(node => ([{
            type: node.data.type,
            params: { charset: node.data.value }
        }]));

        StartPipeline(manifest).then(console.log);
    };

    const isValidConnection = (connection) => {
        
        const sourceNode = nodes.find(n => n.id === connection.source);
        const targetNode = nodes.find(n => n.id === connection.target);

        const sourceH = connection.sourceHandle;
        const targetH = connection.targetHandle;

        const isHorizontal = (sourceH === 'left' || sourceH === 'right') &&
                                (targetH === 'left' || targetH === 'right');

        const isVertical = (sourceH === 'top' || sourceH === 'bottom') &&
                        (targetH === 'top' || targetH === 'bottom');

        if (sourceNode?.data.type === 'capitalize' || targetNode?.data.type === 'capitalize') {
            const capitalizeNode = sourceNode?.data.type === 'capitalize' ? sourceNode: targetNode;
            const otherNode = sourceNode === capitalizeNode ? targetNode: sourceNode;

            return (otherNode?.type === 'wordlist' || otherNode?.data.type === 'capitalize') && isVertical;
        }

        if ((sourceNode?.type === 'wordlist' || targetNode?.type === 'wordlist') && isVertical) {
            return false;
        }

        return isHorizontal || isVertical;
    };

    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex'}}>
            {/* COLLAPSIBLE PALLETTE SIDEBAR */}
            <div style={{
                width: isPaletteOpen ? '250px' : '0px',
                transition: 'width 0.3s',
                borderRight: isPaletteOpen ? '1px solid #ccc' : 'none',
                background: '#f8f9fa',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style ={{padding: '15px', minWidth: '220px'}}>
                    <h3 style={{ marginTop: 0 }}>Blocks</h3>
                    <p style={{ fontSize: '12px', color: '#666'}}>Drag to canvas</p>

                    {/*The Draggable Bocks */}
                    <div
                        onDragStart={(e) => onDragStart(e, 'append')}
                        draggable
                        style={{ padding: '10px', border: '1px solid #333', marginBottom: '10px', cursor: 'grab', background: '#fff', borderRadius: '4px' }}
                    >
                        Append
                    </div>
                    <div
                        onDragStart={(e) => onDragStart(e, 'prepend')}
                        draggable
                        style={{ padding: '10px', border: '1px solid #333', marginBottom: '10px', cursor: 'grab', background: '#fff', borderRadius: '4px' }}
                    >
                        Prepend
                    </div>
                    <div
                        onDragStart={(e) => onDragStart(e, 'capitalize')}
                        draggable
                        style={{ padding: '10px', border: '1px solid #333', cursor: 'grab', background: '#fff', borderRadius: '4px' }}
                    >
                        Capitalize
                    </div>
                </div>
            </div>    

            {/*MAIN CANVAS AREA */}
            <div style={{ flexGrow: 1, position: 'relative' }}>
                {/* UI Buttons OverlY */}
                <div style={{ position: 'absolute', zIndex: 10, top: 10, left: 10, display: 'flex', gap: '10px'}}>
                    <button onClick={() => setIsPaletteOpen(!isPaletteOpen)}>
                    </button>
                    <button onClick={() => handleRun(nodes)}>
                        RUN PIPELINE
                    </button>
                </div>
                
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes = {nodeTypes}
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