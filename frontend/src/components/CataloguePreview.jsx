import { Link } from 'react-router-dom';
import { getProductImageUrl, money } from '../utils/formatters';

export default function CataloguePreview({ products }) {
  return (
    <div className="preview-grid">
      {products.map((product) => (
        <article className="preview-card" key={product.id}>
          <img
            src={getProductImageUrl(product)}
            alt={product.name}
            onError={(e) => {
              e.currentTarget.src = '/products/res.jpg';
            }}
          />
          <div>
            <span className="eyebrow">
              {product.crop} · {product.problem}
            </span>
            <h3>{product.name}</h3>
            <p>
              {product.method} application · Sequence {product.seq}
            </p>
            <strong>From {money(product.p100)}</strong>
          </div>
        </article>
      ))}
    </div>
  );
}
