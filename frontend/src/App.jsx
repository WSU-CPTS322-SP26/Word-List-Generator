import { useState } from 'react';
import './App.css';

function App() {
    const [status, setStatus] = useState("Ready");

    return (
        <div id="App">
            {/* Left side: Ingredients List [cite: 36] */}
            <aside className="ingredients-list">
                <h3>Ingredients</h3>
                <div className="section">
                    <h4>WL Blocks</h4>
                    <div className="item">rockyou.txt</div>
                </div>
                <div className="section">
                    <h4>Pend Blocks</h4>
                    <div className="item">All Ints</div>
                    <div className="item">Hex Characters</div>
                </div>
            </aside>

            {/* Middle: Workbench [cite: 39] */}
            <main className="workbench">
                <div className="canvas">
                    <h2>Workbench</h2>
                    <p>Drag blocks here to build your pipeline</p>
                </div>

                {/* Status check window  */}
                <div className="status-bar">
                    Status: {status} | Time Left: --:--
                </div>
            </main>
        </div>
    );
}

export default App;