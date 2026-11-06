import { useState } from 'react';
import { getProductImageUrl, money } from '../utils/formatters';
import { mlPerAcre } from '../utils/recommendation';

export default function ProductDetailsModal({ product, onClose, onAddToCart }) {
  if (!product) return null;

  const availableSizes = product.availableSizes?.length ? product.availableSizes : [100, 500];
  const [selectedSize, setSelectedSize] = useState(availableSizes[0] || 100);
  const [justAdded, setJustAdded] = useState(false);

  const dosage = product.dosagePerAcre || mlPerAcre(product.problem);
  const unit = product.dosageUnit || 'ml';

  const price =
    selectedSize === 500
      ? (product.p500 ?? product.prices?.find((p) => Number(p.size) === 500)?.amount ?? 0)
      : (product.p100 ?? product.prices?.find((p) => Number(p.size) === 100)?.amount ?? 0);

  const problemColorClass =
    product.problem === 'Insecticide'
      ? 'red'
      : product.problem === 'Fungicide'
      ? 'yellow'
      : product.problem === 'PGR'
      ? 'green'
      : 'purple';

  const handleAdd = () => {
    if (onAddToCart) {
      onAddToCart(product, selectedSize);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1800);
    }
  };

  return (
    <div
      className="modalBack"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal modal-product-details"
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${product.name}`}
      >
        <div className="modalHead">
          <div>
            <b>{product.name}</b>
            <span className={`tag ${problemColorClass}`} style={{ marginLeft: 8 }}>
              {product.problem}
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        <div className="modalBody modal-product-body">
          <div className="modal-product-layout">
            <div className="modal-product-img-wrap">
              <img
                src={getProductImageUrl(product)}
                alt={product.name}
                onError={(event) => {
                  event.currentTarget.src = '/products/res.jpg';
                }}
              />
              <div className="modal-stock-badge">
                {(product.stock ?? 50) > 0 ? (
                  <span className="stock-in">🟢 In Stock ({product.stock ?? 50} units)</span>
                ) : (
                  <span className="stock-out">🔴 Out of Stock</span>
                )}
              </div>
            </div>

            <div className="modal-product-specs">
              <div className="modal-spec-tags">
                <span className="spec-pill crop">🌾 Crop: {product.crop}</span>
                <span className="spec-pill method">💧 Method: {product.method || product.applicationMethod}</span>
                <span className="spec-pill seq">🔄 Sequence: {product.seq || product.sequence || 1}</span>
              </div>

              {product.brand && (
                <div className="modal-brand-line">
                  Brand / Manufacturer: <strong>{product.brand || product.company}</strong>
                </div>
              )}

              <div className="modal-dosage-box">
                <div className="dosage-label">Verified Application Dosage</div>
                <div className="dosage-value">
                  💊 <strong>{dosage} {unit}</strong> per Acre
                </div>
                <small className="dosage-hint">
                  Follow recommended dilution and spray timing (early morning or late evening).
                </small>
              </div>

              <div className="modal-price-box">
                <div className="size-selector-label">Select Package Size:</div>
                <div className="size-selector-options">
                  {availableSizes.map((size) => {
                    const sizePrice =
                      size === 500
                        ? (product.p500 ?? product.prices?.find((p) => Number(p.size) === 500)?.amount ?? 0)
                        : (product.p100 ?? product.prices?.find((p) => Number(p.size) === 100)?.amount ?? 0);
                    return (
                      <button
                        key={size}
                        type="button"
                        className={`size-btn ${selectedSize === size ? 'active' : ''}`}
                        onClick={() => setSelectedSize(size)}
                      >
                        <span className="size-ml">{size} ml</span>
                        <span className="size-price">{money(sizePrice)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {product.description && (
                <div className="modal-description">
                  <strong>Description & Use Case:</strong>
                  <p>{product.description}</p>
                </div>
              )}

              {onAddToCart && (
                <div className="modal-actions-footer">
                  <div className="current-price-display">
                    <span className="label">Price:</span>
                    <span className="amount">{money(price)}</span>
                    <span className="gst-note">+ 5% GST</span>
                  </div>
                  <button
                    type="button"
                    className={`btnGreen btn-modal-add ${justAdded ? 'added' : ''}`}
                    onClick={handleAdd}
                    disabled={justAdded}
                  >
                    {justAdded ? 'Added to Cart ✓' : `Add ${selectedSize}ml to Cart 🛒`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
