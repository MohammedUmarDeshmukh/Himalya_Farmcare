import { useCallback, useEffect, useState } from 'react';
import OrderInvoiceModal from '../../components/OrderInvoiceModal';
import OrderTrackingTimeline from '../../components/OrderTrackingTimeline';
import { useAuth } from '../../context/AuthContext';
import {
  adminExportOrdersCSV,
  adminUpdateOrderStatus,
  getAdminOrders,
} from '../../services/orderService';
import { money } from '../../utils/formatters';

export default function AdminOrders() {
  const { token } = useAuth();

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);

  // Selected Order for Details & Invoice Modals
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  const loadOrders = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setError('');
      try {
        const query = {
          page,
          limit: 15,
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
        };

        const result = await getAdminOrders(query, token);
        setOrders(result.data || []);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      } catch (err) {
        setError(err.message || 'Unable to load orders.');
      } finally {
        setIsLoading(false);
      }
    },
    [token, statusFilter, search],
  );

  useEffect(() => {
    loadOrders(1);
  }, [loadOrders]);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    setError('');
    setActionSuccess('');

    try {
      await adminUpdateOrderStatus(orderId, newStatus, token);
      setActionSuccess(`Order status updated to "${newStatus}".`);
      await loadOrders(pagination.page);
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, orderStatus: newStatus } : null));
      }
    } catch (err) {
      setError(err.message || 'Failed to update order status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    setError('');
    setActionSuccess('');
    try {
      const query = {
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
      };
      await adminExportOrdersCSV(query, token);
      setActionSuccess('Orders CSV exported and downloaded successfully.');
    } catch (err) {
      setError(err.message || 'Failed to export orders CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status) => {
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
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h1>Order Management & Fulfillment 🛒</h1>
          <p className="admin-page-subtitle">
            Review customer orders, verify delivery addresses, manage statuses, and track inventory.
          </p>
        </div>
        <div className="header-action-buttons">
          <button
            type="button"
            className="btnSecondary btn-export-csv"
            onClick={handleExportCSV}
            disabled={isExporting}
            title="Download CSV export for accounting and logistics"
          >
            {isExporting ? 'Exporting CSV…' : 'Export Filtered CSV 📥'}
          </button>
          <button
            type="button"
            className="btnGreen"
            onClick={() => loadOrders(pagination.page)}
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing…' : 'Refresh Orders 🔄'}
          </button>
        </div>
      </div>

      {actionSuccess && <div className="notice-banner success">{actionSuccess}</div>}
      {error && <div className="notice-banner error">{error}</div>}

      {/* Filter and Search Bar */}
      <div className="admin-filter-card">
        <div className="search-field">
          <input
            type="text"
            placeholder="Search by Order #, Farmer name, Phone, or Village…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') loadOrders(1);
            }}
          />
        </div>

        <div className="filter-dropdown">
          <label htmlFor="admin-order-status-filter">Status:</label>
          <select
            id="admin-order-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="shipped">Shipped</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <button
          type="button"
          className="btnSecondary"
          onClick={() => {
            setSearch('');
            setStatusFilter('all');
          }}
        >
          Reset Filters
        </button>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <div className="admin-table-loading" role="status">
          <div className="admin-spinner" />
          <p>Loading orders from database…</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="admin-empty-card">
          <div className="empty-icon">📦</div>
          <h3>No orders found</h3>
          <p>No orders matched your search criteria or no orders have been placed yet.</p>
        </div>
      ) : (
        <div className="admin-table-card">
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Delivery Location</th>
                  <th>Items</th>
                  <th className="num">Total Amount</th>
                  <th>Status</th>
                  <th>Update Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <strong className="order-num-text">{order.orderNumber}</strong>
                    </td>
                    <td>
                      <span className="order-date-cell">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td>
                      <div className="user-cell">
                        <strong>{order.shippingAddress?.name || order.farmer?.name || 'Customer'}</strong>
                        <span className="user-email-cell">{order.shippingAddress?.phone || order.farmer?.phone}</span>
                      </div>
                    </td>
                    <td>
                      <span className="village-badge">
                        {order.shippingAddress?.village}, {order.shippingAddress?.district}
                      </span>
                    </td>
                    <td>
                      <span className="items-count-badge">
                        {order.items?.length || 0} product(s)
                      </span>
                    </td>
                    <td className="num">
                      <strong>{money(order.totalAmount)}</strong>
                    </td>
                    <td>
                      <span className={`status-pill ${getStatusBadge(order.orderStatus)}`}>
                        {order.orderStatus.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <select
                        className="admin-status-select"
                        value={order.orderStatus}
                        disabled={updatingId === order._id || order.orderStatus === 'cancelled'}
                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="shipped">Shipped</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td>
                      <div className="table-actions-cluster">
                        <button
                          type="button"
                          className="btn-details-sm"
                          onClick={() => setSelectedOrder(order)}
                          title="View order details"
                        >
                          Details 👁️
                        </button>
                        <button
                          type="button"
                          className="btn-details-sm"
                          onClick={() => setInvoiceOrder(order)}
                          title="View and download tax invoice PDF"
                        >
                          Invoice 📄
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="admin-pagination">
              <button
                type="button"
                className="btnSecondary"
                disabled={pagination.page <= 1}
                onClick={() => loadOrders(pagination.page - 1)}
              >
                &larr; Previous
              </button>
              <span className="page-indicator">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} orders total)
              </span>
              <button
                type="button"
                className="btnSecondary"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadOrders(pagination.page + 1)}
              >
                Next &rarr;
              </button>
            </div>
          )}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-backdrop" onClick={() => setSelectedOrder(null)} role="dialog" aria-modal="true">
          <div className="admin-order-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order Details: {selectedOrder.orderNumber}</h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <div className="modal-body-scroll">
              {/* Order Status Progress Timeline */}
              <OrderTrackingTimeline
                orderStatus={selectedOrder.orderStatus}
                createdAt={selectedOrder.createdAt}
                updatedAt={selectedOrder.updatedAt}
              />

              <div className="order-details-meta-bar">
                <div>
                  <span className="meta-label">Placed On:</span>
                  <strong>
                    {new Date(selectedOrder.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </strong>
                </div>
                <div>
                  <span className="meta-label">Current Status:</span>
                  <span className={`status-pill ${getStatusBadge(selectedOrder.orderStatus)}`}>
                    {selectedOrder.orderStatus.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="meta-label">Payment:</span>
                  <strong>{selectedOrder.paymentMethod} ({selectedOrder.paymentStatus})</strong>
                </div>
              </div>

              {/* Farmer and Delivery Info */}
              <div className="order-details-grid">
                <div className="info-block">
                  <h4>👨‍🌾 Farmer / Customer Details</h4>
                  <p><strong>Name:</strong> {selectedOrder.shippingAddress?.name}</p>
                  <p><strong>Phone:</strong> {selectedOrder.shippingAddress?.phone}</p>
                  <p><strong>Registered Account:</strong> {selectedOrder.farmer?.email || 'N/A'}</p>
                </div>

                <div className="info-block">
                  <h4>📍 Shipping Address</h4>
                  <p><strong>Village / Town:</strong> {selectedOrder.shippingAddress?.village}</p>
                  <p><strong>District:</strong> {selectedOrder.shippingAddress?.district}</p>
                  <p><strong>State & PIN:</strong> {selectedOrder.shippingAddress?.state} - {selectedOrder.shippingAddress?.pincode}</p>
                  {selectedOrder.notes && (
                    <p className="order-notes-highlight"><strong>Notes:</strong> {selectedOrder.notes}</p>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="modal-items-section">
                <h4>📦 Ordered Items Breakdown</h4>
                <table className="order-items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Target & Crop</th>
                      <th>Bottle Size</th>
                      <th className="num">Qty</th>
                      <th className="num">Unit Price</th>
                      <th className="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.map((item, idx) => (
                      <tr key={`modal-item-${idx}`}>
                        <td>
                          <strong>{item.name}</strong>
                          {item.dosagePerAcre ? (
                            <div className="item-dosage-tag">
                              Dosage: {item.dosagePerAcre} {item.dosageUnit || 'ml'}/Acre
                            </div>
                          ) : null}
                        </td>
                        <td>
                          {item.crop} • {item.problem}
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

              {/* Financial Totals */}
              <div className="modal-totals-bar">
                <div className="total-line">
                  <span>Subtotal:</span>
                  <span>{money(selectedOrder.subtotal)}</span>
                </div>
                <div className="total-line">
                  <span>GST (5%):</span>
                  <span>{money(selectedOrder.taxAmount)}</span>
                </div>
                <div className="total-line grand">
                  <span>Grand Total:</span>
                  <strong>{money(selectedOrder.totalAmount)}</strong>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <div className="modal-status-updater">
                <label htmlFor="modal-status-select">Change Status:</label>
                <select
                  id="modal-status-select"
                  value={selectedOrder.orderStatus}
                  disabled={updatingId === selectedOrder._id || selectedOrder.orderStatus === 'cancelled'}
                  onChange={(e) => handleStatusChange(selectedOrder._id, e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="btnGreen btn-sm-action"
                  onClick={() => setInvoiceOrder(selectedOrder)}
                >
                  Download Invoice PDF 📄
                </button>
                <button
                  type="button"
                  className="btnSecondary"
                  onClick={() => setSelectedOrder(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Tax Invoice Modal */}
      <OrderInvoiceModal
        order={invoiceOrder}
        isOpen={Boolean(invoiceOrder)}
        onClose={() => setInvoiceOrder(null)}
      />
    </div>
  );
}
