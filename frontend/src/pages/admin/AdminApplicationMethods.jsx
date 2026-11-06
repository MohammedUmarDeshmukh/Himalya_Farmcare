import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  adminCreateApplicationMethod,
  adminDeleteApplicationMethod,
  adminGetApplicationMethods,
  adminUpdateApplicationMethod,
} from '../../services/adminService';

const initialMethodForm = {
  name: '',
  description: '',
  status: 'active',
};

export default function AdminApplicationMethods() {
  const { token } = useAuth();

  const [methods, setMethods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [modalMode, setModalMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialMethodForm);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  const loadMethods = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await adminGetApplicationMethods({ limit: 100, search: search.trim() || undefined }, token);
      setMethods(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load application methods.');
    } finally {
      setIsLoading(false);
    }
  }, [token, search]);

  useEffect(() => {
    loadMethods();
  }, [loadMethods]);

  const handleOpenCreate = () => {
    setFormData(initialMethodForm);
    setFormError('');
    setEditingId(null);
    setModalMode('create');
  };

  const handleOpenEdit = (method) => {
    setFormData({
      name: method.name || '',
      description: method.description || '',
      status: method.status || 'active',
    });
    setFormError('');
    setEditingId(method._id);
    setModalMode('edit');
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setEditingId(null);
    setFormError('');
  };

  const handleSaveMethod = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Method name is required.');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      status: formData.status,
    };

    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        await adminCreateApplicationMethod(payload, token);
        setActionSuccess(`Application method "${payload.name}" created successfully.`);
      } else {
        await adminUpdateApplicationMethod(editingId, payload, token);
        setActionSuccess(`Application method "${payload.name}" updated successfully.`);
      }
      handleCloseModal();
      loadMethods();
    } catch (err) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (method) => {
    const newStatus = method.status === 'active' ? 'inactive' : 'active';
    try {
      await adminUpdateApplicationMethod(method._id, { status: newStatus }, token);
      setActionSuccess(`Method "${method.name}" status changed to ${newStatus}.`);
      loadMethods();
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    }
  };

  const handleDeleteMethod = async () => {
    if (!deleteCandidate) return;
    try {
      await adminDeleteApplicationMethod(deleteCandidate._id, token);
      setActionSuccess(`Method "${deleteCandidate.name}" removed successfully.`);
      setDeleteCandidate(null);
      loadMethods();
    } catch (err) {
      setError(err.message || 'Failed to delete method.');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <span className="eyebrow">EQUIPMENT & TECHNIQUE · DELIVERY</span>
          <h1>Application Method Management</h1>
          <p>Manage application delivery mechanisms (e.g. Foliar Spray, Drip Irrigation).</p>
        </div>
        <button type="button" className="admin-btn primary" onClick={handleOpenCreate}>
          + Add New Method
        </button>
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
        <div className="search-wrap full">
          <input
            type="search"
            placeholder="Search application methods…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      <section className="admin-card-section">
        {isLoading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
            <p>Loading application methods…</p>
          </div>
        ) : methods.length === 0 ? (
          <div className="admin-empty-state">
            <p>No application methods found.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Method Name</th>
                  <th>Slug</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Toggle</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {methods.map((m) => (
                  <tr key={m._id}>
                    <td>
                      <strong>💧 {m.name}</strong>
                    </td>
                    <td>
                      <code className="slug-badge">{m.slug}</code>
                    </td>
                    <td>{m.description || <span className="muted-text">—</span>}</td>
                    <td>
                      <span className={`status-pill ${m.status}`}>{m.status}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="toggle-status-link"
                        onClick={() => handleToggleStatus(m)}
                      >
                        {m.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                    <td>
                      <div className="action-btn-group">
                        <button
                          type="button"
                          className="btn-action edit"
                          onClick={() => handleOpenEdit(m)}
                          title="Edit Method"
                        >
                          ✎ Edit
                        </button>
                        <button
                          type="button"
                          className="btn-action delete"
                          onClick={() => setDeleteCandidate(m)}
                          title="Delete Method"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add / Edit Modal */}
      {modalMode && (
        <div className="admin-modal-backdrop" onClick={handleCloseModal}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{modalMode === 'create' ? 'Add Application Method' : 'Edit Application Method'}</h2>
              <button type="button" className="modal-close-btn" onClick={handleCloseModal}>
                ✕
              </button>
            </div>

            {formError && (
              <div className="admin-alert error" role="alert">
                <p>{formError}</p>
              </div>
            )}

            <form onSubmit={handleSaveMethod} className="admin-form-grid">
              <div className="form-field full">
                <label>Method Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Spray, Drip"
                  required
                />
              </div>

              <div className="form-field full">
                <label>Description</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Application specifications and delivery equipment notes"
                />
              </div>

              <div className="form-field full">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="modal-actions full">
                <button
                  type="button"
                  className="admin-btn secondary"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : modalMode === 'create' ? 'Create Method' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="admin-modal-backdrop" onClick={() => setDeleteCandidate(null)}>
          <div className="admin-modal-box confirm" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Confirm Method Deletion</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setDeleteCandidate(null)}
              >
                ✕
              </button>
            </div>
            <p>
              Are you sure you want to delete application method <strong>"{deleteCandidate.name}"</strong>?
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="admin-btn secondary"
                onClick={() => setDeleteCandidate(null)}
              >
                Cancel
              </button>
              <button type="button" className="admin-btn danger" onClick={handleDeleteMethod}>
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
