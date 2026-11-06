import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  adminCreateProduct,
  adminDeleteProduct,
  adminGetCrops,
  adminGetProblems,
  adminGetProducts,
  adminRemoveProductImage,
  adminUpdateProduct,
  adminUploadProductImage,
} from '../../services/adminService';
import { getProductImageUrl, money } from '../../utils/formatters';
import { sortCropNames } from '../../utils/cropOrder';

const initialForm = {
  name: '',
  brand: '',
  company: '',
  crop: 'Cotton',
  problem: 'Insecticide',
  applicationMethod: 'Spray',
  sequence: 1,
  description: '',
  image: '/products/1.jpg',
  dosagePerAcre: 100,
  dosageUnit: 'ml',
  stock: 50,
  p100: 250,
  p500: 950,
  status: 'active',
};

export default function AdminProducts() {
  const { token } = useAuth();

  const [products, setProducts] = useState([]);
  const [crops, setCrops] = useState([]);
  const [problems, setProblems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [filterCrop, setFilterCrop] = useState('All');
  const [filterProblem, setFilterProblem] = useState('All');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modals & Forms
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Phase 13 Image Upload State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');

  // Delete Confirmation Modal
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  // Load Crops and Problems for dropdown selections
  useEffect(() => {
    async function loadMeta() {
      try {
        const [cRes, pRes] = await Promise.all([
          adminGetCrops({ limit: 100 }, token),
          adminGetProblems({ limit: 100 }, token),
        ]);
        setCrops(cRes.data || []);
        setProblems(pRes.data || []);
      } catch (err) {
        console.warn('Failed to load filter metadata:', err);
      }
    }
    loadMeta();
  }, [token]);

  // Load Products list
  const loadProducts = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setError('');
      try {
        const query = {
          page,
          limit: 10,
          search: search.trim() || undefined,
          crop: filterCrop !== 'All' ? filterCrop : undefined,
          problem: filterProblem !== 'All' ? filterProblem : undefined,
          status: filterStatus,
        };
        const result = await adminGetProducts(query, token);
        setProducts(result.data || []);
        setPagination(result.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      } catch (err) {
        setError(err.message || 'Failed to load products.');
      } finally {
        setIsLoading(false);
      }
    },
    [token, search, filterCrop, filterProblem, filterStatus],
  );

  useEffect(() => {
    loadProducts(1);
  }, [loadProducts]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData(initialForm);
    setImageFile(null);
    setImagePreview('/products/1.jpg');
    setUploadStatus('');
    setFormError('');
    setEditingId(null);
    setModalMode('create');
  };

  // Open Edit Modal
  const handleOpenEdit = (product) => {
    const p100 = product.prices?.find((p) => p.size === 100)?.amount ?? 0;
    const p500 = product.prices?.find((p) => p.size === 500)?.amount ?? 0;
    const currentImg = product.image || '';
    setFormData({
      name: product.name || '',
      brand: product.brand || '',
      company: product.company || '',
      crop: product.crop || 'Cotton',
      problem: product.problem || 'Insecticide',
      applicationMethod: product.applicationMethod || 'Spray',
      sequence: product.sequence ?? 1,
      description: product.description || '',
      image: currentImg,
      dosagePerAcre: product.dosagePerAcre ?? 100,
      dosageUnit: product.dosageUnit || 'ml',
      stock: product.stock ?? 50,
      p100,
      p500,
      status: product.status || 'active',
    });
    setImageFile(null);
    setImagePreview(currentImg);
    setUploadStatus('');
    setFormError('');
    setEditingId(product._id);
    setModalMode('edit');
  };

  // Close Modal
  const handleCloseModal = () => {
    setModalMode(null);
    setEditingId(null);
    setImageFile(null);
    setImagePreview('');
    setUploadStatus('');
    setFormError('');
  };

  // Handle Form Change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle File Selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setFormError('Invalid file format. Please select a JPG, JPEG, PNG, or WEBP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('File size exceeds the 5 MB limit. Please select an image under 5 MB.');
      return;
    }

    setFormError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setUploadStatus(`Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
  };

  // Handle Image Removal
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData((prev) => ({ ...prev, image: '' }));
    setUploadStatus('Image cleared (will display fallback image)');
  };

  // Save Product (Create or Edit)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Product name is required.');
      return;
    }
    if (!formData.crop) {
      setFormError('Crop is required.');
      return;
    }
    if (!formData.problem) {
      setFormError('Problem is required.');
      return;
    }

    setIsSubmitting(true);
    let finalImageUrl = formData.image?.trim() || '';

    // If an image file was selected, upload it first
    if (imageFile) {
      setUploadStatus('Uploading image file to server…');
      try {
        const uploadResult = await adminUploadProductImage(imageFile, token);
        finalImageUrl = uploadResult.imageUrl;
        setUploadStatus('Image uploaded successfully.');
      } catch (uploadErr) {
        setFormError(uploadErr.message || 'Image upload failed.');
        setIsSubmitting(false);
        return;
      }
    }

    const payload = {
      name: formData.name.trim(),
      brand: formData.brand.trim() || undefined,
      company: formData.company.trim() || undefined,
      crop: formData.crop,
      problem: formData.problem,
      applicationMethod: formData.applicationMethod,
      sequence: Math.max(1, Number(formData.sequence) || 1),
      description: formData.description.trim() || undefined,
      image: finalImageUrl,
      dosagePerAcre: Math.max(0, Number(formData.dosagePerAcre) || 0),
      dosageUnit: formData.dosageUnit.trim() || 'ml',
      availableSizes: [100, 500],
      prices: [
        { size: 100, amount: Math.max(0, Number(formData.p100) || 0) },
        { size: 500, amount: Math.max(0, Number(formData.p500) || 0) },
      ],
      stock: Math.max(0, Number(formData.stock) || 0),
      status: formData.status,
    };

    try {
      if (modalMode === 'create') {
        await adminCreateProduct(payload, token);
        setActionSuccess(`Product "${payload.name}" created successfully.`);
      } else {
        await adminUpdateProduct(editingId, payload, token);
        setActionSuccess(`Product "${payload.name}" updated successfully.`);
      }
      handleCloseModal();
      loadProducts(pagination.page);
    } catch (err) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async () => {
    if (!deleteCandidate) return;
    try {
      await adminDeleteProduct(deleteCandidate._id, token);
      setActionSuccess(`Product "${deleteCandidate.name}" removed successfully.`);
      setDeleteCandidate(null);
      loadProducts(pagination.page);
    } catch (err) {
      setError(err.message || 'Failed to delete product.');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <span className="eyebrow">INVENTORY · TREATMENT CATALOGUE</span>
          <h1>Product Management</h1>
          <p>Add, edit, and organize agricultural treatments, product images, and dosage guidelines.</p>
        </div>
        <button type="button" className="admin-btn primary" onClick={handleOpenCreate}>
          + Add New Product
        </button>
      </div>

      {actionSuccess && (
        <div className="admin-alert success" role="alert">
          <p>{actionSuccess}</p>
          <button type="button" onClick={() => setActionSuccess('')}>
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="admin-alert error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => setError('')}>
            ✕
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <section className="admin-filter-bar">
        <div className="search-wrap">
          <input
            type="search"
            placeholder="Search by product, brand, company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select value={filterCrop} onChange={(e) => setFilterCrop(e.target.value)}>
          <option value="All">All Crops</option>
          {sortCropNames(crops).map((c) => (
            <option key={c._id} value={c.name}>
              {c.name}
            </option>
          ))}
          {crops.length === 0 && (
            <>
              <option value="CORN">CORN</option>
              <option value="Cotton">Cotton</option>
              <option value="Soyabean">Soyabean</option>
              <option value="Turmeric">Turmeric</option>
              <option value="OTHER">OTHER</option>
            </>
          )}
        </select>

        <select value={filterProblem} onChange={(e) => setFilterProblem(e.target.value)}>
          <option value="All">All Problems</option>
          {problems.map((p) => (
            <option key={p._id} value={p.name}>
              {p.name}
            </option>
          ))}
          {problems.length === 0 && (
            <>
              <option value="Insecticide">Insecticide</option>
              <option value="Fungicide">Fungicide</option>
              <option value="PGR">PGR</option>
              <option value="Special PGR">Special PGR</option>
            </>
          )}
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </section>

      {/* Products Table */}
      <section className="admin-card-section">
        {isLoading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
            <p>Fetching products from catalogue…</p>
          </div>
        ) : products.length === 0 ? (
          <div className="admin-empty-state">
            <p>No products match the selected filters.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Product Name</th>
                  <th>Crop</th>
                  <th>Problem</th>
                  <th>Method</th>
                  <th>Seq</th>
                  <th>Stock</th>
                  <th>Prices</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((prod) => {
                  const p100 = prod.prices?.find((p) => p.size === 100)?.amount;
                  const p500 = prod.prices?.find((p) => p.size === 500)?.amount;
                  return (
                    <tr key={prod._id}>
                      <td>
                        <img
                          src={getProductImageUrl(prod)}
                          alt={prod.name}
                          className="table-img-thumb"
                          onError={(e) => {
                            e.currentTarget.src = '/products/res.jpg';
                          }}
                        />
                      </td>
                      <td>
                        <strong>{prod.name}</strong>
                        {prod.brand && <small className="table-sub">{prod.brand}</small>}
                      </td>
                      <td>{prod.crop}</td>
                      <td>{prod.problem}</td>
                      <td>{prod.applicationMethod}</td>
                      <td>#{prod.sequence}</td>
                      <td>
                        <span className={`stock-badge ${prod.stock <= 10 ? 'low' : 'ok'}`}>
                          {prod.stock ?? 0}
                        </span>
                      </td>
                      <td>
                        <span className="price-tag">
                          {p100 ? money(p100) : '—'} (100ml)
                          <br />
                          {p500 ? money(p500) : '—'} (500ml)
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${prod.status}`}>{prod.status}</span>
                      </td>
                      <td>
                        <div className="action-btn-group">
                          <button
                            type="button"
                            className="btn-action edit"
                            onClick={() => handleOpenEdit(prod)}
                            title="Edit Product"
                          >
                            ✎ Edit
                          </button>
                          <button
                            type="button"
                            className="btn-action delete"
                            onClick={() => setDeleteCandidate(prod)}
                            title="Delete Product"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="admin-pagination">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => loadProducts(pagination.page - 1)}
            >
              &larr; Previous
            </button>
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} products)
            </span>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => loadProducts(pagination.page + 1)}
            >
              Next &rarr;
            </button>
          </div>
        )}
      </section>

      {/* Add / Edit Product Modal */}
      {modalMode && (
        <div className="admin-modal-backdrop" onClick={handleCloseModal}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{modalMode === 'create' ? 'Add New Product' : 'Edit Product'}</h2>
              <button type="button" className="modal-close-btn" onClick={handleCloseModal}>
                ✕
              </button>
            </div>

            {formError && (
              <div className="admin-alert error" role="alert">
                <p>{formError}</p>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="admin-form-grid">
              <div className="form-field full">
                <label>Product Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-field">
                <label>Brand</label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-field">
                <label>Company</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-field">
                <label>Target Crop *</label>
                <select name="crop" value={formData.crop} onChange={handleFormChange}>
                  {crops.length > 0 ? (
                    sortCropNames(crops).map((c) => (
                      <option key={c._id} value={c.name}>
                        {c.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="CORN">CORN</option>
                      <option value="Cotton">Cotton</option>
                      <option value="Soyabean">Soyabean</option>
                      <option value="Turmeric">Turmeric</option>
                      <option value="OTHER">OTHER</option>
                    </>
                  )}
                </select>
              </div>

              <div className="form-field">
                <label>Problem Category *</label>
                <select name="problem" value={formData.problem} onChange={handleFormChange}>
                  <option value="Insecticide">Insecticide</option>
                  <option value="Fungicide">Fungicide</option>
                  <option value="PGR">PGR</option>
                  <option value="Special PGR">Special PGR</option>
                </select>
              </div>

              <div className="form-field">
                <label>Application Method *</label>
                <select
                  name="applicationMethod"
                  value={formData.applicationMethod}
                  onChange={handleFormChange}
                >
                  <option value="Spray">Spray</option>
                  <option value="Drip">Drip</option>
                </select>
              </div>

              <div className="form-field">
                <label>Spray Sequence *</label>
                <input
                  type="number"
                  name="sequence"
                  min="1"
                  value={formData.sequence}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-field">
                <label>Stock (Quantity) *</label>
                <input
                  type="number"
                  name="stock"
                  min="0"
                  value={formData.stock}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-field">
                <label>Dosage per Acre *</label>
                <input
                  type="number"
                  name="dosagePerAcre"
                  min="0"
                  value={formData.dosagePerAcre}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-field">
                <label>Dosage Unit</label>
                <input
                  type="text"
                  name="dosageUnit"
                  value={formData.dosageUnit}
                  onChange={handleFormChange}
                  placeholder="ml"
                />
              </div>

              <div className="form-field">
                <label>Price 100ml (₹)</label>
                <input
                  type="number"
                  name="p100"
                  min="0"
                  step="0.01"
                  value={formData.p100}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-field">
                <label>Price 500ml (₹)</label>
                <input
                  type="number"
                  name="p500"
                  min="0"
                  step="0.01"
                  value={formData.p500}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-field">
                <label>Status</label>
                <select name="status" value={formData.status} onChange={handleFormChange}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Phase 13: Product Image Upload Component */}
              <div className="form-field full">
                <label>Product Image (File Upload or Fallback)</label>
                <div className="image-upload-wrapper">
                  {imagePreview ? (
                    <div className="image-upload-preview-card">
                      <img
                        src={getProductImageUrl(imagePreview)}
                        alt="Product preview"
                        className="image-preview-thumb"
                        onError={(e) => {
                          e.currentTarget.src = '/products/res.jpg';
                        }}
                      />
                      <div className="image-preview-info">
                        <span className="image-preview-tag">
                          {imageFile ? 'Selected File (Will upload on save)' : 'Current Image'}
                        </span>
                        <span className="image-preview-source">
                          {imageFile ? imageFile.name : formData.image || 'Default fallback image'}
                        </span>
                        {uploadStatus && <small className="image-upload-hint">{uploadStatus}</small>}
                        <div className="image-preview-actions">
                          <label className="btn-upload-action change">
                            📁 Choose Another File
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={handleFileSelect}
                              style={{ display: 'none' }}
                              disabled={isSubmitting}
                            />
                          </label>
                          <button
                            type="button"
                            className="btn-upload-action remove"
                            onClick={handleRemoveImage}
                            disabled={isSubmitting}
                          >
                            ✕ Remove Image
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="image-upload-dropzone">
                      <span className="upload-icon">📷</span>
                      <span className="upload-prompt">Click to upload product image</span>
                      <span className="image-upload-hint">
                        Accepts JPG, JPEG, PNG, WEBP (Maximum size: 5 MB)
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileSelect}
                        disabled={isSubmitting}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="form-field full">
                <label>Description</label>
                <textarea
                  name="description"
                  rows="3"
                  value={formData.description}
                  onChange={handleFormChange}
                />
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
                  {isSubmitting ? 'Saving Product…' : modalMode === 'create' ? 'Create Product' : 'Save Changes'}
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
              <h2>Confirm Product Removal</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setDeleteCandidate(null)}
              >
                ✕
              </button>
            </div>
            <p>
              Are you sure you want to permanently delete{' '}
              <strong>"{deleteCandidate.name}"</strong>? This will remove it from the recommendation
              plan and catalogue, and clean up any associated uploaded images.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="admin-btn secondary"
                onClick={() => setDeleteCandidate(null)}
              >
                Cancel
              </button>
              <button type="button" className="admin-btn danger" onClick={handleDeleteProduct}>
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
