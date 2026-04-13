import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { hasCourseAccess, coursesSectionPath } from './auth/roles'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import CoursesPage from './pages/CoursesPage'
import CourseDetailsPage from './pages/CourseDetailsPage'
import MyLearningPage from './pages/MyLearningPage'
import AuthPage from './pages/AuthPage'
import RegisterPage from './pages/RegisterPage'
import PendingAccessPage from './pages/PendingAccessPage'
import ApiCheckPage from './pages/ApiCheckPage'
import AdminCourseEditPage from './pages/AdminCourseEditPage'
import LessonPlayerPage from './pages/LessonPlayerPage'
import './styles/global.css'
import './App.css'

function CourseAccessRoute({ children }) {
  const { isAuthenticated, userRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!hasCourseAccess(userRole)) {
    return <Navigate to="/pending" replace />;
  }
  return children;
}

function PendingOnlyRoute({ children }) {
  const { isAuthenticated, userRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (hasCourseAccess(userRole)) {
    return <Navigate to={coursesSectionPath(userRole)} replace />;
  }
  return children;
}

function AdminCoursesRoute({ children }) {
  const { isAuthenticated, userRole } = useAuth();
  const loc = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  if (!hasCourseAccess(userRole)) {
    return <Navigate to="/pending" replace />;
  }
  if (userRole !== 'admin') {
    return <Navigate to="/courses" replace />;
  }
  return children;
}

function PublicAuthRoute({ children }) {
  const { isAuthenticated, userRole } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={hasCourseAccess(userRole) ? coursesSectionPath(userRole) : '/pending'} replace />;
  }
  return children;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppProvider>
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route
                path="/login"
                element={
                  <PublicAuthRoute>
                    <AuthPage />
                  </PublicAuthRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicAuthRoute>
                    <RegisterPage />
                  </PublicAuthRoute>
                }
              />
              <Route
                path="/pending"
                element={
                  <PendingOnlyRoute>
                    <PendingAccessPage />
                  </PendingOnlyRoute>
                }
              />
              <Route
                path="/home"
                element={
                  <CourseAccessRoute>
                    <HomePage />
                  </CourseAccessRoute>
                }
              />
              <Route
                path="/courses"
                element={
                  <CourseAccessRoute>
                    <CoursesPage />
                  </CourseAccessRoute>
                }
              />
              <Route
                path="/admin/courses"
                element={
                  <AdminCoursesRoute>
                    <CoursesPage />
                  </AdminCoursesRoute>
                }
              />
              <Route
                path="/admin/courses/:courseId/edit"
                element={
                  <AdminCoursesRoute>
                    <AdminCourseEditPage />
                  </AdminCoursesRoute>
                }
              />
              <Route
                path="/course/:courseId"
                element={
                  <CourseAccessRoute>
                    <CourseDetailsPage />
                  </CourseAccessRoute>
                }
              />
              <Route
                path="/course/:courseId/lesson/:lessonId"
                element={
                  <CourseAccessRoute>
                    <LessonPlayerPage />
                  </CourseAccessRoute>
                }
              />
              <Route
                path="/my-learning"
                element={
                  <CourseAccessRoute>
                    <MyLearningPage />
                  </CourseAccessRoute>
                }
              />
              <Route path="/api-check" element={<ApiCheckPage />} />
            </Routes>
          </main>
        </AppProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
