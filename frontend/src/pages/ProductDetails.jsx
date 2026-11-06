import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ProductDetailsModal from '../components/ProductDetailsModal';
import { useCart } from '../context/CartContext';
import { getProductById } from '../services/productService';

export default function ProductDetails() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProduct = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setProduct(await getProductById(productId));
    } catch (requestError) {
      setProduct(null);
      setError(requestError.message || 'Unable to load this product.');
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  if (isLoading || error) {
    return (
      <main className="placeholder-page">
        <span className="eyebrow">PRODUCT DETAILS</span>
        <h1>{isLoading ? 'Loading product…' : 'Product unavailable'}</h1>
        {error && (
          <>
            <p>{error}</p>
            <button type="button" className="button primary" onClick={loadProduct}>
              Retry
            </button>
          </>
        )}
      </main>
    );
  }

  return (
    <ProductDetailsModal
      product={product}
      onClose={() => navigate('/products')}
      onAddToCart={addToCart}
    />
  );
}
