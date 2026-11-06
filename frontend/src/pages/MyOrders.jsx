import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import OrderInvoiceModal from '../components/OrderInvoiceModal';
import OrderTrackingTimeline from '../components/OrderTrackingTimeline';
import { useAuth } from '../context/AuthContext';
import { cancelMyOrder, getMyOrders } from '../services/orderService';
import { money } from '../utils/formatters';

export default function MyOrders() {
  const { user, isAuthenticated, token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cancellingId, setCancellingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/my-orders' } } });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const loadOrders = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError('');
    try {
      const query = statusFilter !== 'all' ? { status: statusFilter } : {};
      const result = await getMyOrders(query, token);
      setOrders(result.data || []);
    } catch (err) {
      setError(err.message || 'Unable to retrieve your orders.');
    } finally {
      setIsLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
    }
  }, [isAuthenticated, loadOrders]);

  const handleCancelOrder = async (orderId, orderNumber) => {
    if (!window.confirm(`Are you sure you want to cancel order ${orderNumber}? Stock will be returned to inventory.`)) {
      return;
    }

    setCancellingId(orderId);
    setError('');
    setSuccessMessage('');

    try {
      await cancelMyOrder(orderId, token);
      setSuccessMessage(`Order ${orderNumber} was cancelled successfully.`);
      await loadOrders();
    } catch (err) {
      setError(err.message || 'Unable to cancel order.');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'confirmed':
        return 'badge-confirmed';
      case 'shipped':
        return 'badge-shipped';
      case 'delivered':
        return 'badge-delivered';
      case 'cancelled':
        return 'badge-cancelled';
      default:
        return 'badge-pending';
    }
  };

  return (
    <div className="page-shell">
      <Navbar />

      <main className="orders-page-main wrap">
        <div className="orders-header">
          <div>
            <h1>My Farm Orders 🚜</h1>
            <p className="orders-subtitle">
              Welcome back, <strong>{user?.name || 'Farmer'}</strong>. Track your farm care supplies and delivery status.
            </p>
          </div>
          <Link to="/recommendation" className="btnGreen">
            + New Recommendation Order
          </Link>
        </div>

        {/* Status Filter Tabs */}
        <div className="orders-filter-bar">
          {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((st) => (
            <button
              key={st}
              type="button"
              className={`filter-tab ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>

        {successMessage && <div className="notice-banner success">{successMessage}</div>}
        {error && <div className="notice-banner error">{error}</div>}

        {isLoading ? (
          <div className="orders-loading" role="status">
            <div className="admin-spinner" />
            <p>Loading your orders…</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="orders-empty-state">
            <div className="empty-icon">📦</div>
            <h3>No orders found</h3>
            <p>
              {statusFilter !== 'all'
                ? `You have no ${statusFilter} orders at the moment.`
                : "You haven't placed any farm supply orders yet."}
            </p>
            <div className="empty-actions">
              <Link to="/recommendation" className="btnGreen">
                Get Smart Recommendations
              </Link>
              <Link to="/products" className="btnSecondary">
                Browse Product Catalogue
              </Link>
            </div>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order._id} className="order-card">
                <div className="order-card-header">
                  <div className="order-id-group">
                    <span className="order-number-title">{order.orderNumber}</span>
                    <span className="order-date-text">
                      Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="order-header-right">
                    <span className={`status-pill ${getStatusBadgeClass(order.orderStatus)}`}>
                      {order.orderStatus.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="order-card-body">
                  {/* Order Tracking Progress Timeline */}
                  <OrderTrackingTimeline
                    orderStatus={order.orderStatus}
                    createdAt={order.createdAt}
                    updatedAt={order.updatedAt}
                  />

                  {/* Items List */}
                  <div className="order-items-table-wrap">
                    <table className="order-items-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Crop & Problem</th>
                          <th>Bottle Size</th>
                          <th className="num">Qty</th>
                          <th className="num">Unit Price</th>
                          <th className="num">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item, idx) => (
                          <tr key={`${order._id}-item-${idx}`}>
                            <td>
                              <strong>{item.name}</strong>
                              {item.dosagePerAcre ? (
                                <div className="item-dosage-tag">
                                  Standard dose: {item.dosagePerAcre} {item.dosageUnit || 'ml'}/Acre
                                </div>
                              ) : null}
                            </td>
                            <td>
                              <span className="crop-pill">{item.crop || 'General'}</span>{' '}
                              <span className="problem-pill">{item.problem || 'Treatment'}</span>
                            </td>
                            <td>{item.sizeMl} ml</td>
                            <td className="num">{item.qty}</td>
                            <td className="num">{money(item.unitPrice)}</td>
                            <td className="num">{money(item.lineTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary & Shipping details */}
                  <div className="order-footer-grid">
                    <div className="order-delivery-box">
                      <h4>📍 Farm Delivery Address</h4>
                      <p>
                        <strong>{order.shippingAddress.name}</strong> ({order.shippingAddress.phone})
                      </p>
                      <p>
                        {order.shippingAddress.village}, {order.shippingAddress.district}
                      </p>
                      <p>
                        {order.shippingAddress.state} — {order.shippingAddress.pincode}
                      </p>
                      {order.notes && <p className="order-notes-text">Note: "{order.notes}"</p>}
                    </div>

                    <div className="order-payment-box">
                      <h4>💳 Payment & Totals</h4>
                      <div className="cost-line">
                        <span>Payment Method:</span>
                        <strong>{order.paymentMethod} (COD)</strong>
                      </div>
                      <div className="cost-line">
                        <span>Subtotal:</span>
                        <span>{money(order.subtotal)}</span>
                      </div>
                      <div className="cost-line">
                        <span>GST (5%):</span>
                        <span>{money(order.taxAmount)}</span>
                      </div>
                      <div className="cost-line grand">
                        <span>Grand Total:</span>
                        <strong>{money(order.totalAmount)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="order-card-actions">
                  <button
                    type="button"
                    className="btnGreen btn-sm-action"
                    onClick={() => setInvoiceOrder(order)}
                    title="Download official tax invoice PDF"
                  >
                    Download Invoice PDF 📄
                  </button>
                  {(order.orderStatus === 'pending' || order.orderStatus === 'confirmed') && (
                    <button
                      type="button"
                      className="btnCancelOrder"
                      disabled={cancellingId === order._id}
                      onClick={() => handleCancelOrder(order._id, order.orderNumber)}
                    >
                      {cancellingId === order._id ? 'Cancelling…' : 'Cancel Order'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btnSecondary"
                    onClick={() => window.print()}
                    title="Print receipt"
                  >
                    Print Summary 🖨️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <OrderInvoiceModal
        order={invoiceOrder}
        isOpen={Boolean(invoiceOrder)}
        onClose={() => setInvoiceOrder(null)}
      />

      <Footer />
    </div>
  );
}
