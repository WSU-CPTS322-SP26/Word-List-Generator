import {useState} from 'react';
import logo from './assets/images/shane.jpeg';
import './App.css';
import {StartGenerator} from "../wailsjs/go/main/App";

function App() {
    const [resultText, setResultText] = useState("Click the button to start the wordlist generator"); // Initial state

    // This function now triggers your Go backend in a goroutine
    function runGenerator() {
        StartGenerator().then((result) => setResultText(result));
    }

    return (
        <div id="App">
            <img src={logo} id="logo" alt="logo"/>
            <div id="result" className="result">{resultText}</div>
            <div id="input" className="input-box">
                {/* Simplified UI for your wordlist generator */}
                <button className="btn" onClick={runGenerator}>Start Generator</button>
            </div>
        </div>
    )
}

export default App