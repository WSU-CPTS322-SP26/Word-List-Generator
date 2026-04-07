import React from 'react';

const Sidebar = ({ isPaletteOpen, onDragStart }) => {
    return (
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
                <div onDragStart={(e) => onDragStart(e, 'pend')} draggable style={{ padding: '10px', border: '1px solid #333', marginBottom: '10px', cursor: 'grab', background: '#fff', borderRadius: '4px' }}>
                    Pend
                </div>
                <div onDragStart={(e) => onDragStart(e, 'capitalize')} draggable style={{ padding: '10px', border: '1px solid #333', cursor: 'grab', background: '#fff', borderRadius: '4px' }}>
                    Capitalize
                </div>
            </div>
        </div>
    );
};

export default Sidebar;