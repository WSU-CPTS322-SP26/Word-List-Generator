import React from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { SelectFile } from '../../wailsjs/go/main/App';

const WordlistNode = ({ id, data }) => {
    const { setNodes } = useReactFlow();

    const handleButtonClick = () => {
        SelectFile().then((absolutePath) => {
            if (!absolutePath) return;
            const fileName = absolutePath.split(/[/\\]/).pop();
            setNodes(nds => nds.map(node =>
                node.id === id
                    ? { ...node, data: { ...node.data, label: fileName, filePath: absolutePath, fileSize: 'Loaded' } }
                    : node
            ));
        });
    };

    return (
        <div style={{
            border: '3px solid #555',
            background: 'repeating-conic-gradient(#3a3a3a 0% 25%, #111 0% 50%)',
            backgroundSize: '8px 8px',
            padding: '3px',
            borderRadius: '9px',
            position: 'relative',
        }}>
            {/* Handles sit on the outer element */}
            <Handle type="target" position={Position.Left}   id="left"   style={{ background: '#555', left: '-8px' }} />
            <Handle type="source" position={Position.Right}  id="right"  style={{ background: '#555', right: '-8px' }} />
            <Handle type="target" position={Position.Top}    id="top"    style={{ background: '#555', top: '-8px' }} />
            <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: '#555', bottom: '-8px' }} />

            {/* Inner content box: solid fill so the checkerboard only shows as the border */}
            <div style={{
                background: '#1a1a1a',
                borderRadius: '6px',
                padding: '15px',
                minWidth: '180px',
                color: '#f0f0f0',
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        fontSize: '10px',
                        color: '#aaa',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                    }}>
                        Original Wordlist
                    </div>
                    <div style={{
                        fontWeight: 'bold',
                        color: '#f0f0f0',
                        marginTop: '4px',
                        wordBreak: 'break-all',
                        fontSize: '13px',
                    }}>
                        {data.label || 'No File Loaded'}
                    </div>
                    <button
                        className="nodrag"
                        onClick={handleButtonClick}
                        style={{
                            marginTop: '10px',
                            cursor: 'pointer',
                            width: '100%',
                            padding: '5px',
                            borderRadius: '3px',
                            border: '1px solid #f0f0f0',
                            background: 'transparent',
                            color: '#f0f0f0',
                            fontWeight: 'bold',
                            fontSize: '12px',
                        }}
                    >
                        Load Wordlist
                    </button>
                    {data.fileSize && (
                        <div style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>
                            ● {data.fileSize}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WordlistNode;