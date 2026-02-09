import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { ActivityProvider } from './contexts/ActivityContext.jsx'
import { MasterDataProvider } from './contexts/MasterDataContext.jsx'
import { HealthProvider } from './contexts/HealthContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <MasterDataProvider>
          <ActivityProvider>
            <HealthProvider>
              <App />
            </HealthProvider>
          </ActivityProvider>
        </MasterDataProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
