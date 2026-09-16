import { useState, type CSSProperties } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { to: '/movies', label: 'Películas' },
  { to: '/likes', label: 'Mis Likes' },
  { to: '/recommendations', label: 'Recomendaciones' },
  { to: '/chat', label: 'Chat' },
];

function activeLinkStyle({ isActive }: { isActive: boolean }): CSSProperties | undefined {
  return isActive ? { fontWeight: 'bold' } : undefined;
}

export function Navbar() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <nav>
      <span>
        {NAV_LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} style={activeLinkStyle}>
            {link.label}
          </NavLink>
        ))}
      </span>

      <span>
        {user && <span>{user.username}</span>}
        <button onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? 'Cerrando sesión...' : 'Logout'}
        </button>
      </span>
    </nav>
  );
}
