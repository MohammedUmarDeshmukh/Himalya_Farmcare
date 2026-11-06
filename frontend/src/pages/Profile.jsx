import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  addSavedAddress,
  deleteSavedAddress,
  getMe,
  setDefaultSavedAddress,
  storeUser,
  updateProfile,
  updateSavedAddress,
} from '../services/authService';

export default function Profile() {
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Profile Form State
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    primaryRegion: '',
  });

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Address Modal State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    title: 'Main Farm',
    name: '',
    phone: '',
    village: '',
    district: '',
    state: '',
    pincode: '',
    acreage: '',
    isDefault: false,
  });
  const [addressErrors, setAddressErrors] = useState({});
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState('');

  // Protect route
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/profile' } } });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Load User Data
  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const { user: updatedUser } = await getMe(token);
      if (updatedUser) {
        storeUser(updatedUser);
        setProfileData({
          name: updatedUser.name || '',
          phone: updatedUser.phone || '',
          primaryRegion: updatedUser.primaryRegion || '',
        });
        setSavedAddresses(updatedUser.savedAddresses || []);
      }
    } catch (err) {
      console.warn('Failed to refresh user:', err.message);
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        phone: user.phone || '',
        primaryRegion: user.primaryRegion || '',
      });
      setSavedAddresses(user.savedAddresses || []);
    }
  }, [user]);

  // Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const result = await updateProfile(profileData, token);
      setProfileSuccess('Personal profile updated successfully.');
      if (result.user) {
        storeUser(result.user);
      }
      await refreshUser();
    } catch (err) {
      setProfileError(err.message || 'Unable to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  // Open Address Modal for New or Edit
  const openNewAddressModal = () => {
    setEditingAddressId(null);
    setAddressForm({
      title: 'Main Farm',
      name: user?.name || '',
      phone: user?.phone || '',
      village: '',
      district: '',
      state: 'Himachal Pradesh',
      pincode: '',
      acreage: '',
      isDefault: savedAddresses.length === 0,
    });
    setAddressErrors({});
    setAddressError('');
    setIsAddressModalOpen(true);
  };

  const openEditAddressModal = (addr) => {
    setEditingAddressId(addr._id);
    setAddressForm({
      title: addr.title || 'Farm',
      name: addr.name || '',
      phone: addr.phone || '',
      village: addr.village || '',
      district: addr.district || '',
      state: addr.state || '',
      pincode: addr.pincode || '',
      acreage: addr.acreage ? String(addr.acreage) : '',
      isDefault: Boolean(addr.isDefault),
    });
    setAddressErrors({});
    setAddressError('');
    setIsAddressModalOpen(true);
  };

  const validateAddress = () => {
    const errs = {};
    if (!addressForm.name.trim()) errs.name = 'Contact name is required.';
    if (!addressForm.phone.trim()) errs.phone = 'Phone number is required.';
    if (!addressForm.village.trim()) errs.village = 'Village / Town is required.';
    if (!addressForm.district.trim()) errs.district = 'District is required.';
    if (!addressForm.state.trim()) errs.state = 'State is required.';
    if (!addressForm.pincode.trim()) {
      errs.pincode = 'Pincode is required.';
    } else if (!/^\d{6}$/.test(addressForm.pincode.trim())) {
      errs.pincode = 'Pincode must be exactly 6 digits.';
    }

    setAddressErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    if (!validateAddress()) return;

    setAddressSaving(true);
    setAddressError('');

    try {
      const payload = {
        title: addressForm.title.trim() || 'Farm',
        name: addressForm.name.trim(),
        phone: addressForm.phone.trim(),
        village: addressForm.village.trim(),
        district: addressForm.district.trim(),
        state: addressForm.state.trim(),
        pincode: addressForm.pincode.trim(),
        acreage: Math.max(0, Number(addressForm.acreage) || 0),
        isDefault: addressForm.isDefault,
      };

      if (editingAddressId) {
        await updateSavedAddress(editingAddressId, payload, token);
      } else {
        await addSavedAddress(payload, token);
      }

      setIsAddressModalOpen(false);
      await refreshUser();
    } catch (err) {
      setAddressError(err.message || 'Failed to save address.');
    } finally {
      setAddressSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId, title) => {
    if (!window.confirm(`Are you sure you want to remove "${title}" from your saved addresses?`)) {
      return;
    }
    try {
      await deleteSavedAddress(addressId, token);
      await refreshUser();
    } catch (err) {
      alert(err.message || 'Unable to delete address.');
    }
  };

  const handleSetDefault = async (addressId) => {
    try {
      await setDefaultSavedAddress(addressId, token);
      await refreshUser();
    } catch (err) {
      alert(err.message || 'Unable to set default address.');
    }
  };

  return (
    <div className="page-shell">
      <Navbar />

      <main className="profile-page-main wrap">
        <div className="profile-header">
          <div>
            <h1>Farmer Profile & Settings 👨‍🌾</h1>
            <p className="profile-subtitle">
              Manage your personal information, primary agricultural region, and saved farm delivery addresses.
            </p>
          </div>
          <span className="role-badge farmer">
            {user?.role === 'admin' ? 'Administrator' : 'Verified Farmer'}
          </span>
        </div>

        {profileSuccess && <div className="notice-banner success">{profileSuccess}</div>}
        {profileError && <div className="notice-banner error">{profileError}</div>}

        <div className="profile-layout-grid">
          {/* Left Column: Personal Information Form */}
          <div className="profile-card">
            <div className="card-header-line">
              <h3>Personal Information</h3>
              <span className="card-tag">Account Details</span>
            </div>

            <form onSubmit={handleProfileSubmit} className="profile-form">
              <div className="form-group">
                <label htmlFor="profile-email">Email Address (Read-only)</label>
                <input
                  id="profile-email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="input-disabled"
                />
                <span className="field-hint">Your email address is your permanent login identifier.</span>
              </div>

              <div className="form-group">
                <label htmlFor="profile-name">Full Name *</label>
                <input
                  id="profile-name"
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-phone">Primary Phone Number</label>
                <input
                  id="profile-phone"
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={profileData.phone}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-region">Primary Farming Region</label>
                <input
                  id="profile-region"
                  type="text"
                  placeholder="e.g. Kangra Valley, HP / Punjab Plains"
                  value={profileData.primaryRegion}
                  onChange={(e) =>
                    setProfileData((prev) => ({ ...prev, primaryRegion: e.target.value }))
                  }
                />
                <span className="field-hint">Helps tailor seasonal recommendations for your region.</span>
              </div>

              <button type="submit" className="btnGreen" disabled={profileSaving}>
                {profileSaving ? 'Saving Changes…' : 'Save Profile Changes'}
              </button>
            </form>
          </div>

          {/* Right Column: Saved Farm Addresses */}
          <div className="profile-card addresses-card">
            <div className="card-header-line">
              <div>
                <h3>Saved Farm Addresses</h3>
                <span className="card-tag">Delivery Locations ({savedAddresses.length})</span>
              </div>
              <button type="button" className="btnGreen btn-sm" onClick={openNewAddressModal}>
                + Add Farm Address
              </button>
            </div>

            {savedAddresses.length === 0 ? (
              <div className="empty-addresses-box">
                <div className="empty-icon">📍</div>
                <h4>No Saved Addresses Yet</h4>
                <p>Add your farm or home delivery address for fast 1-click checkout.</p>
                <button type="button" className="btnSecondary btn-sm" onClick={openNewAddressModal}>
                  + Add Your First Farm Address
                </button>
              </div>
            ) : (
              <div className="saved-addresses-list">
                {savedAddresses.map((addr) => (
                  <div key={addr._id} className={`address-item-card ${addr.isDefault ? 'default' : ''}`}>
                    <div className="address-item-header">
                      <div className="address-title-group">
                        <strong className="address-title">{addr.title}</strong>
                        {addr.isDefault && <span className="default-pill">⭐ Default Farm</span>}
                        {addr.acreage > 0 && (
                          <span className="acreage-pill">🌾 {addr.acreage} Acres</span>
                        )}
                      </div>
                      <div className="address-actions-group">
                        {!addr.isDefault && (
                          <button
                            type="button"
                            className="btn-text-action"
                            onClick={() => handleSetDefault(addr._id)}
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-text-action edit"
                          onClick={() => openEditAddressModal(addr)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-text-action delete"
                          onClick={() => handleDeleteAddress(addr._id, addr.title)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="address-details">
                      <p className="addr-contact">
                        <strong>{addr.name}</strong> &bull; {addr.phone}
                      </p>
                      <p className="addr-location">
                        {addr.village}, {addr.district}, {addr.state} — {addr.pincode}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add / Edit Address Modal */}
      {isAddressModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddressModalOpen(false)}>
          <div className="address-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingAddressId ? 'Edit Farm Address' : 'Add New Farm Address'}</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsAddressModalOpen(false)}
              >
                &times;
              </button>
            </div>

            {addressError && <div className="checkout-error-banner">{addressError}</div>}

            <form onSubmit={handleAddressSubmit} className="modal-address-form">
              <div className="checkout-field-row">
                <div className="form-group">
                  <label htmlFor="addr-title">Address Label / Title</label>
                  <input
                    id="addr-title"
                    type="text"
                    placeholder="e.g. Main Farm, Orchard, Polyhouse"
                    value={addressForm.title}
                    onChange={(e) =>
                      setAddressForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="addr-acreage">Total Land Acreage</label>
                  <input
                    id="addr-acreage"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g. 4.5"
                    value={addressForm.acreage}
                    onChange={(e) =>
                      setAddressForm((prev) => ({ ...prev, acreage: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="checkout-field-row">
                <div className="form-group">
                  <label htmlFor="addr-name">Contact Person *</label>
                  <input
                    id="addr-name"
                    type="text"
                    placeholder="Full name"
                    value={addressForm.name}
                    onChange={(e) =>
                      setAddressForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className={addressErrors.name ? 'input-error' : ''}
                  />
                  {addressErrors.name && (
                    <span className="field-error">{addressErrors.name}</span>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="addr-phone">Phone Number *</label>
                  <input
                    id="addr-phone"
                    type="tel"
                    placeholder="10-digit mobile"
                    value={addressForm.phone}
                    onChange={(e) =>
                      setAddressForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className={addressErrors.phone ? 'input-error' : ''}
                  />
                  {addressErrors.phone && (
                    <span className="field-error">{addressErrors.phone}</span>
                  )}
                </div>
              </div>

              <div className="checkout-field-row">
                <div className="form-group">
                  <label htmlFor="addr-village">Village / Town *</label>
                  <input
                    id="addr-village"
                    type="text"
                    placeholder="e.g. Rampur"
                    value={addressForm.village}
                    onChange={(e) =>
                      setAddressForm((prev) => ({ ...prev, village: e.target.value }))
                    }
                    className={addressErrors.village ? 'input-error' : ''}
                  />
                  {addressErrors.village && (
                    <span className="field-error">{addressErrors.village}</span>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="addr-district">District *</label>
                  <input
                    id="addr-district"
                    type="text"
                    placeholder="e.g. Kangra"
                    value={addressForm.district}
                    onChange={(e) =>
                      setAddressForm((prev) => ({ ...prev, district: e.target.value }))
                    }
                    className={addressErrors.district ? 'input-error' : ''}
                  />
                  {addressErrors.district && (
                    <span className="field-error">{addressErrors.district}</span>
                  )}
                </div>
              </div>

              <div className="checkout-field-row">
                <div className="form-group">
                  <label htmlFor="addr-state">State *</label>
                  <input
                    id="addr-state"
                    type="text"
                    placeholder="e.g. Himachal Pradesh"
                    value={addressForm.state}
                    onChange={(e) =>
                      setAddressForm((prev) => ({ ...prev, state: e.target.value }))
                    }
                    className={addressErrors.state ? 'input-error' : ''}
                  />
                  {addressErrors.state && (
                    <span className="field-error">{addressErrors.state}</span>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="addr-pincode">Pincode (6 digits) *</label>
                  <input
                    id="addr-pincode"
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 176215"
                    value={addressForm.pincode}
                    onChange={(e) =>
                      setAddressForm((prev) => ({ ...prev, pincode: e.target.value }))
                    }
                    className={addressErrors.pincode ? 'input-error' : ''}
                  />
                  {addressErrors.pincode && (
                    <span className="field-error">{addressErrors.pincode}</span>
                  )}
                </div>
              </div>

              <div className="checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={addressForm.isDefault}
                    onChange={(e) =>
                      setAddressForm((prev) => ({ ...prev, isDefault: e.target.checked }))
                    }
                  />
                  <span>Make this my default farm delivery address</span>
                </label>
              </div>

              <div className="modal-actions-right">
                <button
                  type="button"
                  className="btnSecondary"
                  onClick={() => setIsAddressModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btnGreen" disabled={addressSaving}>
                  {addressSaving ? 'Saving…' : editingAddressId ? 'Update Address' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
