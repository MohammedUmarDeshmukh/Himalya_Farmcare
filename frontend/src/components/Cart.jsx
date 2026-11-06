import { useCart } from '../context/CartContext';
import { getProductImageUrl, money } from '../utils/formatters';

export default function Cart({
  cart: propsCart,
  onQuantity,
  onPrice,
  onRemove,
  onCheckout,
}) {
  const cartContext = useCart();
  const cart = propsCart || cartContext.cart || [];

  const handleQtyChange = (lineId, newQty) => {
    const parsed = parseInt(newQty, 10);
    const valid = isNaN(parsed) || parsed < 1 ? 1 : parsed;

    if (typeof onQuantity === 'function') {
      if (onQuantity.length >= 3) {
        onQuantity(lineId, 'qty', valid);
      } else {
        onQuantity(lineId, valid);
      }
    } else if (cartContext && cartContext.updateQuantity) {
      cartContext.updateQuantity(lineId, valid);
    }
  };

  const handleIncrement = (lineId, currentQty) => {
    const nextQty = (Number(currentQty) || 1) + 1;
    handleQtyChange(lineId, nextQty);
  };

  const handleDecrement = (lineId, currentQty) => {
    const nextQty = Math.max(1, (Number(currentQty) || 1) - 1);
    handleQtyChange(lineId, nextQty);
  };

  const handleRemove = (lineId) => {
    if (typeof onRemove === 'function') {
      onRemove(lineId);
    } else if (cartContext && cartContext.removeLine) {
      cartContext.removeLine(lineId);
    }
  };

  const handleCheckoutClick = () => {
    if (typeof onCheckout === 'function') {
      onCheckout();
    } else if (cartContext && cartContext.setShowCheckout) {
      cartContext.setShowCheckout(true);
    }
  };

  const subtotal = cart.reduce(
    (sum, line) => sum + (Number(line.qty) || 1) * (Number(line.unitPrice) || 0),
    0
  );
  const gst = subtotal * 0.05;
  const grandTotal = subtotal + gst;
  const totalItemCount = cart.reduce((sum, line) => sum + (Number(line.qty) || 1), 0);

  return (
    <div className="cart-card-container">
      {cart.length === 0 ? (
        <div className="cart-empty-view">
          <div className="cart-empty-icon">🛒</div>
          <h4>Your farm cart is empty</h4>
          <p>Add products from the catalogue or smart recommendation to build your order.</p>
        </div>
      ) : (
        <div className="cart-items-wrapper">
          {cart.map((line) => {
            const qty = Math.max(1, Number(line.qty) || 1);
            const unitPrice = Math.max(0, Number(line.unitPrice) || 0);
            const lineTotal = qty * unitPrice;
            const imgSrc =
              line.image ||
              (line.productId ? `/products/${line.productId}.jpg` : '/products/res.jpg');

            return (
              <div key={line.lineId} className="cart-item-row">
                {/* Left: Product Thumbnail & Meta */}
                <div className="cart-item-left">
                  <div className="cart-item-thumb">
                    <img
                      src={imgSrc}
                      alt={line.name}
                      onError={(e) => {
                        e.currentTarget.src = '/products/res.jpg';
                      }}
                    />
                  </div>
                  <div className="cart-item-details">
                    <h4 className="cart-item-title">{line.name}</h4>
                    <div className="cart-item-tags">
                      <span className="cart-size-badge">📦 {line.sizeMl} ml</span>
                      {line.crop && <span className="cart-crop-badge">{line.crop}</span>}
                    </div>
                    <div className="cart-item-unit-price">
                      Unit: <strong>{money(unitPrice)}</strong>
                    </div>
                  </div>
                </div>

                {/* Right: Quantity Controls, Line Total & Remove */}
                <div className="cart-item-right">
                  <div className="cart-qty-picker">
                    <button
                      type="button"
                      className="qty-stepper-btn dec"
                      onClick={() => handleDecrement(line.lineId, qty)}
                      disabled={qty <= 1}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      className="qty-val-input"
                      value={qty}
                      onChange={(e) => handleQtyChange(line.lineId, e.target.value)}
                      aria-label={`${line.name} quantity`}
                    />
                    <button
                      type="button"
                      className="qty-stepper-btn inc"
                      onClick={() => handleIncrement(line.lineId, qty)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  <div className="cart-item-total-col">
                    <span className="cart-total-lbl">Total</span>
                    <span className="cart-total-val">{money(lineTotal)}</span>
                  </div>

                  <button
                    type="button"
                    className="cart-delete-btn"
                    onClick={() => handleRemove(line.lineId)}
                    title="Remove item"
                    aria-label={`Remove ${line.name}`}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cart Totals & Summary */}
      <div className="cart-bill-summary">
        <div className="bill-row">
          <span>Subtotal ({totalItemCount} {totalItemCount === 1 ? 'item' : 'items'})</span>
          <span className="bill-amount">{money(subtotal)}</span>
        </div>
        <div className="bill-row">
          <span>GST (5%)</span>
          <span className="bill-amount">{money(gst)}</span>
        </div>
        <div className="bill-row grand-total-line">
          <span>Grand Total</span>
          <span className="grand-total-amount">{money(grandTotal)}</span>
        </div>

        {cart.length > 0 && onCheckout && (
          <div className="cart-checkout-box">
            <button
              type="button"
              className="btnGreen btn-checkout-action"
              onClick={handleCheckoutClick}
            >
              Proceed to Order 🚜
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
