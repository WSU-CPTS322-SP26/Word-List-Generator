import React, { useState, useMemo } from 'react';
import { Handle, Position, useEdges, useNodes } from 'reactflow';

const CHARSET_PRESETS = [
    { label: 'Digits (0–9)',    value: 'digits' },
    { label: 'Alpha lowercase', value: 'alpha_lower' },
    { label: 'Alpha uppercase', value: 'alpha_upper' },
    { label: 'Alpha all',       value: 'alpha_all' },
    { label: 'Hex lowercase',   value: 'hex_lower' },
    { label: 'Hex uppercase',   value: 'hex_upper' },
    { label: 'Special chars',   value: 'special_all' },
    { label: 'All chars',       value: 'all' },
    { label: 'Custom…',         value: '__custom__' },
];

const CHARSET_PREVIEWS = {
    digits:       '0123456789',
    alpha_lower:  'abcdefghijklmnopqrstuvwxyz',
    alpha_upper:  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    alpha_all:    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
    hex_lower:    '0123456789abcdef',
    hex_upper:    '0123456789ABCDEF',
    special_all:  '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
    all:          '0-9, a-z, A-Z, and all special chars',
    __custom__:   null, // no preview for custom
};

const CharsetTooltip = ({ preset, customValue }) => {
    const [visible, setVisible] = useState(false);
    const preview = preset === '__custom__' ? customValue : CHARSET_PREVIEWS[preset];
    if (!preview) return null;

    return (
        <span style={{ position: 'relative', display: 'inline-block', marginLeft: '5px' }}>
            <span
                onMouseEnter={() => setVisible(true)}
                onMouseLeave={() => setVisible(false)}
                style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '13px', height: '13px', borderRadius: '50%',
                    border: '1px solid #555', color: '#777', fontSize: '9px',
                    cursor: 'default', userSelect: 'none', lineHeight: 1,
                    verticalAlign: 'middle',
                }}
            >?</span>
            {visible && (
                <div style={{
                    position: 'absolute',
                    bottom: '120%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#2a2a2a',
                    border: '1px solid #555',
                    borderRadius: '3px',
                    padding: '6px 8px',
                    fontSize: '11px',
                    color: '#ccc',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    width: '180px',
                    maxHeight: '80px',
                    overflowY: 'auto',
                    zIndex: 200,
                    pointerEvents: 'none',
                    lineHeight: '1.4',
                    fontFamily: 'monospace',
                }}>
                    {preview}
                </div>
            )}
        </span>
    );
};

const TrashIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {/* lid handle */}
        <path d="M9 3h6" />
        {/* lid */}
        <path d="M3 7h18" />
        {/* bin body */}
        <path d="M5 7l1.5 13h11L19 7" />
        {/* vertical slots */}
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
);

const inputStyle = {
    background: '#1a1a1a', border: '1px solid #444', color: '#f0f0f0',
    padding: '3px 5px', fontSize: '12px', width: '100%',
    borderRadius: '2px', boxSizing: 'border-box',
};

const MutationNode = ({ id, data, selected }) => {
    const edges = useEdges();
    const nodes = useNodes();

    const getDynamicLabel = () => {
        if (data.type !== 'pend') return data.label;
        let currentNodeId = id;
        const visited = new Set();
        while (currentNodeId && !visited.has(currentNodeId)) {
            visited.add(currentNodeId);
            const edge = edges.find(e => e.source === currentNodeId || e.target === currentNodeId);
            if (!edge) break;
            const neighborId = edge.source === currentNodeId ? edge.target : edge.source;
            const neighborNode = nodes.find(n => n.id === neighborId);
            if (neighborNode?.type === 'wordlist') {
                const handle = edge.target === neighborId ? edge.targetHandle : edge.sourceHandle;
                if (handle === 'left') return 'Prepend';
                if (handle === 'right') return 'Append';
                break;
            }
            currentNodeId = neighborId;
        }
        return data.label;
    };

    const checkIfHideSideHandles = () => {
        if (data.type === 'capitalize') return true;
        const thisHasHorizontal = edges.some(e =>
            (e.source === id || e.target === id) &&
            ['left','right'].some(h => e.sourceHandle === h || e.targetHandle === h)
        );
        if (thisHasHorizontal) return false;
        const verticalEdges = edges.filter(e =>
            (e.source === id || e.target === id) &&
            ['top','bottom'].some(h => e.sourceHandle === h || e.targetHandle === h)
        );
        if (verticalEdges.length === 0) return false;
        const visited = new Set([id]);
        const queue = verticalEdges.map(e => e.source === id ? e.target : e.source);
        let stackHasHorizontal = false;
        let lowestNodeId = id;
        let lowestY = nodes.find(n => n.id === id)?.position.y || 0;
        while (queue.length > 0) {
            const cur = queue.shift();
            if (visited.has(cur)) continue;
            visited.add(cur);
            const curNode = nodes.find(n => n.id === cur);
            if (!curNode) continue;
            if (curNode.position.y > lowestY) { lowestY = curNode.position.y; lowestNodeId = cur; }
            const hasH = edges.some(e =>
                (e.source === cur || e.target === cur) &&
                ['left','right'].some(h => e.sourceHandle === h || e.targetHandle === h)
            );
            if (hasH) { stackHasHorizontal = true; break; }
            edges.forEach(e => {
                if (['top','bottom'].some(h => e.sourceHandle === h || e.targetHandle === h)) {
                    if (e.source === cur && !visited.has(e.target)) queue.push(e.target);
                    if (e.target === cur && !visited.has(e.source)) queue.push(e.source);
                }
            });
        }
        if (stackHasHorizontal) return true;
        return id !== lowestNodeId;
    };

    const showSideHandles = useMemo(() => !checkIfHideSideHandles(), [edges, nodes, id, data.type]);
    const selectedPreset = data.preset || 'digits';
    const isCustom = selectedPreset === '__custom__';
    const currentLabel = getDynamicLabel();

    return (
        <div style={{
            padding: '10px',
            borderRadius: '4px',
            background: '#1e1e1e',
            border: `2px solid ${selected ? '#ffffff' : '#3a3a3a'}`,
            boxShadow: selected ? '0 0 0 1px #ffffff33' : 'none',
            minWidth: '165px',
            position: 'relative',
            color: '#f0f0f0',
            transition: 'border-color 0.1s, box-shadow 0.1s',
        }}>
            {showSideHandles && (
                <>
                    <Handle type="target" position={Position.Left}  id="left"  style={{ background: '#555', border: '1px solid #888' }} />
                    <Handle type="source" position={Position.Right} id="right" style={{ background: '#555', border: '1px solid #888' }} />
                </>
            )}
            <Handle type="target" position={Position.Top}    id="top"    style={{ background: '#555', border: '1px solid #888' }} />
            <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: '#555', border: '1px solid #888' }} />

            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', marginBottom: '7px', letterSpacing: '0.5px' }}>
                {currentLabel}
            </div>

            <div className="nodrag">
                {data.type === 'pend' && (
    <>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <select
                value={selectedPreset}
                onChange={e => {
                    data.onPresetChange(id, e.target.value);
                    if (e.target.value !== '__custom__') data.onChange(id, e.target.value);
                }}
                style={{ ...inputStyle, cursor: 'pointer', flex: 1 }}
            >
                {CHARSET_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <CharsetTooltip preset={selectedPreset} customValue={data.value} />
        </div>
        {isCustom && (
            <input
                type="text"
                placeholder="e.g. abc!@#"
                value={data.value || ''}
                onChange={e => data.onChange(id, e.target.value)}
                style={inputStyle}
            />
        )}
    </>
)}
                {data.type === 'capitalize' && (
                    <select
                        value={data.value || 'uppercase'}
                        onChange={e => data.onChange(id, e.target.value)}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                        <option value="uppercase">UPPERCASE</option>
                        <option value="lowercase">lowercase</option>
                        <option value="title_case">Title Case</option>
                    </select>
                )}
            </div>

            {selected && (
                <button
                    className="nodrag"
                    title="Delete node (or press Delete)"
                    onClick={() => data.onDelete(id)}
                    style={{
                        position: 'absolute',
                        bottom: '-14px',
                        right: '-14px',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: '#1e1e1e',
                        border: '2px solid #666',
                        color: '#bbb',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        zIndex: 10,
                        transition: 'border-color 0.1s, color 0.1s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#f0f0f0'; e.currentTarget.style.color = '#f0f0f0'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#666'; e.currentTarget.style.color = '#bbb'; }}
                >
                    <TrashIcon />
                </button>
            )}
        </div>
    );
};

export default MutationNode;