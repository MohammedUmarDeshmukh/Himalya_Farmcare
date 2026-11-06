import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';

const adminNavItems = [
  { to: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/orders', label: 'Orders', icon: '🛒' },
  { to: '/admin/products', label: 'Products', icon: '📦' },
  { to: '/admin/crops', label: 'Crops', icon: '🌾' },
  { to: '/admin/problems', label: 'Problems', icon: '🐛' },
  { to: '/admin/application-methods', label: 'App Methods', icon: '💧' },
  { to: '/admin/users', label: 'Farmers / Users', icon: '👨‍🌾' },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="admin-root">
      {/* Sidebar Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <Logo />
          <span className="admin-tag">ADMIN CONSOLE</span>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Admin Navigation">
          {adminNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `admin-nav-item ${isActive ? 'active' : ''}`
              }
              onClick={closeSidebar}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              <span className="admin-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <Link to="/" className="admin-nav-item store-link" onClick={closeSidebar}>
            <span className="admin-nav-icon">🏡</span>
            <span className="admin-nav-label">Return to Store</span>
          </Link>
          <button
            type="button"
            className="admin-nav-item logout-btn"
            onClick={handleLogout}
          >
            <span className="admin-nav-icon">🚪</span>
            <span className="admin-nav-label">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Content Wrapper */}
      <div className="admin-main-wrap">
        {/* Top Navbar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="admin-menu-toggle"
              aria-label="Toggle navigation menu"
              onClick={() => setSidebarOpen((prev) => !prev)}
            >
              <span />
              <span />
              <span />
            </button>
            <h2 className="admin-topbar-title">Himalaya FarmCare Administration</h2>
          </div>

          <div className="admin-topbar-right">
            <Link to="/" className="admin-store-btn">
              <span>🌾</span> Storefront
            </Link>
            <div className="admin-user-pill">
              <span className="admin-user-name">{user?.name || 'Administrator'}</span>
              <span className="role-badge admin">ADMIN</span>
            </div>
            <button
              type="button"
              className="admin-logout-header-btn"
              onClick={handleLogout}
              title="Logout"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Dynamic Nested Page Content */}
        <main className="admin-content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
