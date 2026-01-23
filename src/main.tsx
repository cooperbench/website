import React from 'react'
import ReactDOM from 'react-dom/client'
import { CoopChart } from './CoopChart'
import './index.css'

const rootElement = document.getElementById('chart-root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <CoopChart />
    </React.StrictMode>,
  )
}
