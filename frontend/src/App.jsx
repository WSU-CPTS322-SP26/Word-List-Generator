// Import default React tools
import React, { useState, useCallback } from 'react';
import ReactFlow, { addEdge, Background, Controls, applyNodeChanges, Handle, Position, useEdges } from 'reactflow';

// Import custom function from app.go
import { StartPipeline } from '../wailsjs/go/main/App';

// Import Style
import 'reactflow/dist/style.css';


let id = 10;
const getID = () => `node_${id++}`;

const initialNodes = [];

const MutationNode = ({ id, data }) => {
    const edges = useEdges();
    {/* Checking if it's a capitalize block */}
    const isCapitalize = data.type === 'capitalize'

    const isStacked = edges.some(
        (edge) => (edge.source === id || edge.target === id) &&
                (edge.sourceHandle === 'top' || edge.sourceHandle === 'bottom' ||
                    edge.targetHandle === 'top' || edge.targetHandle === 'bottom')
    );

    const showSideHandles = !isCapitalize && !isStacked;

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

const nodeTypes = {
    mutation: MutationNode,
};



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
                    label : `${capitalizedType} ${count}`
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
        const source = connection.sourceHandle;
        const target = connection.targetHandle;


        const isHorizontal = (source === 'left' || source === 'right') &&
                                (target === 'left' || target === 'right');

        const isVertical = (source === 'top' || source === 'bottom') &&
                        (target === 'top' || target === 'bottom');

        // Rule 1: No diagonal connections
        if (!isHorizontal && !isVertical) return false;

        // Rule 2: Rock lock
        if(isHorizontal) {
            ///Checking if the node is already stacked
            const isStacked = (nodeId) => edges.some(e =>
                (e.source === nodeId || e.target === nodeId) &&
                (e.sourceHandle === 'top' || e.sourceHandle === 'bottom' ||
                    e.targetHandle === 'top' || e.targetHandle === 'bottom')
            );
            
            if (isStacked(connection.source) || isStacked(connection.target)) {
                return false;
            }
        }

        return true;
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