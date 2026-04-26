import React, { useState, useCallback, useEffect, useRef } from 'react';

import ReactFlow, {
    addEdge, Background, BackgroundVariant, Controls,
    applyNodeChanges, applyEdgeChanges,
    ReactFlowProvider,
} from 'reactflow';

import { StartPipeline, SelectOutputFile, SelectFile,
         SaveCanvas, SaveCanvasAs, SaveCanvasToPath,
         LoadCanvasFrom, GetLastCanvasPath, FileExists
} from '../wailsjs/go/main/App';

import { Quit } from '../wailsjs/runtime/runtime';

import MutationNode  from './components/MutationNode';
import L33tspeakNode from './components/L33tspeakNode';
import WordlistNode  from './components/WordlistNode';
import Sidebar       from './components/Sidebar';
import MenuBar       from './components/MenuBar';
import ProgressBar   from './components/ProgressBar';

import 'reactflow/dist/style.css';

const nodeTypes = {
    mutation:       MutationNode,
    leetspeak_node: L33tspeakNode,
    wordlist:       WordlistNode,
};

let nodeCounter = 10;
const getID = () => `node_${nodeCounter++}`;

const INITIAL_NODES = [{
    id: 'wordlist-1',
    type: 'wordlist',
    position: { x: 400, y: 300 },
    data: { label: 'No File Loaded', fileSize: null, filePath: null },
}];



const isValidCanvas = (parsed) => {
    if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        return false;
    }
    return parsed.nodes.every(n =>
        typeof n.id === 'string' &&
        typeof n.type === 'string' &&
        n.position &&
        typeof n.position.x === 'number' &&
        typeof n.position.y === 'number'
    );
};



// ── Append modal ─────────────────────────────────────────────────────────────
// Shown when the user picks an output path that already exists on disk,
// giving them a choice between overwriting or appending.
const AppendModal = ({ info, onOverwrite, onAppend, onCancel }) => {
    const filename = info.outputPath.split(/[/\\]/).pop();
    const btnBase = {
        padding: '6px 18px', borderRadius: '3px', cursor: 'pointer',
        fontSize: '13px', border: '1px solid #444',
    };
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <div style={{
                background: '#1a1a1a', border: '1px solid #444',
                borderRadius: '6px', padding: '28px 32px',
                minWidth: '340px', color: '#f0f0f0',
                boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '10px' }}>
                    File already exists
                </div>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '20px', wordBreak: 'break-all' }}>
                    {filename}
                </div>
                <div style={{ fontSize: '13px', color: '#ccc', marginBottom: '24px' }}>
                    Would you like to overwrite the existing file, or append the new words to the end of it?
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={onCancel}    style={{ ...btnBase, background: 'transparent', color: '#888' }}>Cancel</button>
                    <button onClick={onOverwrite} style={{ ...btnBase, background: '#2a2a2a',    color: '#f0f0f0' }}>Overwrite</button>
                    <button onClick={onAppend}    style={{ ...btnBase, background: '#f0f0f0',    color: '#111', border: 'none', fontWeight: 'bold' }}>Append</button>
                </div>
            </div>
        </div>
    );
};

const PipelineJSONModal = ({ json, onClose }) => (
    <div style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
        <div style={{
            background: '#1a1a1a', border: '1px solid #444', borderRadius: '6px',
            padding: '24px', width: '520px', maxHeight: '70vh',
            display: 'flex', flexDirection: 'column', gap: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
        }}>
            <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#f0f0f0' }}>
                Pipeline JSON
            </div>
            <pre style={{
                background: '#111', border: '1px solid #333', borderRadius: '3px',
                padding: '10px', fontSize: '11px', color: '#aaa',
                overflow: 'auto', flex: 1, margin: 0, fontFamily: 'monospace',
            }}>
                {json}
            </pre>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                    onClick={() => navigator.clipboard.writeText(json)}
                    style={{ padding: '5px 14px', background: '#2a2a2a', border: '1px solid #444', color: '#f0f0f0', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
                >
                    Copy
                </button>
                <button
                    onClick={onClose}
                    style={{ padding: '5px 14px', background: '#f0f0f0', border: 'none', color: '#111', borderRadius: '3px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                >
                    Close
                </button>
            </div>
        </div>
    </div>
);

// Max undo history
const MAX_HISTORY = 50;

// ── Main canvas component ─────────────────────────────────────────────────────
function FlowCanvas() {
    const [nodes, setNodes]                 = useState(INITIAL_NODES);
    const [edges, setEdges]                 = useState([]);
    const [rfInstance, setRfInstance]       = useState(null);
    const [isPaletteOpen, setIsPaletteOpen] = useState(true);
    const [currentCanvasPath, setCurrentCanvasPath] = useState(null);
    const [appendModal, setAppendModal]     = useState(null);
    const [pipelineJSONModal, setPipelineJSONModal] = useState(null); 
    const persistTimer = useRef(null);

    // ── Stable node callbacks ─────────────────────────────────────────────────

    const onNodeDataChange = useCallback((nodeId, newValue) => {
        setNodes(nds => nds.map(n =>
            n.id === nodeId ? { ...n, data: { ...n.data, value: newValue } } : n
        ));
    }, []);

    const onPresetChange = useCallback((nodeId, preset) => {
        setNodes(nds => nds.map(n =>
            n.id === nodeId ? { ...n, data: { ...n.data, preset } } : n
        ));
    }, []);

    const onPatch = useCallback((nodeId, patch) => {
        setNodes(nds => nds.map(n =>
            n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n
        ));
    }, []);

    const stripCallbacks = (nds) => nds.map(n => ({
        ...n,
        data: { ...n.data, onChange: undefined, onPresetChange: undefined, onDelete: undefined, onPatch: undefined },
    }));

    const persistCanvas = useCallback((currentNodes, currentEdges) => {
        if (persistTimer.current) clearTimeout(persistTimer.current);
        persistTimer.current = setTimeout(() => {
            const stripped = stripCallbacks(currentNodes);
            SaveCanvas(JSON.stringify({ nodes: stripped, edges: currentEdges })).catch(console.error);
        }, 1500);
    }, []);

        // ── History (undo/redo) ───────────────────────────────────────────────────────
    const history = useRef([]);      // array of { nodes, edges } snapshots
    const historyIdx = useRef(-1);   // pointer into history array
    const skipSnapshot = useRef(false); // prevents undo/redo from pushing to history

    const pushSnapshot = useCallback((currentNodes, currentEdges) => {
        if (skipSnapshot.current) return;
        // Truncate any forward history when a new action is taken
        history.current = history.current.slice(0, historyIdx.current + 1);
        history.current.push({
            nodes: stripCallbacks(currentNodes),
            edges: currentEdges,
        });
        if (history.current.length > MAX_HISTORY) {
            history.current.shift();
        } else {
            historyIdx.current++;
        }
    }, []);

    const onDelete = useCallback((nodeId) => {
        setNodes(nds => {
            const next = nds.filter(n => n.id !== nodeId || n.type === 'wordlist');
            pushSnapshot(next, edges);
            return next;
        });
        setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    }, [edges, pushSnapshot]);

    const attachCallbacks = useCallback((node) => {
        if (node.type === 'leetspeak_node') return { ...node, data: { ...node.data, onPatch, onDelete } };
        if (node.type === 'mutation')       return { ...node, data: { ...node.data, onChange: onNodeDataChange, onPresetChange, onDelete } };
        return node;
    }, [onNodeDataChange, onPresetChange, onPatch, onDelete]);

    const handleUndo = useCallback(() => {
        if (historyIdx.current <= 0) return;
        historyIdx.current--;
        const snapshot = history.current[historyIdx.current];
        skipSnapshot.current = true;
        setNodes(snapshot.nodes.map(n => attachCallbacks(n)));
        setEdges(snapshot.edges);
        skipSnapshot.current = false;
    }, [attachCallbacks]);

    const handleRedo = useCallback(() => {
        if (historyIdx.current >= history.current.length - 1) return;
        historyIdx.current++;
        const snapshot = history.current[historyIdx.current];
        skipSnapshot.current = true;
        setNodes(snapshot.nodes.map(n => attachCallbacks(n)));
        setEdges(snapshot.edges);
        skipSnapshot.current = false;
    }, [attachCallbacks]);

    // ── ReactFlow event handlers ──────────────────────────────────────────────

    const onNodesChange = useCallback((changes) => {
        const filtered = changes.filter(c =>
            !(c.type === 'remove' && nodes.find(n => n.id === c.id)?.type === 'wordlist')
        );
        setNodes(nds => {
            const next = applyNodeChanges(filtered, nds);
            persistCanvas(next, edges);
            return next;
        });
    }, [nodes, edges, persistCanvas]);

    const onEdgesChange = useCallback((changes) => {
        setEdges(eds => {
            const next = applyEdgeChanges(changes, eds);
            persistCanvas(nodes, next);
            return next;
        });
    }, [nodes, persistCanvas]);

    const onConnect = useCallback((params) => {
        const edgeWithStyle = {
            ...params,
            style: { stroke: '#555' },
        };
        setEdges(eds => {
            const next = addEdge(edgeWithStyle, eds);
            pushSnapshot(nodes, next);
            persistCanvas(nodes, next);
            return next;
        });
    }, [nodes, persistCanvas, pushSnapshot]);

    const onDragOver = useCallback((e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback((e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('application/reactflow');
        if (!type || !rfInstance) return;
        const position = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });

        let newNode;
        if (type === 'leetspeak') {
            newNode = {
                id: getID(), type: 'leetspeak_node', position,
                data: { leetMode: 'preset', value: '1', onPatch, onDelete },
            };
        } else {
            const defaults = {
                pend:       { value: 'digits',    preset: 'digits' },
                capitalize: { value: 'uppercase', preset: '' },
            };
            newNode = {
                id: getID(), type: 'mutation', position,
                data: {
                    type,
                    label: type.charAt(0).toUpperCase() + type.slice(1),
                    ...(defaults[type] || {}),
                    onChange: onNodeDataChange,
                    onPresetChange,
                    onDelete,
                },
            };
        }

        setNodes(nds => {
        const next = [...nds, newNode];
        pushSnapshot(next, edges);   // snapshot after drop
        persistCanvas(next, edges);
        return next;
        });
    }, [rfInstance, onNodeDataChange, onPresetChange, onPatch, onDelete, edges, persistCanvas, pushSnapshot]);

    const onDragStart = (e, nodeType) => {
        e.dataTransfer.setData('application/reactflow', nodeType);
        e.dataTransfer.effectAllowed = 'move';
    };

    // ── Canvas management ─────────────────────────────────────────────────────

    const resetCanvas = useCallback((wordlistData = {}) => {
        nodeCounter = 10;
        setEdges([]);
        setCurrentCanvasPath(null); // new canvas has no associated file
        setNodes([{
            id: 'wordlist-1',
            type: 'wordlist',
            position: { x: 400, y: 300 },
            data: {
                label:    wordlistData.label    || 'No File Loaded',
                filePath: wordlistData.filePath || null,
                fileSize: wordlistData.fileSize || null,
            },
        }]);
    }, []);

    const handleNewCanvas = useCallback(() => resetCanvas(), [resetCanvas]);

    const handleNewCanvasWithWordlist = useCallback(() => {
        SelectFile().then(path => {
            if (!path) return;
            const label = path.split(/[/\\]/).pop();
            resetCanvas({ label, filePath: path, fileSize: 'Loaded' });
        });
    }, [resetCanvas]);

    // ── Save / Save As ────────────────────────────────────────────────────────

    // handleSaveCanvasAs: always opens the dialog, updates currentCanvasPath on success.
    const handleSaveCanvasAs = useCallback(() => {
        const json = JSON.stringify({ nodes: stripCallbacks(nodes), edges }, null, 2);
        SaveCanvasAs(json).then(path => {
            if (path) setCurrentCanvasPath(path);
        });
    }, [nodes, edges]);

    // handleSaveCanvas: quick-save if we already know the file, else delegate to Save As.
    const handleSaveCanvas = useCallback(() => {
        if (currentCanvasPath) {
            const json = JSON.stringify({ nodes: stripCallbacks(nodes), edges }, null, 2);
            SaveCanvasToPath(currentCanvasPath, json).catch(err =>
                alert(`Save failed: ${err}`)
            );
        } else {
            handleSaveCanvasAs();
        }
    }, [currentCanvasPath, nodes, edges, handleSaveCanvasAs]);

    // handleLoadCanvas: opens dialog, stores the path for subsequent quick-saves.
    const handleLoadCanvas = useCallback(() => {
    LoadCanvasFrom().then(async json => {
        if (!json) return;
        const path = await GetLastCanvasPath();
        let parsed;
        try {
            parsed = JSON.parse(json);
        } catch {
            alert('Failed to load canvas — file is not valid JSON.');
            return;
        }
        if (!isValidCanvas(parsed)) {
            alert('Failed to load canvas — file structure is invalid or corrupt.');
            return;
        }
        setNodes(parsed.nodes.map(n => attachCallbacks(n)));
        setEdges(parsed.edges);
        if (path) setCurrentCanvasPath(path);
    });
}, [attachCallbacks]);

    // ── Connection validation ─────────────────────────────────────────────────

    const isValidConnection = useCallback((connection) => {
        const handleAlreadyUsed = edges.some(e =>
            ((e.target === connection.target && e.targetHandle === connection.targetHandle) ||
             (e.source === connection.source && e.sourceHandle === connection.sourceHandle)) &&
            nodes.some(n => n.id === e.source) && nodes.some(n => n.id === e.target)
        );
        if (handleAlreadyUsed) return false;
        const src = nodes.find(n => n.id === connection.source);
        const tgt = nodes.find(n => n.id === connection.target);
        const isH = ['left','right'].includes(connection.sourceHandle) && ['left','right'].includes(connection.targetHandle);
        const isV = ['top','bottom'].includes(connection.sourceHandle) && ['top','bottom'].includes(connection.targetHandle);
        const isCapOrLeet = n => n?.data?.type === 'capitalize' || n?.type === 'leetspeak_node';
        if (isCapOrLeet(src) || isCapOrLeet(tgt)) {
            const other = isCapOrLeet(src) ? tgt : src;
            return (other?.type === 'wordlist' || isCapOrLeet(other)) && isV;
        }
        if ((src?.type === 'wordlist' || tgt?.type === 'wordlist') && isV) return false;
        return isH || isV;
    }, [edges, nodes]);

    // ── Pipeline serialisation ────────────────────────────────────────────────

    const toMutSpec = (node, type) => {
        if (node.type === 'leetspeak_node') {
            if (node.data.leetMode === 'advanced')
                return { type: 'leetspeak', params: { level: 'custom', pairs: node.data.advancedText || '' } };
            return { type: 'leetspeak', params: { level: node.data.value || '1' } };
        }
        if (node.data.type === 'pend')
            return { type, params: { charset: node.data.value || 'digits' } };
        if (node.data.type === 'capitalize') {
            const val = node.data.value || 'uppercase';
            if (val === 'title_case') return { type: 'title_case', params: {} };
            return { type: val, params: { language: 'english' } };
        }
        return { type: node.data.type, params: {} };
    };

    const getOrGroup = (startId, visited) => {
        const group = [];
        const queue = [startId];
        while (queue.length) {
            const id = queue.shift();
            if (visited.has(id)) continue;
            visited.add(id);
            const node = nodes.find(n => n.id === id);
            if (!node) continue;
            group.push(node);
            edges
                .filter(e =>
                    ((e.source === id && ['top','bottom'].includes(e.sourceHandle)) ||
                     (e.target === id && ['top','bottom'].includes(e.targetHandle))) &&
                    nodes.some(n => n.id === (e.source === id ? e.target : e.source))
                )
                .forEach(e => {
                    const nid = e.source === id ? e.target : e.source;
                    if (!visited.has(nid)) queue.push(nid);
                });
        }
        return group;
    };

    const traverseChain = (startEdge, direction, visited, wordlistNode) => {
        const stages = [];
        let currentId = startEdge.source === wordlistNode.id ? startEdge.target : startEdge.source;
        while (currentId && !visited.has(currentId)) {
            const orGroup = getOrGroup(currentId, visited);
            if (!orGroup.length) break;
            stages.push(orGroup.map(n => toMutSpec(n, direction)));
            let nextId = null;
            for (const node of orGroup) {
                const handle = direction === 'prepend' ? 'left' : 'right';
                const nextEdge = edges.find(e =>
                    ((e.source === node.id && e.sourceHandle === handle) ||
                     (e.target === node.id && e.targetHandle === handle)) &&
                    !visited.has(e.source === node.id ? e.target : e.source)
                );
                if (nextEdge) { nextId = nextEdge.source === node.id ? nextEdge.target : nextEdge.source; break; }
            }
            currentId = nextId;
        }
        return stages;
    };

    // buildManifest assembles the pipeline spec from the current canvas state.
    const buildManifest = useCallback(() => {
        const wordlistNode = nodes.find(n => n.type === 'wordlist');
        if (!wordlistNode) return null;

        const manifest = [];
        const visited = new Set([wordlistNode.id]);

        const capEdge = edges.find(e =>
            (e.source === wordlistNode.id && ['top','bottom'].includes(e.sourceHandle)) ||
            (e.target === wordlistNode.id && ['top','bottom'].includes(e.targetHandle))
        );
        if (capEdge) {
            const capId = capEdge.source === wordlistNode.id ? capEdge.target : capEdge.source;
            const grp = getOrGroup(capId, visited);
            if (grp.length) manifest.push(grp.map(n => toMutSpec(n, null)));
        }

        const leftEdge = edges.find(e =>
            (e.source === wordlistNode.id && e.sourceHandle === 'left') ||
            (e.target === wordlistNode.id && e.targetHandle === 'left')
        );
        if (leftEdge) manifest.push(...traverseChain(leftEdge, 'prepend', visited, wordlistNode));

        const rightEdge = edges.find(e =>
            (e.source === wordlistNode.id && e.sourceHandle === 'right') ||
            (e.target === wordlistNode.id && e.targetHandle === 'right')
        );
        if (rightEdge) manifest.push(...traverseChain(rightEdge, 'append', visited, wordlistNode));

        return { manifest, wordlistNode };
    }, [nodes, edges]);

    // executePipeline is called with a resolved appendMode after the modal decision.
    const executePipeline = useCallback((outputPath, manifest, wordlistPath, appendMode) => {
        StartPipeline(wordlistPath, outputPath, appendMode, manifest).catch(console.error);
    }, []);

    const validateManifest = (manifest, nodes) => {
        const errors = [];

        // Check for pend nodes with empty custom charset
        nodes.forEach(node => {
            if (node.type === 'mutation' && node.data.type === 'pend') {
                if (node.data.preset === '__custom__' && !node.data.value?.trim()) {
                    errors.push('A Pend block has Custom selected but no charset entered.');
                }
            }
        });

        // Check for empty manifest (no blocks connected)
        if (manifest.length === 0) {
            errors.push('No mutation blocks are connected to the wordlist.');
        }

        // Check for leetspeak advanced mode with empty pairs
        nodes.forEach(node => {
            if (node.type === 'leetspeak_node' && node.data.leetMode === 'advanced') {
                if (!node.data.advancedText?.trim()) {
                    errors.push('A L33tspeak block is in Advanced mode but has no substitutions entered.');
                }
            }
        });

        return errors;
    };

    const handleRun = useCallback(async () => {
        const wordlistNode = nodes.find(n => n.type === 'wordlist');
        if (!wordlistNode?.data.filePath) {
            alert('Please load a wordlist first.');
            return;
        }

        const result = buildManifest();
        if (!result) return;
        const { manifest } = result;

        // Validate before asking where to save
        const errors = validateManifest(manifest, nodes);
        if (errors.length > 0) {
            alert('Pipeline has issues:\n\n' + errors.map(e => `• ${e}`).join('\n'));
            return;
        }

        const outputPath = await SelectOutputFile();
        if (!outputPath) return;

        const exists = await FileExists(outputPath);
        if (exists) {
            setAppendModal({ outputPath, manifest, wordlistPath: wordlistNode.data.filePath });
        } else {
            executePipeline(outputPath, manifest, wordlistNode.data.filePath, false);
        }
    }, [nodes, edges, buildManifest, executePipeline]);

    // ── Misc handlers ─────────────────────────────────────────────────────────

    const handleToggleSidebar   = useCallback(() => setIsPaletteOpen(o => !o), []);
    const handleToggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
    }, []);

    const handleShowPipelineJSON = useCallback(() => {
        const result = buildManifest();
        if (!result) { alert('No pipeline connected.'); return; }
        setPipelineJSONModal(JSON.stringify(result.manifest, null, 2));
    }, [buildManifest]);

    // ── Keyboard shortcuts ────────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            const ctrl = e.ctrlKey || e.metaKey;
            if (ctrl && e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); handleSaveCanvasAs(); return; }
            if (ctrl && e.key.toLowerCase() === 'n') { e.preventDefault(); handleNewCanvas(); }
            if (ctrl && e.key.toLowerCase() === 's') { e.preventDefault(); handleSaveCanvas(); }
            if (ctrl && e.key.toLowerCase() === 'o') { e.preventDefault(); handleLoadCanvas(); }
            if (ctrl && e.key.toLowerCase() === 'b') { e.preventDefault(); handleToggleSidebar(); }
            if (e.key === 'F11')                     { e.preventDefault(); handleToggleFullscreen(); }
            if (ctrl && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
            if (ctrl && e.key.toLowerCase() === 'z' &&  e.shiftKey) { e.preventDefault(); handleRedo(); }
            if (ctrl && e.key.toLowerCase() === 'y')                { e.preventDefault(); handleRedo(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleNewCanvas, handleSaveCanvas, handleSaveCanvasAs, handleLoadCanvas, handleToggleSidebar, handleToggleFullscreen, handleUndo, handleRedo]);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: '#0d0d0d' }}>
            <MenuBar
            onNewCanvas={handleNewCanvas}
            onNewCanvasWithWordlist={handleNewCanvasWithWordlist}
            onSaveCanvas={handleSaveCanvas}
            onSaveCanvasAs={handleSaveCanvasAs}
            onLoadCanvas={handleLoadCanvas}
            onToggleFullscreen={handleToggleFullscreen}
            onToggleSidebar={handleToggleSidebar}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onShowPipelineJSON={handleShowPipelineJSON}
            onQuit={Quit}
        />

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <Sidebar isPaletteOpen={isPaletteOpen} onDragStart={onDragStart} />

                <div style={{ flexGrow: 1, position: 'relative' }}>
                    {/* Floating toolbar */}
                    <div style={{ position: 'absolute', zIndex: 10, top: 10, left: 10, display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleToggleSidebar}
                            style={{
                                background: '#111', border: '1px solid #333', color: '#aaa',
                                padding: '5px 12px', cursor: 'pointer', borderRadius: '3px', fontSize: '12px',
                            }}
                        >
                            {isPaletteOpen ? '← Hide' : '→ Blocks'}
                        </button>
                        <button
                            onClick={handleRun}
                            style={{
                                background: '#f0f0f0', border: 'none', color: '#111',
                                padding: '5px 18px', cursor: 'pointer',
                                borderRadius: '3px', fontWeight: 'bold', fontSize: '12px',
                            }}
                        >
                            ▶ Run
                        </button>
                        {/* Show current save path as a subtle indicator */}
                        {currentCanvasPath && (
                            <span style={{ fontSize: '11px', color: '#555', alignSelf: 'center', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {currentCanvasPath.split(/[/\\]/).pop()}
                            </span>
                        )}
                    </div>

                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        nodeTypes={nodeTypes}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onInit={setRfInstance}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        isValidConnection={isValidConnection}
                        style={{ background: '#0d0d0d' }}
                    >
                        {/* Lines variant gives a proper grid rather than scattered dots */}
                        <Background
                            variant={BackgroundVariant.Lines}
                            color="#1e1e1e"
                            gap={24}
                            lineWidth={1}
                        />
                        <Controls />
                    </ReactFlow>
                </div>
            </div>

            <ProgressBar />

            {/* Append/overwrite decision modal */}
            {appendModal && (
                <AppendModal
                    info={appendModal}
                    onOverwrite={() => {
                        executePipeline(appendModal.outputPath, appendModal.manifest, appendModal.wordlistPath, false);
                        setAppendModal(null);
                    }}
                    onAppend={() => {
                        executePipeline(appendModal.outputPath, appendModal.manifest, appendModal.wordlistPath, true);
                        setAppendModal(null);
                    }}
                    onCancel={() => setAppendModal(null)}
                />
            )}

            {pipelineJSONModal && (
                <PipelineJSONModal
                    json={pipelineJSONModal}
                    onClose={() => setPipelineJSONModal(null)}
                />
            )}
        </div>
    );
}

export default function App() {
    return (
        <ReactFlowProvider>
            <FlowCanvas />
        </ReactFlowProvider>
    );
}