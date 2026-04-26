import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';

const TrashIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3h6" />
        <path d="M3 7h18" />
        <path d="M5 7l1.5 13h11L19 7" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
);

const PRESET_LEVELS = {
    '1': 'e:3,a:4',
    '2': 'e:3,a:4,i:1,o:0,s:5,t:7',
    '3': 'e:3,a:4,i:1,o:0,s:5,t:7,b:8,g:9,l:1,z:2,q:0,x:%',
};

const inputStyle = {
    background: '#1a1a1a', border: '1px solid #444', color: '#f0f0f0',
    padding: '3px 5px', fontSize: '11px', width: '100%',
    borderRadius: '2px', boxSizing: 'border-box',
};

const Tooltip = ({ text }) => {
    const [visible, setVisible] = useState(false);
    return (
        <span style={{ position: 'relative', display: 'inline-block' }}>
            <span
                onMouseEnter={() => setVisible(true)}
                onMouseLeave={() => setVisible(false)}
                style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '14px', height: '14px', borderRadius: '50%',
                    border: '1px solid #555', color: '#777', fontSize: '10px',
                    cursor: 'default', userSelect: 'none', lineHeight: 1,
                }}
            >?</span>
            {visible && (
                <div style={{
                    position: 'absolute', bottom: '120%', left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#2a2a2a', border: '1px solid #555', borderRadius: '3px',
                    padding: '7px 10px', fontSize: '11px', color: '#ccc',
                    whiteSpace: 'pre-line', width: '190px', zIndex: 100,
                    pointerEvents: 'none', lineHeight: '1.5',
                }}>
                    {text}
                </div>
            )}
        </span>
    );
};

const TOOLTIP_TEXT = `Format: letter:replacement, comma-separated.\n\nExample:\n  a:4,e:3,s:5,t:7\n\nEach letter must be a single character. Replacements can be any string. Matching is case-insensitive.`;

export default function L33tspeakNode({ id, data, selected }) {
    const mode = data.leetMode || 'preset';
    const level = data.value || '1';
    const advancedText = data.advancedText ?? '';
    const update = (patch) => data.onPatch(id, patch);

    const switchToAdvanced = () => {
        if (!data.advancedText) {
            update({ leetMode: 'advanced', advancedText: PRESET_LEVELS[level] || '' });
        } else {
            update({ leetMode: 'advanced' });
        }
    };

    const tabBtn = (label, active, onClick) => (
        <button onClick={onClick} style={{
            flex: 1, padding: '3px 0', fontSize: '11px', cursor: 'pointer',
            background: active ? '#f0f0f0' : '#252525',
            color: active ? '#111' : '#888',
            border: '1px solid #3a3a3a', borderRadius: '2px',
        }}>{label}</button>
    );

    return (
        <div style={{
            padding: '10px', borderRadius: '4px', background: '#1e1e1e',
            border: `2px solid ${selected ? '#ffffff' : '#3a3a3a'}`,
            boxShadow: selected ? '0 0 0 1px #ffffff33' : 'none',
            minWidth: '210px', position: 'relative', color: '#f0f0f0',
            transition: 'border-color 0.1s, box-shadow 0.1s',
        }}>
            <Handle type="target" position={Position.Top}    id="top"    style={{ background: '#555', border: '1px solid #888' }} />
            <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: '#555', border: '1px solid #888' }} />

            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', letterSpacing: '1px' }}>
                L33TSPEAK
            </div>

            <div className="nodrag">
                <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                    {tabBtn('Preset', mode === 'preset', () => update({ leetMode: 'preset' }))}
                    {tabBtn('Advanced', mode === 'advanced', switchToAdvanced)}
                </div>

                {mode === 'preset' && (
                    <select value={level} onChange={e => update({ value: e.target.value })} style={{ ...inputStyle, cursor: 'pointer', fontSize: '12px' }}>
                        <option value="1">Level 1 — Minimal (a→4, e→3)</option>
                        <option value="2">Level 2 — Common (+i→1, o→0, s→5, t→7)</option>
                        <option value="3">Level 3 — Full (+b→8, g→9, l→1, z→2…)</option>
                    </select>
                )}

                {mode === 'advanced' && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', color: '#777' }}>Substitutions</span>
                            <Tooltip text={TOOLTIP_TEXT} />
                        </div>
                        <input
                            type="text"
                            placeholder="a:4,e:3,s:5,t:7"
                            value={advancedText}
                            onChange={e => update({ advancedText: e.target.value })}
                            style={inputStyle}
                        />
                        {advancedText && (() => {
                            const pairs = advancedText.split(',')
                                .map(p => p.trim().split(':'))
                                .filter(p => p.length === 2 && p[0].trim().length === 1);
                            return pairs.length > 0 && (
                                <div style={{ marginTop: '5px', display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                    {pairs.map(([l, r], i) => (
                                        <span key={i} style={{
                                            fontSize: '10px', background: '#252525',
                                            border: '1px solid #3a3a3a', borderRadius: '2px',
                                            padding: '1px 4px', color: '#bbb',
                                        }}>{l}→{r}</span>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>

            {selected && (
                <button
                    className="nodrag"
                    title="Delete node (or press Delete)"
                    onClick={() => data.onDelete && data.onDelete(id)}
                    style={{
                        position: 'absolute', bottom: '-14px', right: '-14px',
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: '#1e1e1e', border: '2px solid #666',
                        color: '#bbb', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 0, zIndex: 10,
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
}