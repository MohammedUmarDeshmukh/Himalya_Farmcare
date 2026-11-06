import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  adminCreateCrop,
  adminDeleteCrop,
  adminGetCrops,
  adminUpdateCrop,
} from '../../services/adminService';
import { sortCropNames } from '../../utils/cropOrder';

const initialCropForm = {
  name: '',
  description: '',
  image: '',
  status: 'active',
};

export default function AdminCrops() {
  const { token } = useAuth();

  const [crops, setCrops] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialCropForm);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  const loadCrops = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await adminGetCrops({ limit: 100, search: search.trim() || undefined }, token);
      setCrops(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load crops.');
    } finally {
      setIsLoading(false);
    }
  }, [token, search]);

  useEffect(() => {
    loadCrops();
  }, [loadCrops]);

  const handleOpenCreate = () => {
    setFormData(initialCropForm);
    setFormError('');
    setEditingId(null);
    setModalMode('create');
  };

  const handleOpenEdit = (crop) => {
    setFormData({
      name: crop.name || '',
      description: crop.description || '',
      image: crop.image || '',
      status: crop.status || 'active',
    });
    setFormError('');
    setEditingId(crop._id);
    setModalMode('edit');
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setEditingId(null);
    setFormError('');
  };

  const handleSaveCrop = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Crop name is required.');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      image: formData.image.trim() || undefined,
      status: formData.status,
    };

    setIsSubmitting(true);
    try {
      if (modalMode === 'create') {
        await adminCreateCrop(payload, token);
        setActionSuccess(`Crop "${payload.name}" added successfully.`);
      } else {
        await adminUpdateCrop(editingId, payload, token);
        setActionSuccess(`Crop "${payload.name}" updated successfully.`);
      }
      handleCloseModal();
      loadCrops();
    } catch (err) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (crop) => {
    const newStatus = crop.status === 'active' ? 'inactive' : 'active';
    try {
      await adminUpdateCrop(crop._id, { status: newStatus }, token);
      setActionSuccess(`Crop "${crop.name}" status changed to ${newStatus}.`);
      loadCrops();
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    }
  };

  const handleDeleteCrop = async () => {
    if (!deleteCandidate) return;
    try {
      await adminDeleteCrop(deleteCandidate._id, token);
      setActionSuccess(`Crop "${deleteCandidate.name}" removed successfully.`);
      setDeleteCandidate(null);
      loadCrops();
    } catch (err) {
      setError(err.message || 'Failed to delete crop.');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <span className="eyebrow">AGRICULTURAL CATEGORIES · CROPS</span>
          <h1>Crop Management</h1>
          <p>Define and manage crops available for farmer recommendation planning.</p>
        </div>
        <button type="button" className="admin-btn primary" onClick={handleOpenCreate}>
          + Add New Crop
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
            placeholder="Search crops by name or slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      <section className="admin-card-section">
        {isLoading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
            <p>Loading crop categories…</p>
          </div>
        ) : crops.length === 0 ? (
          <div className="admin-empty-state">
            <p>No crops found.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Crop Name</th>
                  <th>Slug</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Toggle</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortCropNames(crops).map((c) => (
                  <tr key={c._id}>
                    <td>
                      <strong>🌾 {c.name}</strong>
                    </td>
                    <td>
                      <code className="slug-badge">{c.slug}</code>
                    </td>
                    <td>{c.description || <span className="muted-text">—</span>}</td>
                    <td>
                      <span className={`status-pill ${c.status}`}>{c.status}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="toggle-status-link"
                        onClick={() => handleToggleStatus(c)}
                      >
                        {c.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                    <td>
                      <div className="action-btn-group">
                        <button
                          type="button"
                          className="btn-action edit"
                          onClick={() => handleOpenEdit(c)}
                          title="Edit Crop"
                        >
                          ✎ Edit
                        </button>
                        <button
                          type="button"
                          className="btn-action delete"
                          onClick={() => setDeleteCandidate(c)}
                          title="Delete Crop"
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

      {/* Add / Edit Crop Modal */}
      {modalMode && (
        <div className="admin-modal-backdrop" onClick={handleCloseModal}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{modalMode === 'create' ? 'Add Crop' : 'Edit Crop'}</h2>
              <button type="button" className="modal-close-btn" onClick={handleCloseModal}>
                ✕
              </button>
            </div>

            {formError && (
              <div className="admin-alert error" role="alert">
                <p>{formError}</p>
              </div>
            )}

            <form onSubmit={handleSaveCrop} className="admin-form-grid">
              <div className="form-field full">
                <label>Crop Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Cotton, Turmeric, Wheat"
                  required
                />
              </div>

              <div className="form-field full">
                <label>Description</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Agricultural characteristics and growing season details"
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
                  {isSubmitting ? 'Saving…' : modalMode === 'create' ? 'Create Crop' : 'Save Changes'}
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
              <h2>Confirm Crop Deletion</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setDeleteCandidate(null)}
              >
                ✕
              </button>
            </div>
            <p>
              Are you sure you want to delete crop <strong>"{deleteCandidate.name}"</strong>?
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="admin-btn secondary"
                onClick={() => setDeleteCandidate(null)}
              >
                Cancel
              </button>
              <button type="button" className="admin-btn danger" onClick={handleDeleteCrop}>
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
