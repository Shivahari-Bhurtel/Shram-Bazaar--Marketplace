import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import AppErrorBoundary from "./components/AppErrorBoundary"
import { AppProvider } from "./store/AppContext"
import { LanguageProvider } from "./i18n/LanguageContext"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LanguageProvider>
      <AppProvider>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </AppProvider>
    </LanguageProvider>
  </React.StrictMode>,
)
