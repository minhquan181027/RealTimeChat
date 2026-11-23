import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { GoogleOAuthProvider } from "@react-oauth/google";
// import "./i18n";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

document.documentElement.setAttribute("data-theme", localStorage.getItem("theme") || "light");
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
