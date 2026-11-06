import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createOrder } from '../services/orderService';
import { money } from '../utils/formatters';

export default function CheckoutModal({ isOpen, onClose, cart, onOrderPlaced }) {
  const { user, isAuthenticated, token } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    village: '',
    district: '',
    state: '',
    pincode: '',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);

  // Pre-fill user information or default saved address when available
  useEffect(() => {
    if (user) {
      const defaultAddr = user.savedAddresses?.find((a) => a.isDefault) || user.savedAddresses?.[0];
      if (defaultAddr) {
        setFormData({
          name: defaultAddr.name || user.name || '',
          phone: defaultAddr.phone || user.phone || '',
          village: defaultAddr.village || '',
          district: defaultAddr.district || '',
          state: defaultAddr.state || '',
          pincode: defaultAddr.pincode || '',
          notes: '',
        });
      } else {
        setFormData((prev) => ({
          ...prev,
          name: prev.name || user.name || '',
          phone: prev.phone || user.phone || '',
        }));
      }
    }
  }, [user]);

  const handleSelectSavedAddress = (addressId) => {
    if (!addressId || addressId === 'custom') {
      return;
    }
    const selected = user?.savedAddresses?.find((a) => a._id === addressId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        name: selected.name || prev.name,
        phone: selected.phone || prev.phone,
        village: selected.village || '',
        district: selected.district || '',
        state: selected.state || '',
        pincode: selected.pincode || '',
      }));
      setFormErrors({});
    }
  };

  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const gst = subtotal * 0.05;
  const grandTotal = subtotal + gst;

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
    if (serverError) setServerError('');
  };

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Full name is required.';
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required.';
    } else if (!/^\+?[\d\s-]{10,15}$/.test(formData.phone.trim())) {
      errors.phone = 'Enter a valid 10-digit phone number.';
    }

    if (!formData.village.trim()) errors.village = 'Village / Town is required.';
    if (!formData.district.trim()) errors.district = 'District is required.';
    if (!formData.state.trim()) errors.state = 'State is required.';
    if (!formData.pincode.trim()) {
      errors.pincode = 'Pincode is required.';
    } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
      errors.pincode = 'Pincode must be exactly 6 digits.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setServerError('');

    try {
      const orderPayload = {
        items: cart.map((line) => ({
          productId: line.productId,
          sizeMl: line.sizeMl,
          qty: line.qty,
        })),
        shippingAddress: {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          village: formData.village.trim(),
          district: formData.district.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode.trim(),
        },
        paymentMethod: 'Cash on Delivery',
        notes: formData.notes.trim(),
      };

      const result = await createOrder(orderPayload, token);
      setPlacedOrder(result.order);
      if (onOrderPlaced) onOrderPlaced(result.order);
    } catch (err) {
      setServerError(err.message || 'Unable to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    setPlacedOrder(null);
    onClose();
    navigate('/my-orders');
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="checkout-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{placedOrder ? 'Order Confirmation' : 'Checkout & Confirm Order'}</h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        {!isAuthenticated ? (
          <div className="checkout-auth-prompt">
            <div className="auth-prompt-icon">👨‍🌾</div>
            <h3>Farmer Account Required</h3>
            <p>Please log in or register your farmer account to place your order and track delivery.</p>
            <div className="auth-prompt-actions">
              <Link to="/login" className="btnGreen" onClick={onClose}>
                Log In to Continue
              </Link>
              <Link to="/register" className="btnSecondary" onClick={onClose}>
                Register New Account
              </Link>
            </div>
          </div>
        ) : placedOrder ? (
          <div className="order-success-view">
            <div className="order-success-badge">✅</div>
            <h3>Order Placed Successfully!</h3>
            <p className="order-number-display">
              Order ID: <strong>{placedOrder.orderNumber}</strong>
            </p>
            <p className="order-hint">
              Thank you for ordering with <strong>Himalaya FarmCare</strong>. Your farm supplies will be dispatched soon.
            </p>

            <div className="order-summary-box">
              <div className="summary-row">
                <span>Payment Method:</span>
                <strong>{placedOrder.paymentMethod} (COD)</strong>
              </div>
              <div className="summary-row">
                <span>Items:</span>
                <strong>{placedOrder.items.length} product(s)</strong>
              </div>
              <div className="summary-row">
                <span>Delivery To:</span>
                <span>
                  {placedOrder.shippingAddress.name}, {placedOrder.shippingAddress.village},{' '}
                  {placedOrder.shippingAddress.district} - {placedOrder.shippingAddress.pincode}
                </span>
              </div>
              <div className="summary-row total">
                <span>Total Amount to Pay:</span>
                <strong>{money(placedOrder.totalAmount)}</strong>
              </div>
            </div>

            <div className="order-success-actions">
              <button type="button" className="btnGreen" onClick={handleFinish}>
                View in My Orders 📦
              </button>
              <button
                type="button"
                className="btnSecondary"
                onClick={() => {
                  setPlacedOrder(null);
                  onClose();
                }}
              >
                Continue Shopping
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="checkout-form">
            {serverError && <div className="checkout-error-banner">{serverError}</div>}

            <div className="checkout-grid">
              {/* Left Column: Shipping Information */}
              <div className="checkout-section">
                <h3>1. Farm Delivery Address</h3>

                {user?.savedAddresses?.length > 0 && (
                  <div className="saved-address-selector-box">
                    <label htmlFor="select-saved-addr">Select from Saved Farm Addresses:</label>
                    <select
                      id="select-saved-addr"
                      className="saved-addr-dropdown"
                      onChange={(e) => handleSelectSavedAddress(e.target.value)}
                      defaultValue={user.savedAddresses.find((a) => a.isDefault)?._id || ''}
                    >
                      <option value="">-- Choose a Saved Farm Location --</option>
                      {user.savedAddresses.map((addr) => (
                        <option key={addr._id} value={addr._id}>
                          {addr.title} {addr.isDefault ? '⭐ (Default)' : ''} — {addr.village}, {addr.district} ({addr.pincode})
                        </option>
                      ))}
                      <option value="custom">✏️ Enter Custom Address</option>
                    </select>
                  </div>
                )}

                <div className="checkout-field-row">
                  <div className="form-group">
                    <label htmlFor="checkout-name">Full Name *</label>
                    <input
                      id="checkout-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className={formErrors.name ? 'input-error' : ''}
                    />
                    {formErrors.name && <span className="field-error">{formErrors.name}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="checkout-phone">Phone Number *</label>
                    <input
                      id="checkout-phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="10-digit mobile number"
                      className={formErrors.phone ? 'input-error' : ''}
                    />
                    {formErrors.phone && <span className="field-error">{formErrors.phone}</span>}
                  </div>
                </div>

                <div className="checkout-field-row">
                  <div className="form-group">
                    <label htmlFor="checkout-village">Village / Town *</label>
                    <input
                      id="checkout-village"
                      type="text"
                      value={formData.village}
                      onChange={(e) => handleInputChange('village', e.target.value)}
                      placeholder="e.g. Rampur"
                      className={formErrors.village ? 'input-error' : ''}
                    />
                    {formErrors.village && <span className="field-error">{formErrors.village}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="checkout-district">District *</label>
                    <input
                      id="checkout-district"
                      type="text"
                      value={formData.district}
                      onChange={(e) => handleInputChange('district', e.target.value)}
                      placeholder="e.g. Kangra"
                      className={formErrors.district ? 'input-error' : ''}
                    />
                    {formErrors.district && <span className="field-error">{formErrors.district}</span>}
                  </div>
                </div>

                <div className="checkout-field-row">
                  <div className="form-group">
                    <label htmlFor="checkout-state">State *</label>
                    <input
                      id="checkout-state"
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="e.g. Himachal Pradesh"
                      className={formErrors.state ? 'input-error' : ''}
                    />
                    {formErrors.state && <span className="field-error">{formErrors.state}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="checkout-pincode">Pincode (6 digits) *</label>
                    <input
                      id="checkout-pincode"
                      type="text"
                      maxLength={6}
                      value={formData.pincode}
                      onChange={(e) => handleInputChange('pincode', e.target.value)}
                      placeholder="e.g. 176215"
                      className={formErrors.pincode ? 'input-error' : ''}
                    />
                    {formErrors.pincode && <span className="field-error">{formErrors.pincode}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="checkout-notes">Delivery Instructions (Optional)</label>
                  <textarea
                    id="checkout-notes"
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Near primary school, farm gate landmark, etc."
                  />
                </div>
              </div>

              {/* Right Column: Payment & Order Summary */}
              <div className="checkout-section summary-pane">
                <h3>2. Payment Method</h3>
                <div className="payment-method-card selected">
                  <div className="radio-dot selected" />
                  <div className="payment-details">
                    <strong>Cash on Delivery (COD) 💵</strong>
                    <p>Pay cash to the delivery agent when your supplies arrive at your farm.</p>
                  </div>
                </div>

                <h3>3. Order Items ({cart.length})</h3>
                <div className="checkout-items-list">
                  {cart.map((item) => (
                    <div key={item.lineId} className="checkout-item-line">
                      <div className="item-meta">
                        <span className="item-title">{item.name}</span>
                        <span className="item-sub">
                          {item.sizeMl} ml &times; {item.qty}
                        </span>
                      </div>
                      <span className="item-price">{money(item.qty * item.unitPrice)}</span>
                    </div>
                  ))}
                </div>

                <div className="checkout-totals">
                  <div className="total-row">
                    <span>Subtotal:</span>
                    <span>{money(subtotal)}</span>
                  </div>
                  <div className="total-row">
                    <span>GST (5%):</span>
                    <span>{money(gst)}</span>
                  </div>
                  <div className="total-row grand">
                    <span>Grand Total:</span>
                    <span>{money(grandTotal)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btnGreen submit-order-btn"
                  disabled={isSubmitting || cart.length === 0}
                >
                  {isSubmitting ? 'Processing Order…' : `Confirm & Place Order (${money(grandTotal)})`}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
