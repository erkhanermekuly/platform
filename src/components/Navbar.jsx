import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasCourseAccess, coursesSectionPath } from '../auth/roles';
import '../styles/navbar.css';

export default function Navbar() {
  const { user, isAuthenticated, logout, userRole } = useAuth();
  const canCourses = hasCourseAccess(userRole);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const coursesPath = canCourses ? coursesSectionPath(userRole) : '/courses';

  if (location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link
          to={isAuthenticated ? (canCourses ? coursesSectionPath(userRole) : '/pending') : '/login'}
          className="navbar-logo"
        >
          <span className="logo-icon">📚</span>
          <span className="logo-text">LearnHub</span>
        </Link>

        {/* Menu Button for Mobile */}
        <button
          className={`menu-toggle ${isMenuOpen ? 'active' : ''}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Navigation Links */}
        <div className={`navbar-menu ${isMenuOpen ? 'active' : ''}`}>
          {canCourses && (
            <>
              <Link
                to="/home"
                className={`nav-link ${isActive('/home') ? 'active' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Главная
              </Link>
              <Link
                to={coursesPath}
                className={`nav-link ${location.pathname === coursesPath ? 'active' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Курсы
              </Link>
              <Link
                to="/my-learning"
                className={`nav-link ${isActive('/my-learning') ? 'active' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Мое обучение
              </Link>
            </>
          )}
          {isAuthenticated && !canCourses && (
            <Link
              to="/pending"
              className={`nav-link ${isActive('/pending') ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Статус доступа
            </Link>
          )}
        </div>

        {/* User Section */}
        <div className="navbar-user">
          {isAuthenticated ? (
            <div className="user-menu">
              <img src={user?.avatar} alt={user?.name} className="user-avatar" />
              <span className="user-name">{user?.name}</span>
              <div className="dropdown-menu">
                <Link to={canCourses ? '/home' : '/pending'} className="dropdown-item">
                  Профиль
                </Link>
                <Link to={canCourses ? '/home' : '/pending'} className="dropdown-item">
                  Настройки
                </Link>
                <button
                  onClick={handleLogout}
                  className="dropdown-item logout"
                >
                  Выход
                </button>
              </div>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-secondary">
                Вход
              </Link>
              <Link to="/register" className="btn btn-primary">
                Регистрация
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
