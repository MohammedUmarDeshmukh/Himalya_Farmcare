import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAdminStats } from '../../services/adminService';
import { money } from '../../utils/formatters';

export default function AdminDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await getAdminStats(token);
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard statistics.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const stats = data?.stats || {};
  const lowStock = data?.lowStockProducts || [];
  const recentFarmers = data?.recentFarmers || [];
  const recentProducts = data?.recentProducts || [];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <span className="eyebrow">HIMALAYA FARMCARE · REAL-TIME METRICS</span>
          <h1>Admin Overview Dashboard</h1>
          <p>Live inventory, farmer registrations, and agricultural parameters from MongoDB.</p>
        </div>
        <button
          type="button"
          className="admin-btn secondary"
          onClick={loadStats}
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing…' : '🔄 Refresh Data'}
        </button>
      </div>

      {error && (
        <div className="admin-alert error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={loadStats}>
            Retry
          </button>
        </div>
      )}

      {isLoading && !data && (
        <div className="admin-loading" role="status">
          <div className="admin-spinner" />
          <p>Loading real-time database metrics…</p>
        </div>
      )}

      {data && (
        <>
          {/* Statistics Grid */}
          <section className="admin-stats-grid" aria-label="Key Statistics">
            <div className="admin-stat-card">
              <div className="stat-card-icon green">📦</div>
              <div className="stat-card-content">
                <span className="stat-title">Total Products</span>
                <strong className="stat-value">{stats.totalProducts ?? 0}</strong>
                <span className="stat-sub">{stats.totalActiveProducts ?? 0} active in catalogue</span>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-card-icon gold">👨‍🌾</div>
              <div className="stat-card-content">
                <span className="stat-title">Registered Farmers</span>
                <strong className="stat-value">{stats.totalFarmers ?? 0}</strong>
                <span className="stat-sub">Active community users</span>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-card-icon emerald">🌾</div>
              <div className="stat-card-content">
                <span className="stat-title">Crop Categories</span>
                <strong className="stat-value">{stats.totalCrops ?? 0}</strong>
                <span className="stat-sub">Supported crop types</span>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-card-icon amber">🐛</div>
              <div className="stat-card-content">
                <span className="stat-title">Farm Problems</span>
                <strong className="stat-value">{stats.totalProblems ?? 0}</strong>
                <span className="stat-sub">Problem definitions</span>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-card-icon sky">💧</div>
              <div className="stat-card-content">
                <span className="stat-title">App Methods</span>
                <strong className="stat-value">{stats.totalMethods ?? 0}</strong>
                <span className="stat-sub">Drip, Spray & methods</span>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-card-icon red">⚠️</div>
              <div className="stat-card-content">
                <span className="stat-title">Low Stock Items</span>
                <strong className="stat-value">{lowStock.length}</strong>
                <span className="stat-sub">Stock &le; 10 units</span>
              </div>
            </div>
          </section>

          {/* Low Stock Warning Section */}
          <section className="admin-card-section">
            <div className="admin-card-header">
              <div>
                <h3>⚠️ Low Inventory Warnings</h3>
                <p>Products with 10 or fewer units remaining in warehouse storage.</p>
              </div>
              <Link to="/admin/products" className="admin-link">
                Manage Inventory &rarr;
              </Link>
            </div>
            {lowStock.length === 0 ? (
              <div className="admin-empty-state">
                <span className="check-icon">✓</span>
                <p>All products have healthy inventory levels (&gt; 10 units in stock).</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Crop</th>
                      <th>Problem</th>
                      <th>Method</th>
                      <th className="num">Stock Remaining</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.map((prod) => (
                      <tr key={prod._id}>
                        <td>
                          <strong>{prod.name}</strong>
                        </td>
                        <td>{prod.crop}</td>
                        <td>{prod.problem}</td>
                        <td>{prod.applicationMethod}</td>
                        <td className="num">
                          <span className="stock-badge low">{prod.stock ?? 0} left</span>
                        </td>
                        <td>
                          <span className={`status-pill ${prod.status}`}>{prod.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Two-column layout for recent farmers and recent products */}
          <div className="admin-dual-grid">
            {/* Recent Farmers */}
            <section className="admin-card-section">
              <div className="admin-card-header">
                <div>
                  <h3>👨‍🌾 Recently Registered Farmers</h3>
                  <p>Latest farmer accounts on Himalaya FarmCare.</p>
                </div>
                <Link to="/admin/users" className="admin-link">
                  View All &rarr;
                </Link>
              </div>
              {recentFarmers.length === 0 ? (
                <div className="admin-empty-state">
                  <p>No farmers registered yet.</p>
                </div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Farmer Name</th>
                        <th>Email</th>
                        <th>Registered</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentFarmers.map((farmer) => (
                        <tr key={farmer._id}>
                          <td>
                            <strong>{farmer.name}</strong>
                          </td>
                          <td>{farmer.email}</td>
                          <td>{new Date(farmer.createdAt).toLocaleDateString()}</td>
                          <td>
                            <span className={`status-pill ${farmer.status}`}>{farmer.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Recently Added Products */}
            <section className="admin-card-section">
              <div className="admin-card-header">
                <div>
                  <h3>📦 Catalogue Additions</h3>
                  <p>Recently added agricultural treatments.</p>
                </div>
                <Link to="/admin/products" className="admin-link">
                  View All &rarr;
                </Link>
              </div>
              {recentProducts.length === 0 ? (
                <div className="admin-empty-state">
                  <p>No products in catalogue.</p>
                </div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Crop</th>
                        <th>100ml / 500ml</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentProducts.map((p) => {
                        const p100 = p.prices?.find((item) => item.size === 100)?.amount;
                        const p500 = p.prices?.find((item) => item.size === 500)?.amount;
                        return (
                          <tr key={p._id}>
                            <td>
                              <strong>{p.name}</strong>
                            </td>
                            <td>{p.crop}</td>
                            <td>
                              {p100 ? money(p100) : '—'} / {p500 ? money(p500) : '—'}
                            </td>
                            <td>
                              <span className={`status-pill ${p.status}`}>{p.status}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
