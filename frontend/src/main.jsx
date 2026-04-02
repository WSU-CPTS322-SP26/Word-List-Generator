import React from 'react'
import {createRoot} from 'react-dom/client'
import App from './App' // This pulls in YOUR new App.jsx

const container = document.getElementById('root')
const root = createRoot(container)
root.render(<App />)