import React from 'react';

const blockStyle = {
    padding: '10px 12px',
    border: '1px solid #444',
    marginBottom: '8px',
    cursor: 'grab',
    background: '#1a1a1a',
    borderRadius: '3px',
    color: '#f0f0f0',
    fontSize: '13px',
    userSelect: 'none',
};

const Sidebar = ({ isPaletteOpen, onDragStart }) => (
    <div style={{
        width: isPaletteOpen ? '220px' : '0px',
        transition: 'width 0.2s',
        borderRight: isPaletteOpen ? '1px solid #333' : 'none',
        background: '#111',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
    }}>
        <div style={{ padding: '14px', minWidth: '200px' }}>
            <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                Blocks
            </div>
            {[
                { type: 'pend', label: 'Append / Prepend' },
                { type: 'capitalize', label: 'Capitalize' },
                { type: 'leetspeak', label: 'L33tspeak' },
            ].map(({ type, label }) => (
                <div
                    key={type}
                    draggable
                    onDragStart={e => onDragStart(e, type)}
                    style={blockStyle}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#888'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#444'}
                >
                    {label}
                </div>
            ))}
        </div>
    </div>
);

export default Sidebar;