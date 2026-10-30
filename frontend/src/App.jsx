
import { BrowserRouter, Route, Routes } from 'react-router'
import './App.css'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import ChatAppPage from './pages/ChatAppPage'
import { Toaster } from 'sonner'
import ProtectedRoute from './components/auth/ProtectedRoute'
import ForgotPass from './pages/ForgotPass'

function App() {

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
            <Route path='/' element={<ChatAppPage />} ></Route>
          </Route>

        </Routes>

      </BrowserRouter>
    </div>
  )
}

export default App
