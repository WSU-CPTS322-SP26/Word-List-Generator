import React from 'react';
import { Handle, Position, useEdges, useNodes } from 'reactflow';

const MutationNode = ({ id, data }) => {
    const edges = useEdges();
    const nodes = useNodes();

    const getDynamicLabel = () => {
        if (data.type !== 'pend') return data.label;

        // BFS to reliably find the wordlist without getting stuck in edge loops
        const queue = [id];
        const visited = new Set();
        let isAppend = false;
        let isPrepend = false;

        while (queue.length > 0) {
            const currentId = queue.shift();
            if (visited.has(currentId)) continue;
            visited.add(currentId);

            // Find all edges connected to the current node
            const connectedEdges = edges.filter(e => e.source === currentId || e.target === currentId);

            for (const edge of connectedEdges) {
                const neighborId = edge.source === currentId ? edge.target : edge.source;
                const neighborNode = nodes.find(n => n.id === neighborId);

                // If we found the wordlist, check which side we are attached to!
                if (neighborNode?.type === 'wordlist') {
                    const wordlistHandle = (edge.target === neighborId) ? edge.targetHandle : edge.sourceHandle;
                    if (wordlistHandle === 'left') isPrepend = true;
                    if (wordlistHandle === 'right') isAppend = true;
                    break;
                }

                // If it's not the wordlist, add it to the queue to keep searching
                if (!visited.has(neighborId)) {
                    queue.push(neighborId);
                }
            }

            // Stop searching if we successfully identified the side
            if (isAppend || isPrepend) break;
        }

        if (isAppend) return 'Append';
        if (isPrepend) return 'Prepend';
        return data.label;
    };

    const currentLabel = getDynamicLabel();
    const isCapitalize = data.type === 'capitalize';

    const showSideHandles = !isCapitalize;

    return (
        <div style={{ padding: '10px', borderRadius: '5px', background: '#fff', border: '2px solid #333', minWidth: '150px', position: 'relative' }}>
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