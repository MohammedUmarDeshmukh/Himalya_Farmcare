import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const primaryLinks = [
  ['/', 'Home'],
  ['/products', 'Products'],
  ['/recommendation', 'Smart Recommendation'],
];

export default function Navbar({ children }) {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount, setIsCartOpen } = useCart();

  const closeMenu = () => setOpen(false);

  const handleLogout = () => {
    logout();
    closeMenu();
  };

  return (
    <header className="topbar">
      <div className="nav-wrap">
        <Logo />
        <button
          type="button"
          className="nav-toggle"
          aria-label="Toggle navigation menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`nav-links${open ? ' open' : ''}`} aria-label="Primary navigation">
          {primaryLinks.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={closeMenu}>
              {label}
            </NavLink>
          ))}
          <Link to="/#about" onClick={closeMenu}>
            About
          </Link>
          <Link to="/#contact" onClick={closeMenu}>
            Contact
          </Link>

          {itemCount > 0 && (
            <button
              type="button"
              className="nav-cart-pill"
              onClick={() => {
                setIsCartOpen(true);
                closeMenu();
              }}
              aria-label={`Cart with ${itemCount} items`}
            >
              🛒 Cart <span className="nav-cart-badge">{itemCount}</span>
            </button>
          )}

          {isAuthenticated ? (
            <div className="nav-user-container">
              <NavLink to="/my-orders" className="nav-orders-link" onClick={closeMenu}>
                My Orders 📦
              </NavLink>
              <NavLink to="/profile" className="nav-profile-link" onClick={closeMenu}>
                Profile 👤
              </NavLink>
              {user?.role === 'admin' && (
                <Link className="nav-admin-pill" to="/admin" onClick={closeMenu}>
                  Admin Panel ⚙️
                </Link>
              )}
              <div className="nav-user-info">
                <span>{user?.name}</span>
                <span className={`role-badge ${user?.role || 'farmer'}`}>
                  {user?.role || 'farmer'}
                </span>
              </div>
              <button
                type="button"
                className="nav-logout-btn"
                onClick={handleLogout}
                aria-label="Logout"
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link className="nav-login" to="/login" onClick={closeMenu}>
                Login
              </Link>
              <Link className="nav-register" to="/register" onClick={closeMenu}>
                Register
              </Link>
            </>
          )}
        </nav>
      </div>

      {children && (
        <div className="workspace-nav-content">
          <div className="wrap">{children}</div>
        </div>
      )}
    </header>
  );
}
