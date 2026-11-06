import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  adminCreateProblem,
  adminDeleteProblem,
  adminGetProblems,
  adminUpdateProblem,
} from '../../services/adminService';

const initialProblemForm = {
  name: '',
  description: '',
  status: 'active',
};

export default function AdminProblems() {
  const { token } = useAuth();

  const [problems, setProblems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [modalMode, setModalMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialProblemForm);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  const loadProblems = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await adminGetProblems({ limit: 100, search: search.trim() || undefined }, token);
      setProblems(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load problems.');
    } finally {
      setIsLoading(false);
    }
  }, [token, search]);

  useEffect(() => {
    loadProblems();
  }, [loadProblems]);

  const handleOpenCreate = () => {
    setFormData(initialProblemForm);
    setFormError('');
    setEditingId(null);
    setModalMode('create');
  };

  const handleOpenEdit = (problem) => {
    setFormData({
      name: problem.name || '',
      description: problem.description || '',
      status: problem.status || 'active',
    });
    setFormError('');
    setEditingId(problem._id);
    setModalMode('edit');
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setEditingId(null);
    setFormError('');
  };

  const handleSaveProblem = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Problem name is required.');
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
        await adminCreateProblem(payload, token);
        setActionSuccess(`Problem "${payload.name}" created successfully.`);
      } else {
        await adminUpdateProblem(editingId, payload, token);
        setActionSuccess(`Problem "${payload.name}" updated successfully.`);
      }
      handleCloseModal();
      loadProblems();
    } catch (err) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (prob) => {
    const newStatus = prob.status === 'active' ? 'inactive' : 'active';
    try {
      await adminUpdateProblem(prob._id, { status: newStatus }, token);
      setActionSuccess(`Problem "${prob.name}" status changed to ${newStatus}.`);
      loadProblems();
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    }
  };

  const handleDeleteProblem = async () => {
    if (!deleteCandidate) return;
    try {
      await adminDeleteProblem(deleteCandidate._id, token);
      setActionSuccess(`Problem "${deleteCandidate.name}" deleted successfully.`);
      setDeleteCandidate(null);
      loadProblems();
    } catch (err) {
      setError(err.message || 'Failed to delete problem.');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <span className="eyebrow">FARM ISSUES · PROBLEM TYPES</span>
          <h1>Agricultural Problem Management</h1>
          <p>Configure agricultural problems and pests treated by products.</p>
        </div>
        <button type="button" className="admin-btn primary" onClick={handleOpenCreate}>
          + Add New Problem
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
            placeholder="Search problems by name or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      <section className="admin-card-section">
        {isLoading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
            <p>Loading problems…</p>
          </div>
        ) : problems.length === 0 ? (
          <div className="admin-empty-state">
            <p>No agricultural problems found.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Problem Category</th>
                  <th>Slug</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Toggle</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <strong>🐛 {p.name}</strong>
                    </td>
                    <td>
                      <code className="slug-badge">{p.slug}</code>
                    </td>
                    <td>{p.description || <span className="muted-text">—</span>}</td>
                    <td>
                      <span className={`status-pill ${p.status}`}>{p.status}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="toggle-status-link"
                        onClick={() => handleToggleStatus(p)}
                      >
                        {p.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                    <td>
                      <div className="action-btn-group">
                        <button
                          type="button"
                          className="btn-action edit"
                          onClick={() => handleOpenEdit(p)}
                          title="Edit Problem"
                        >
                          ✎ Edit
                        </button>
                        <button
                          type="button"
                          className="btn-action delete"
                          onClick={() => setDeleteCandidate(p)}
                          title="Delete Problem"
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

      {/* Add / Edit Problem Modal */}
      {modalMode && (
        <div className="admin-modal-backdrop" onClick={handleCloseModal}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{modalMode === 'create' ? 'Add Problem' : 'Edit Problem'}</h2>
              <button type="button" className="modal-close-btn" onClick={handleCloseModal}>
                ✕
              </button>
            </div>

            {formError && (
              <div className="admin-alert error" role="alert">
                <p>{formError}</p>
              </div>
            )}

            <form onSubmit={handleSaveProblem} className="admin-form-grid">
              <div className="form-field full">
                <label>Problem Category Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Insecticide, Fungicide, PGR, Special PGR"
                  required
                />
              </div>

              <div className="form-field full">
                <label>Description</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Symptoms and agricultural issue details"
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
                  {isSubmitting ? 'Saving…' : modalMode === 'create' ? 'Create Problem' : 'Save Changes'}
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
              <h2>Confirm Problem Deletion</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setDeleteCandidate(null)}
              >
                ✕
              </button>
            </div>
            <p>
              Are you sure you want to delete problem <strong>"{deleteCandidate.name}"</strong>?
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="admin-btn secondary"
                onClick={() => setDeleteCandidate(null)}
              >
                Cancel
              </button>
              <button type="button" className="admin-btn danger" onClick={handleDeleteProblem}>
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
