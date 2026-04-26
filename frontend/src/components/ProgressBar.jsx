import React, { useEffect, useState } from 'react';
import { EventsOn, EventsOff } from '../../wailsjs/runtime/runtime';

const fmt = (n) => n.toLocaleString();
const fmtBytes = (b) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(2)} MB`;
};
const fmtSec = (s) => {
    if (s < 60) return `${Math.ceil(s)}s`;
    return `${Math.floor(s / 60)}m ${Math.ceil(s % 60)}s`;
};

export default function ProgressBar() {
    const [state, setState] = useState(null);
    const [done, setDone] = useState(false);

    useEffect(() => {
        EventsOn('pipeline:started', () => {
            setState({ wordsProcessed: 0, elapsedSec: 0, bytesWritten: 0 });
            setDone(false);
        });
        EventsOn('progress:update', (data) => setState(data));
        EventsOn('pipeline:done', () => setDone(true));
        EventsOn('pipeline:error', (msg) => {
            setDone(true);
            setState(prev => prev ? { ...prev, errorMsg: msg } : { wordsProcessed: 0, elapsedSec: 0, bytesWritten: 0, errorMsg: msg });
        });
        return () => {
            EventsOff('pipeline:started');
            EventsOff('progress:update');
            EventsOff('pipeline:done');
            EventsOff('pipeline:error');
        };
    }, []);

    if (!state) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            background: '#111',
            borderTop: '1px solid #333',
            padding: '8px 20px',
            zIndex: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
        }}>
            {/* Left: status */}
            <span style={{ fontSize: '12px', color: '#aaa' }}>
                {done
                    ? <span style={{ color: '#6fcf6f' }}>✓ Done</span>
                    : <span>⏳ Processing…</span>
                }
            </span>

            {/* Center: word counter */}
            <span style={{ fontSize: '12px', color: '#f0f0f0', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(state.wordsProcessed)} words processed
            </span>

            {state.errorMsg && (
                <span style={{ color: '#e05555', fontSize: '12px' }}>✕ {state.errorMsg}</span>
            )}

            {/* Right: time + size */}
            <span style={{ fontSize: '12px', color: '#aaa', display: 'flex', gap: '20px', fontVariantNumeric: 'tabular-nums' }}>
                <span>⏱ {fmtSec(state.elapsedSec)}</span>
                <span>💾 {fmtBytes(state.bytesWritten)}</span>
            </span>

            {done && (
                <button
                    onClick={() => setState(null)}
                    style={{
                        background: 'none', border: 'none',
                        color: '#666', fontSize: '13px',
                        cursor: 'pointer', padding: '0 4px',
                    }}
                    title="Dismiss"
                >✕</button>
            )}
        </div>
    );
}