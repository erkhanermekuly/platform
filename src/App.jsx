import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { hasCourseAccess } from './auth/roles'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import ResourceCategoryPage from './pages/ResourceCategoryPage'
import CoursesPage from './pages/CoursesPage'
import CourseDetailsPage from './pages/CourseDetailsPage'
import MyLearningPage from './pages/MyLearningPage'
import AuthPage from './pages/AuthPage'
import RegisterPage from './pages/RegisterPage'
import LogoutPage from './pages/LogoutPage'
import ApiCheckPage from './pages/ApiCheckPage'
import AdminCourseLessonsPage from './pages/AdminCourseLessonsPage'
import OlympiadsPage from './pages/OlympiadsPage'
import OlympiadTestPage from './pages/OlympiadTestPage'
import AdminOlympiadQuestionsPage from './pages/AdminOlympiadQuestionsPage'
import AdminOlympiadResultsPage from './pages/AdminOlympiadResultsPage'
import AdminToolsPage from './pages/AdminToolsPage'
import NormativeDocumentsPage from './pages/NormativeDocumentsPage'
import AdminNormativeDocumentsPage from './pages/AdminNormativeDocumentsPage'
import MethodicalMaterialsPage from './pages/MethodicalMaterialsPage'
import ConsultationsPage from './pages/ConsultationsPage'
import Profile from './pages/Profile/Profile'
import './styles/global.css'
import './App.css'

function CourseAccessRoute({ children }) {
  const { isAuthenticated, userRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!hasCourseAccess(userRole)) {
    return <Navigate to="/home" replace />;
  }
  return children;
}

function AuthenticatedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

function AdminOnlyRoute({ children }) {
  const { isAuthenticated, userRole } = useAuth();
  const loc = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  if (userRole !== 'admin') {
    return <Navigate to="/olympiads" replace />;
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
    return <Navigate to="/home" replace />;
  }
  if (userRole !== 'admin') {
    return <Navigate to="/courses" replace />;
  }
  return children;
}

function PublicAuthRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }
  return children;
}

/** Стартовая точка приложения: сначала экран входа, после входа — главная. */
function RootRedirect() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }
  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppProvider>
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
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
              <Route path="/logout" element={<LogoutPage />} />
              <Route
                path="/pending"
                element={
                  <AuthenticatedRoute>
                    <Navigate to="/courses" replace />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="/home"
                element={
                  <AuthenticatedRoute>
                    <HomePage />
                  </AuthenticatedRoute>
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
              <Route path="/resources/documents" element={<Navigate to="/normative-documents" replace />} />
              <Route path="/resources/materials" element={<Navigate to="/methodical-materials" replace />} />
              <Route
                path="/normative-documents"
                element={
                  <AuthenticatedRoute>
                    <NormativeDocumentsPage />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="/methodical-materials"
                element={
                  <AuthenticatedRoute>
                    <MethodicalMaterialsPage />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="/consultations"
                element={
                  <AuthenticatedRoute>
                    <ConsultationsPage />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="/resources/:kind"
                element={
                  <AuthenticatedRoute>
                    <ResourceCategoryPage />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="/admin/normative-documents"
                element={
                  <AdminOnlyRoute>
                    <AdminNormativeDocumentsPage />
                  </AdminOnlyRoute>
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
                path="/admin/courses/:courseId/lessons"
                element={
                  <AdminCoursesRoute>
                    <AdminCourseLessonsPage />
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
                path="/my-learning"
                element={
                  <CourseAccessRoute>
                    <MyLearningPage />
                  </CourseAccessRoute>
                }
              />
              <Route
                path="/olympiads"
                element={
                  <AuthenticatedRoute>
                    <OlympiadsPage />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="/olympiads/:id"
                element={
                  <AuthenticatedRoute>
                    <OlympiadTestPage />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <AuthenticatedRoute>
                    <Profile />
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="/admin/olympiads/:id/questions"
                element={
                  <AdminOnlyRoute>
                    <AdminOlympiadQuestionsPage />
                  </AdminOnlyRoute>
                }
              />
              <Route
                path="/admin/olympiads/:id/results"
                element={
                  <AdminOnlyRoute>
                    <AdminOlympiadResultsPage />
                  </AdminOnlyRoute>
                }
              />
              <Route
                path="/admin/tools"
                element={
                  <AdminOnlyRoute>
                    <AdminToolsPage />
                  </AdminOnlyRoute>
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
