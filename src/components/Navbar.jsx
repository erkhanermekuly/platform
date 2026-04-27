import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { coursesSectionPath } from '../auth/roles';
import urkerproLogo from '../assets/urkerpro-logo.png';
import '../styles/navbar.css';

export default function Navbar() {
  const { user, isAuthenticated, logout, userRole } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
    navigate('/login', { replace: true });
  };

  const isActive = (path) => location.pathname === path;

  const coursesPath = coursesSectionPath(userRole);

  const isAdmin = userRole === 'admin';
  const displayName = isAdmin ? 'Админ' : user?.name || '';

  if (location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link
          to={isAuthenticated ? '/home' : '/login'}
          className="navbar-logo"
          aria-label="UrkerPro — на главную"
        >
          <img
            src={urkerproLogo}
            alt=""
            className="navbar-logo-img"
            width={200}
            height={64}
            decoding="async"
          />
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
          {isAuthenticated && (
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
              <Link
                to="/olympiads"
                className={`nav-link ${location.pathname.startsWith('/olympiads') ? 'active' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Олимпиады для аттестации
              </Link>
              <Link
                to="/profile"
                className={`nav-link ${location.pathname.startsWith('/profile') ? 'active' : ''}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Профиль
              </Link>
              {isAdmin && (
                <>
                  <Link
                    to="/admin/tools"
                    className={`nav-link ${isActive('/admin/tools') ? 'active' : ''}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Админ: экспорт
                  </Link>
                </>
              )}
            </>
          )}
        </div>

        {/* User Section */}
        <div className="navbar-user">
          {isAuthenticated ? (
            <>
              <div className={`user-menu${isAdmin ? ' user-menu--admin' : ''}`}>
                <span className="user-name">{displayName}</span>
                <div className="dropdown-menu">
                  <Link to="/profile" className="dropdown-item">
                    Профиль
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="dropdown-item logout"
                  >
                    Выход
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="navbar-logout"
                onClick={handleLogout}
                title="Выйти из аккаунта"
                aria-label="Выйти из аккаунта"
              >
                <LogOut size={22} strokeWidth={2} aria-hidden />
              </button>
            </>
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
