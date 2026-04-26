import React, { useState, useEffect, useRef } from 'react';

const OmegaLogo = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
        <text
            x="12" y="18"
            textAnchor="middle"
            fontSize="20"
            fontWeight="bold"
            fill="#f0f0f0"
            fontFamily="serif"
        >Ω</text>
    </svg>
);

const menuStyle = { position: 'relative', display: 'inline-block' };

const dropdownStyle = {
    position: 'absolute',
    top: '100%',
    left: 0,
    background: '#1a1a1a',
    border: '1px solid #444',
    minWidth: '240px',
    zIndex: 1000,
    boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
    borderRadius: '3px',
};

const itemBase = {
    padding: '7px 16px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#f0f0f0',
    whiteSpace: 'nowrap',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '32px',
    userSelect: 'none',
};

const dividerStyle = { borderTop: '1px solid #2a2a2a', margin: '3px 0' };

const MenuDropdown = ({ label, items }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} style={menuStyle}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    background: open ? '#222' : 'transparent',
                    border: 'none',
                    color: '#f0f0f0',
                    padding: '5px 13px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    borderRadius: '3px',
                    lineHeight: 1,
                }}
            >
                {label}
            </button>
            {open && (
                <div style={dropdownStyle}>
                    {items.map((item, i) =>
                        item === 'divider'
                            ? <div key={i} style={dividerStyle} />
                            : (
                                <div
                                    key={i}
                                    style={itemBase}
                                    onClick={() => { setOpen(false); item.action(); }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#2a2a2a'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <span>{item.label}</span>
                                    {item.shortcut && (
                                        <span style={{ color: '#666', fontSize: '11px' }}>{item.shortcut}</span>
                                    )}
                                </div>
                            )
                    )}
                </div>
            )}
        </div>
    );
};

const MenuBar = ({
    onNewCanvas,
    onNewCanvasWithWordlist,
    onSaveCanvas,
    onSaveCanvasAs,
    onLoadCanvas,
    onToggleFullscreen,
    onToggleSidebar,
    onUndo,
    onRedo,
    onShowPipelineJSON,
    onQuit,
}) => (
    <div style={{
        height: '36px',
        background: '#0d0d0d',
        borderBottom: '1px solid #2a2a2a',
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        gap: '4px',
        flexShrink: 0,
        WebkitAppRegion: 'drag',
    }}>
        <div style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            marginRight: '10px', WebkitAppRegion: 'no-drag',
        }}>
            <OmegaLogo />
            <span style={{ color: '#f0f0f0', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px' }}>
                Mutalist
            </span>
        </div>

        <div style={{ WebkitAppRegion: 'no-drag', display: 'flex', gap: '1px' }}>
            <MenuDropdown label="File" items={[
                { label: 'New Canvas',               shortcut: 'Ctrl+N',       action: onNewCanvas },
                { label: 'New Canvas with Wordlist…',                           action: onNewCanvasWithWordlist },
                'divider',
                { label: 'Save Canvas',              shortcut: 'Ctrl+S',       action: onSaveCanvas },
                { label: 'Save Canvas As…',          shortcut: 'Ctrl+Shift+S', action: onSaveCanvasAs },
                { label: 'Open Canvas…',             shortcut: 'Ctrl+O',       action: onLoadCanvas },
                'divider',
                { label: 'Quit',                     shortcut: 'Alt+F4',       action: onQuit },
            ]} />
            <MenuDropdown label="Edit" items={[
                { label: 'Undo', shortcut: 'Ctrl+Z',       action: onUndo },
                { label: 'Redo', shortcut: 'Ctrl+Shift+Z', action: onRedo },
            ]} />
            <MenuDropdown label="View" items={[
                { label: 'Toggle Sidebar',     shortcut: 'Ctrl+B', action: onToggleSidebar },
                { label: 'Toggle Fullscreen',  shortcut: 'F11',    action: onToggleFullscreen },
                { label: 'Show Pipeline JSON',                     action: onShowPipelineJSON },
            ]} />
        </div>
    </div>
);

export default MenuBar;