import React from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
// Import your new Go function (adjust the path if your component folder structure is different)
import { SelectFile } from '../../wailsjs/go/main/App';

const WordlistNode = ({ id, data }) => {
    const { setNodes } = useReactFlow();

    const handleButtonClick = () => {
        // Call the Wails Go function to open the native OS file picker
        SelectFile().then((absolutePath) => {
            // If the user cancels the dialog, it returns an empty string
            if (!absolutePath) return;

            // Extract just the filename for display purposes (handles Windows \ and Mac/Linux /)
            const fileName = absolutePath.split(/[/\\]/).pop();

            // Update the React Flow node state
            setNodes((nds) => nds.map((node) => {
                if (node.id === id) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            label: fileName,
                            filePath: absolutePath, // We now have the REAL path!
                            fileSize: "Loaded" // Optional: You can add logic to get file size from Go later if you want
                        }
                    };
                }
                return node;
            }));
        });
    };

    return (
        <div style={{ padding: '15px', borderRadius: '8px', background: '#e3f2fd', border: '2px solid #1976d2', minWidth: '180px', position: 'relative', boxShadow: '0 4px 6px rgba(0,0,0.1)' }}>
            <Handle type="target" position={Position.Left} id="left" />
            <Handle type="source" position={Position.Right} id="right" />
            <Handle type="target" position={Position.Top} id="top" />
            <Handle type="source" position={Position.Bottom} id="bottom" />

            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#1976d2', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Original Wordlist
                </div>

                <div style={{ fontWeight: 'bold', color: '#333', marginTop: '4px', wordBreak: 'break-all' }}>
                    {data.label || 'No File Loaded'}
                </div>

                <button
                    className="nodrag"
                    onClick={handleButtonClick}
                    style={{ marginTop: '10px', cursor: 'pointer', width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #1976d2', background: '#fff', color: '#1976d2', fontWeight: 'bold' }}
                >
                    Load Wordlist
                </button>

                {/* We completely removed the hidden <input type="file" />! */}

                {data.fileSize && (
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                        Status: {data.fileSize}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WordlistNode;