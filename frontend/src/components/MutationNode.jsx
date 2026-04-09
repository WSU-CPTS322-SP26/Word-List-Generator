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


            // If we found the wordlist, check which side we are attached to!
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

    const checkIfHideSideHandles = () => {
        if (isCapitalize) return true;

        const thisHasHorizontal = edges.some(e =>
            (e.source === id || e.target === id) &&
            (e.sourceHandle === 'left' || e.sourceHandle === 'right' || e.targetHandle === 'left' || e.targetHandle === 'right')
        );
        if (thisHasHorizontal) return false;

        const verticalEdges = edges.filter(e => 
            (e.source === id || e.target === id) &&
            (e.sourceHandle === 'top' || e.sourceHandle === 'bottom' || e.targetHandle === 'top' || e.targetHandle === 'bottom')
        );

        if (verticalEdges.length === 0) return false;

        const visited = new Set([id]);
        const queue = [...verticalEdges.map(e => (e.source === id ? e.target : e.source))];
        let stackHasHorizontal = false;

        let lowestNodeId = id;
        let lowestY = nodes.find(n => n.id === id)?.position.y || 0;

        while (queue.length > 0) {
            const currentId = queue.shift();
            if (visited.has(currentId)) continue;
            visited.add(currentId);

            const currentNode = nodes.find(n => n.id === currentId);
            if (!currentNode) continue;

            if (currentNode.position.y > lowestY) {
                lowestY = currentNode.position.y;
                lowestNodeId = currentId;
            }

            const hasHoriz = edges.some(e => 
            (e.source === currentId || e.target === currentId) &&
            (e.sourceHandle === 'left' || e.sourceHandle === 'right' || e.targetHandle === 'left' || e.targetHandle === 'right')
            );

            if (hasHoriz) {
                stackHasHorizontal = true;
                break;
            }

            edges.forEach(e => {
                const isVert = e.sourceHandle === 'top' || e.sourceHandle === 'bottom' || e.targetHandle === 'top' || e.targetHandle === 'bottom';
                if (isVert) {
                    if (e.source === currentId && !visited.has(e.target)) queue.push(e.target);
                    if (e.target === currentId && !visited.has(e.source)) queue.push(e.source);
                }
            });
        }

        if (stackHasHorizontal) return true;

        return id !== lowestNodeId;
    };

    const showSideHandles = !checkIfHideSideHandles();


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