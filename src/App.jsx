import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import CoursesPage from './pages/CoursesPage'
import CourseDetailsPage from './pages/CourseDetailsPage'
import MyLearningPage from './pages/MyLearningPage'
import AuthPage from './pages/AuthPage'
import './styles/global.css'
import './App.css'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/course/:courseId" element={<CourseDetailsPage />} />
            <Route path="/my-learning" element={<MyLearningPage />} />
            <Route path="/login" element={<AuthPage />} />
          </Routes>
        </main>
      </AuthProvider>
    </Router>
  )
}

export default App
