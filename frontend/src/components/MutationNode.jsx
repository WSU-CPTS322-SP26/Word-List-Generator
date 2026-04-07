import React from 'react';
import { Handle, Position, useEdges, useNodes } from 'reactflow';

const MutationNode = ({ id, data }) => {
    const edges = useEdges();
    const nodes = useNodes();

    const getDynamicLabel = () => {
        if (data.type !== 'pend') return data.label;

        let isAppend = false;
        let isPrepend = false;
        let currentNodeId = id;
        const visited = new Set();

        while (currentNodeId && !visited.has(currentNodeId)) {
            visited.add(currentNodeId);
            const edge = edges.find(e => e.source === currentNodeId || e.target === currentNodeId);
            if (!edge) break;

            const neighborId = edge.source === currentNodeId ? edge.target : edge.source;
            const neighborNode = nodes.find(n => n.id === neighborId);

            if (neighborNode?.type === 'wordlist') {
                const wordlistHandle = (edge.target === neighborId) ? edge.targetHandle : edge.sourceHandle;
                if (wordlistHandle === 'left') isPrepend = true;
                if (wordlistHandle === 'right') isAppend = true;
                break;
            }
            currentNodeId = neighborId;
        }

        if (isAppend) return 'Append';
        if (isPrepend) return 'Prepend';
        return data.label;
    };

    const currentLabel = getDynamicLabel();
    const isCapitalize = data.type === 'capitalize';

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
        return false;
    });

    // const showSideHandles = !isCapitalize && !isOptionInStack;

    // modified this logic so that if you connect two pends to eachother first,
    // then you can still connect the side connects incase you forgot to connect to wordlist first
    const showSideHandles = !isCapitalize;

    return (
        <div style={{ padding: '10px', 
        borderRadius: '5px', 
        background: '#fff', 
        border: '2px solid #333', 
        minWidth: '150px', 
        position: 'relative' 
        }}>
            {showSideHandles && (
                <>
                    <Handle type="target" position={Position.Left} id="left" />
                    <Handle type="source" position={Position.Right} id="right" />
                </> 
            )}
            <Handle type="target" position={Position.Top} id="top" />
            <Handle type="source" position={Position.Bottom} id="bottom" />
            <div style={{ textAlign: 'center', fontWeight: 'bold', color: '#333' }}>
                {currentLabel}
            </div>

            {/* Input Field Prototype */}
            <div className="nodrag">
                {data.type === 'pend' ? (
                    <input
                        type="text"
                        placeholder="Charset..."
                        value={data.value || ''}
                        onChange={(e) => data.onChange(id, e.target.value)}
                        style={{ width: '100%', fontSize: '12px', padding: '2px' }}
                    />
                ) : (
                    <select
                        value={data.value || 'lower'}
                        onChange={(e) => data.onChange(id, e.target.value)}
                        style={{ width: '100%', fontSize: '12px' }}
                    >
                        <option value="uppercase">UPPERCASE</option>
                        <option value="lowercase">lowercase</option>
                    </select>
                )}
            </div>
        </div>
    );
};

export default MutationNode;