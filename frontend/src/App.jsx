
import { BrowserRouter, Route, Routes } from 'react-router'
import './App.css'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import ChatAppPage from './pages/ChatAppPage'
import { Toaster } from 'sonner'

function App() {

  return (
    <div>
      <Toaster richColors />
      <BrowserRouter>
        <Routes>
          {/* public routes */}
          <Route path='/signin' element={<SignInPage />}></Route>
          <Route path='/signup' element={<SignUpPage />}></Route>

          {/* protected routes */}
          <Route path='/' element={<ChatAppPage />} ></Route>

        </Routes>

      </BrowserRouter>
    </div>
  )
}

export default App
