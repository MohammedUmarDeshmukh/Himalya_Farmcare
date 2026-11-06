import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getAdminUsers, updateUserStatus } from '../../services/adminService';

export default function AdminUsers() {
  const { user: currentUser, token } = useAuth();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const loadUsers = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setError('');
      try {
        const query = {
          page,
          limit: 10,
          search: search.trim() || undefined,
          status: filterStatus !== 'all' ? filterStatus : undefined,
        };
        const result = await getAdminUsers(query, token);
        setUsers(result.data || []);
        setPagination(result.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      } catch (err) {
        setError(err.message || 'Failed to load farmers.');
      } finally {
        setIsLoading(false);
      }
    },
    [token, search, filterStatus],
  );

  useEffect(() => {
    loadUsers(1);
  }, [loadUsers]);

  const handleToggleStatus = async (user) => {
    // Security verification
    if (currentUser?._id === user._id && user.status === 'active') {
      setError('Security restriction: You cannot deactivate your own account.');
      return;
    }

    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await updateUserStatus(user._id, nextStatus, token);
      setActionSuccess(`Farmer "${user.name}" account status changed to ${nextStatus}.`);
      loadUsers(pagination.page);
    } catch (err) {
      setError(err.message || 'Failed to update user status.');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <span className="eyebrow">COMMUNITY · FARMER REGISTRATIONS</span>
          <h1>User & Farmer Management</h1>
          <p>Review registered farmers, contact details, account standing, and activity status.</p>
        </div>
      </div>

      {actionSuccess && (
        <div className="admin-alert success" role="alert">
          <p>{actionSuccess}</p>
          <button type="button" onClick={() => setActionSuccess('')}>✕</button>
        </div>
      )}

      {error && (
        <div className="admin-alert error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => setError('')}>✕</button>
        </div>
      )}

      <section className="admin-filter-bar">
        <div className="search-wrap">
          <input
            type="search"
            placeholder="Search by farmer name, email, or mobile number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All Farmers</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </section>

      <section className="admin-card-section">
        {isLoading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
            <p>Loading farmer records…</p>
          </div>
        ) : users.length === 0 ? (
          <div className="admin-empty-state">
            <p>No farmers match your query.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Farmer Name</th>
                  <th>Email Address</th>
                  <th>Phone Number</th>
                  <th>Registered Date</th>
                  <th>Role</th>
                  <th>Account Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isCurrent = currentUser?._id === u._id;
                  return (
                    <tr key={u._id}>
                      <td>
                        <strong>👨‍🌾 {u.name}</strong>
                        {isCurrent && <span className="pill self-pill">You</span>}
                      </td>
                      <td>{u.email}</td>
                      <td>{u.phone || <span className="muted-text">—</span>}</td>
                      <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span className={`role-badge ${u.role}`}>{u.role}</span>
                      </td>
                      <td>
                        <span className={`status-pill ${u.status}`}>{u.status}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="toggle-status-link"
                          onClick={() => handleToggleStatus(u)}
                          disabled={isCurrent && u.status === 'active'}
                          title={
                            isCurrent && u.status === 'active'
                              ? 'You cannot deactivate your own account'
                              : 'Toggle account status'
                          }
                        >
                          {u.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="admin-pagination">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => loadUsers(pagination.page - 1)}
            >
              &larr; Previous
            </button>
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} farmers)
            </span>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => loadUsers(pagination.page + 1)}
            >
              Next &rarr;
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
