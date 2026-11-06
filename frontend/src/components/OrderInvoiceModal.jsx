import { money } from '../utils/formatters';

export default function OrderInvoiceModal({ order, isOpen, onClose }) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const invoiceNumber = `INV-${order.orderNumber}`;
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="modal-backdrop invoice-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="invoice-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Controls - Hidden during print */}
        <div className="invoice-modal-header no-print">
          <div className="invoice-header-title">
            <h3>Official Tax Invoice Preview</h3>
            <span>{order.orderNumber}</span>
          </div>
          <div className="invoice-header-actions">
            <button type="button" className="btnGreen btn-print-pdf" onClick={handlePrint}>
              Download / Print PDF 📄
            </button>
            <button type="button" className="close-btn" onClick={onClose} aria-label="Close invoice">
              &times;
            </button>
          </div>
        </div>

        {/* Printable A4 Invoice Sheet */}
        <div className="invoice-paper" id="invoicePaper">
          {/* Header */}
          <div className="invoice-top-banner">
            <div className="invoice-brand">
              <h1 className="brand-title">Himalaya FarmCare</h1>
              <p className="brand-tagline">"Serving Your Farm Is Our Duty"</p>
              <div className="company-details">
                <p>Smart Agriculture Product Recommendation & Supply System</p>
                <p>Kangra Valley, Himachal Pradesh — 176215</p>
                <p>Email: support@himalayafarmcare.com | Helpline: +91 1800-FARM-CARE</p>
              </div>
            </div>

            <div className="invoice-meta-box">
              <div className="tax-invoice-pill">TAX INVOICE</div>
              <div className="invoice-meta-row">
                <span>Invoice No:</span>
                <strong>{invoiceNumber}</strong>
              </div>
              <div className="invoice-meta-row">
                <span>Order No:</span>
                <strong>{order.orderNumber}</strong>
              </div>
              <div className="invoice-meta-row">
                <span>Date:</span>
                <span>{orderDate}</span>
              </div>
              <div className="invoice-meta-row">
                <span>Payment Mode:</span>
                <strong>{order.paymentMethod || 'Cash on Delivery'}</strong>
              </div>
              <div className="invoice-meta-row">
                <span>Status:</span>
                <strong className={`status-text-${order.orderStatus}`}>
                  {order.orderStatus?.toUpperCase()}
                </strong>
              </div>
            </div>
          </div>

          <hr className="invoice-divider" />

          {/* Customer & Shipping Details */}
          <div className="invoice-parties-grid">
            <div className="party-card billed-to">
              <h4>Billed & Delivered To:</h4>
              <p className="customer-name">
                <strong>{order.shippingAddress?.name || order.farmer?.name || 'Valued Farmer'}</strong>
              </p>
              <p className="customer-phone">
                Phone: {order.shippingAddress?.phone || order.farmer?.phone || 'N/A'}
              </p>
              <p className="customer-addr">
                Village / Town: {order.shippingAddress?.village || 'N/A'}
              </p>
              <p className="customer-addr">
                District: {order.shippingAddress?.district || 'N/A'}, {order.shippingAddress?.state || ''}
              </p>
              <p className="customer-addr">
                PIN: {order.shippingAddress?.pincode || 'N/A'}
              </p>
              {order.notes && <p className="customer-notes">Delivery Note: "{order.notes}"</p>}
            </div>

            <div className="party-card order-specs">
              <h4>Order Specifications:</h4>
              <p><strong>Fulfillment Method:</strong> Direct Farm Delivery</p>
              <p><strong>Total Items:</strong> {order.items?.length || 0} product line(s)</p>
              <p>
                <strong>Total Bottle Units:</strong>{' '}
                {order.items?.reduce((sum, item) => sum + item.qty, 0) || 0} bottle(s)
              </p>
              <p><strong>Payment Status:</strong> {order.paymentStatus || 'pending'}</p>
            </div>
          </div>

          {/* Items Table with actual product dosage info */}
          <table className="invoice-items-table">
            <thead>
              <tr>
                <th className="sno">#</th>
                <th>Product Description</th>
                <th>Crop & Problem</th>
                <th>Standard Dosage</th>
                <th className="num">Size</th>
                <th className="num">Qty</th>
                <th className="num">Rate</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item, idx) => (
                <tr key={`inv-item-${idx}`}>
                  <td className="sno">{idx + 1}</td>
                  <td>
                    <strong className="item-name">{item.name}</strong>
                  </td>
                  <td>
                    {item.crop || 'General'} &bull; {item.problem || 'Treatment'}
                  </td>
                  <td>
                    {item.dosagePerAcre ? (
                      <span className="dosage-badge">
                        {item.dosagePerAcre} {item.dosageUnit || 'ml'}/Acre
                      </span>
                    ) : (
                      <span className="dosage-badge na">—</span>
                    )}
                  </td>
                  <td className="num">{item.sizeMl} ml</td>
                  <td className="num">{item.qty}</td>
                  <td className="num">{money(item.unitPrice)}</td>
                  <td className="num">{money(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Section */}
          <div className="invoice-bottom-grid">
            <div className="invoice-instructions">
              <h4>Farmer Advisory & Application Instructions:</h4>
              <ul>
                <li>Follow the recommended dosage per acre accurately. Do not overdose.</li>
                <li>Spray during calm weather (early morning or late evening). Avoid direct harsh sunlight.</li>
                <li>Wear protective gear (gloves/mask) during mixing and application.</li>
                <li>Inspect batch and seal upon delivery before payment.</li>
              </ul>
            </div>

            <div className="invoice-calculations">
              <div className="calc-row">
                <span>Subtotal:</span>
                <span>{money(order.subtotal)}</span>
              </div>
              <div className="calc-row">
                <span>Integrated GST (5%):</span>
                <span>{money(order.taxAmount)}</span>
              </div>
              <div className="calc-row grand-total">
                <span>Total Amount Payable:</span>
                <strong>{money(order.totalAmount)}</strong>
              </div>
              <div className="amount-words-note">
                Amount payable in Indian Rupees (INR) inclusive of all taxes.
              </div>
            </div>
          </div>

          {/* Signatory Footer */}
          <div className="invoice-footer-signatory">
            <div className="sign-box">
              <p>This is a computer-generated official tax invoice from Himalaya FarmCare.</p>
              <p>No physical signature is required.</p>
            </div>
            <div className="auth-stamp">
              <div className="stamp-seal">HIMALAYA FARMCARE<br />VERIFIED DISPATCH</div>
              <span>Authorized Signatory</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
