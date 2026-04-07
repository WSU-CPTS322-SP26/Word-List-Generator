import React from 'react';
import { Handle, Position } from 'reactflow';

const WordlistNode = ({ data }) => {
    return (
        <div style={{ padding: '15px', 
        borderRadius: '8px', background: 
        '#e3f2fd', border: '2px solid #1976d2', 
        minWidth: '180px', 
        position: 'relative', 
        boxShadow: '0 4px 6px rgba(0,0,0.1)' }}>

            <Handle type="target" position={Position.Left} id="left" />
            <Handle type="source" position={Position.Right} id="right" />
            <Handle type="target" position={Position.Top} id="top" />
            <Handle type="source" position={Position.Bottom} id="bottom" />

            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 
                    '10px', color: '#1976d2', 
                    fontWeight: 'bold', 
                    textTransform: 'uppercase' }}>Original Wordlist</div>
                    
                <div style={{ fontWeight: 'bold', color: '#333', marginTop: '4px' }}>{data.label || 'No File Loaded'}</div>
                <button className="nodrag" onClick={() => console.log("TODO: Open a dialogue box")} style={{ marginTop: '10px', cursor: 'pointer', width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #1976d2', background: '#fff', color: '#1976d2', fontWeight: 'bold' }}>
                    Load Wordlist
                </button>
                {data.fileSize && <div style={{ fontSize: '11px', color: '#666' }}>{data.fileSize} words</div>}
            </div>
        </div>
    );
};

export default WordlistNode;