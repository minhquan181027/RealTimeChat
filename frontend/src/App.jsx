
import { BrowserRouter, Route, Routes } from 'react-router'
import './App.css'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import ChatAppPage from './pages/ChatAppPage'
import { Toaster } from 'sonner'
import ProtectedRoute from './components/auth/ProtectedRoute'
import ForgotPass from './pages/ForgotPass'
import SetupProfilePage from './pages/SetupProfilePage'
import { useAuthStore } from './stores/useAuthStore'
import { useSocketStore } from './stores/useSocketStore'
import { useEffect } from 'react'

function App() {
  const { accessToken, user } = useAuthStore();
  const { connectSocket, disconnectSocket } = useSocketStore();
  const userReady = Boolean(user && !user.needsSetup);

  useEffect(() => {
    if (accessToken && userReady) {
      connectSocket();
    } else {
      disconnectSocket();
    }
    return () => disconnectSocket();
  }, [accessToken, userReady, connectSocket, disconnectSocket]);
  return (
    <div>
      <Toaster richColors />
      <BrowserRouter>
        <Routes>
          {/* public routes */}
          <Route path='/signin' element={<SignInPage />}></Route>
          <Route path='/signup' element={<SignUpPage />}></Route>
          <Route path='/forgot-password' element={<ForgotPass />}></Route>

          {/* protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path='/setup' element={<SetupProfilePage />} />
            <Route path='/' element={<ChatAppPage />} ></Route>
          </Route>

        </Routes>

      </BrowserRouter>
    </div>
  )
}

export default App
