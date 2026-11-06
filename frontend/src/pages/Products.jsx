import { useCallback, useEffect, useMemo, useState } from 'react';
import Cart from '../components/Cart';
import CheckoutModal from '../components/CheckoutModal';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import ProductDetailsModal from '../components/ProductDetailsModal';
import { useCart } from '../context/CartContext';
import { getApplicationMethods } from '../services/applicationMethodService';
import { getCrops } from '../services/cropService';
import { getProblems } from '../services/problemService';
import { getProducts } from '../services/productService';
import { sortCropNames } from '../utils/cropOrder';
import { getProductImageUrl, money } from '../utils/formatters';
import { mlPerAcre } from '../utils/recommendation';
import './products.css';

const initialFilters = {
  search: '',
  crop: 'All',
  problem: 'All',
  method: 'All',
  seq: 'All',
};

export default function Products() {
  const { cart, addToCart, changeLine, removeLine, clearCart, showCheckout, setShowCheckout, isCartOpen, setIsCartOpen, itemCount, total } = useCart();

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [productError, setProductError] = useState('');

  const [crops, setCrops] = useState([]);
  const [isLoadingCrops, setIsLoadingCrops] = useState(true);
  const [problems, setProblems] = useState([]);
  const [isLoadingProblems, setIsLoadingProblems] = useState(true);
  const [applicationMethods, setApplicationMethods] = useState([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);

  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSizes, setSelectedSizes] = useState({});
  const [addedItemIds, setAddedItemIds] = useState({});

  // 1. Load active products from MongoDB
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setProductError('');
    try {
      const { products: apiProducts } = await getProducts();
      setProducts(apiProducts);
    } catch (err) {
      setProducts([]);
      setProductError(err.message || 'Unable to load products from database.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // 2. Load filter options from MongoDB
  useEffect(() => {
    getCrops()
      .then(({ crops: apiCrops }) => setCrops(apiCrops))
      .catch(() => setCrops([]))
      .finally(() => setIsLoadingCrops(false));

    getProblems()
      .then(({ problems: apiProblems }) => setProblems(apiProblems))
      .catch(() => setProblems([]))
      .finally(() => setIsLoadingProblems(false));

    getApplicationMethods()
      .then(({ applicationMethods: apiMethods }) => setApplicationMethods(apiMethods))
      .catch(() => setApplicationMethods([]))
      .finally(() => setIsLoadingMethods(false));
  }, []);

  const cropOptions = useMemo(() => sortCropNames(crops.map((c) => c.name)), [crops]);
  const problemOptions = useMemo(() => problems.map((p) => p.name), [problems]);
  const methodOptions = useMemo(() => applicationMethods.map((m) => m.name), [applicationMethods]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearchApply = () => {
    setAppliedFilters(filters);
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  };

  const handleQuickChip = (key, value) => {
    const next = { ...appliedFilters, [key]: appliedFilters[key] === value ? 'All' : value };
    setFilters(next);
    setAppliedFilters(next);
  };

  // Filter products based on applied criteria and search term
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search term
      if (appliedFilters.search.trim()) {
        const query = appliedFilters.search.trim().toLowerCase();
        const nameMatch = p.name && p.name.toLowerCase().includes(query);
        const brandMatch = p.brand && p.brand.toLowerCase().includes(query);
        const cropMatch = p.crop && p.crop.toLowerCase().includes(query);
        const probMatch = p.problem && p.problem.toLowerCase().includes(query);
        if (!nameMatch && !brandMatch && !cropMatch && !probMatch) {
          return false;
        }
      }

      // Crop filter
      if (appliedFilters.crop !== 'All' && p.crop && p.crop.toLowerCase() !== appliedFilters.crop.toLowerCase()) {
        return false;
      }

      // Problem filter
      if (appliedFilters.problem !== 'All' && p.problem && p.problem.toLowerCase() !== appliedFilters.problem.toLowerCase()) {
        return false;
      }

      // Method filter
      if (appliedFilters.method !== 'All') {
        const m = p.method || p.applicationMethod;
        if (!m || m.toLowerCase() !== appliedFilters.method.toLowerCase()) {
          return false;
        }
      }

      // Sequence filter
      if (appliedFilters.seq !== 'All') {
        const s = String(p.seq || p.sequence || '');
        if (appliedFilters.seq === '3+' && !(Number(s) >= 3)) {
          return false;
        }
        if (appliedFilters.seq !== '3+' && s !== appliedFilters.seq) {
          return false;
        }
      }

      return true;
    });
  }, [products, appliedFilters]);

  // Card size selector state helper
  const getSelectedSize = (productId, availableSizes) => {
    if (selectedSizes[productId]) return selectedSizes[productId];
    return availableSizes?.[0] || 100;
  };

  const handleCardSizeChange = (productId, size) => {
    setSelectedSizes((prev) => ({ ...prev, [productId]: Number(size) }));
  };

  const handleAddToCart = (product, size) => {
    addToCart(product, size);
    const key = `${product.id || product._id}-${size}`;
    setAddedItemIds((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [key]: false }));
    }, 1500);
  };

  return (
    <div className="products-page">
      <Navbar />

      {/* 1. Page Header (Section 2.A) */}
      <header className="products-hero-banner">
        <div className="products-hero-content">
          <span className="products-hero-badge">🚜 Agricultural Storefront</span>
          <h1 className="products-hero-title">Agricultural Products Catalogue</h1>
          <p className="products-hero-subtitle">
            Explore quality agricultural products for your farming needs.
          </p>
          <div className="products-hero-stats">
            <span className="stat-pill total">
              <strong>{products.length}</strong> Total Products Available
            </span>
            <span className="stat-pill active">
              <strong>{filteredProducts.length}</strong> Matching Items
            </span>
          </div>
        </div>
      </header>

      {/* 2. Main Catalogue Content */}
      <main className="products-main-layout">
        {/* Product Filters Card (Section 2.B) */}
        <div className="products-filter-card">
          {/* Search Row */}
          <div className="products-search-row">
            <div className="products-search-input-wrap">
              <span className="products-search-icon">🔍</span>
              <input
                type="text"
                className="products-search-input"
                placeholder="Search products by name, brand, or crop..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchApply();
                }}
              />
              {filters.search && (
                <button
                  type="button"
                  className="products-search-clear"
                  onClick={() => {
                    handleFilterChange('search', '');
                    setAppliedFilters((prev) => ({ ...prev, search: '' }));
                  }}
                  title="Clear search"
                >
                  &times;
                </button>
              )}
            </div>
            <button
              type="button"
              className="btn-filter-search"
              onClick={handleSearchApply}
            >
              Search
            </button>
            <button
              type="button"
              className="btn-filter-reset"
              onClick={handleResetFilters}
            >
              Reset Filters
            </button>
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="products-filter-grid">
            {/* Crop Type Dropdown */}
            <div className="filter-group">
              <label htmlFor="prod-filter-crop">Crop Type</label>
              <select
                id="prod-filter-crop"
                className="filter-select"
                value={filters.crop}
                disabled={isLoadingCrops}
                onChange={(e) => handleFilterChange('crop', e.target.value)}
              >
                <option value="All">All Crops</option>
                {cropOptions.map((crop) => (
                  <option key={crop} value={crop}>
                    {crop}
                  </option>
                ))}
              </select>
            </div>

            {/* Problem / Category Dropdown */}
            <div className="filter-group">
              <label htmlFor="prod-filter-problem">Problem / Category</label>
              <select
                id="prod-filter-problem"
                className="filter-select"
                value={filters.problem}
                disabled={isLoadingProblems}
                onChange={(e) => handleFilterChange('problem', e.target.value)}
              >
                <option value="All">All Problems</option>
                {problemOptions.map((prob) => (
                  <option key={prob} value={prob}>
                    {prob}
                  </option>
                ))}
              </select>
            </div>

            {/* Application Method Dropdown */}
            <div className="filter-group">
              <label htmlFor="prod-filter-method">Application Method</label>
              <select
                id="prod-filter-method"
                className="filter-select"
                value={filters.method}
                disabled={isLoadingMethods}
                onChange={(e) => handleFilterChange('method', e.target.value)}
              >
                <option value="All">All Methods</option>
                {methodOptions.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            {/* Spray Sequence Dropdown */}
            <div className="filter-group">
              <label htmlFor="prod-filter-seq">Spray Sequence</label>
              <select
                id="prod-filter-seq"
                className="filter-select"
                value={filters.seq}
                onChange={(e) => handleFilterChange('seq', e.target.value)}
              >
                <option value="All">All Sequences</option>
                <option value="1">Sequence 1</option>
                <option value="2">Sequence 2</option>
                <option value="3+">Sequence 3+</option>
              </select>
            </div>
          </div>

          {/* Quick Filter Chips */}
          <div className="quick-chips-row">
            <span className="quick-chips-label">Popular:</span>
            <button
              type="button"
              className={`quick-chip ${appliedFilters.crop === 'Cotton' ? 'active' : ''}`}
              onClick={() => handleQuickChip('crop', 'Cotton')}
            >
              🌾 Cotton
            </button>
            <button
              type="button"
              className={`quick-chip ${appliedFilters.crop === 'Turmeric' ? 'active' : ''}`}
              onClick={() => handleQuickChip('crop', 'Turmeric')}
            >
              🌿 Turmeric
            </button>
            <button
              type="button"
              className={`quick-chip ${appliedFilters.problem === 'Insecticide' ? 'active' : ''}`}
              onClick={() => handleQuickChip('problem', 'Insecticide')}
            >
              🛡️ Insecticides
            </button>
            <button
              type="button"
              className={`quick-chip ${appliedFilters.problem === 'Fungicide' ? 'active' : ''}`}
              onClick={() => handleQuickChip('problem', 'Fungicide')}
            >
              🍄 Fungicides
            </button>
            <button
              type="button"
              className={`quick-chip ${appliedFilters.problem === 'PGR' ? 'active' : ''}`}
              onClick={() => handleQuickChip('problem', 'PGR')}
            >
              🌱 PGR
            </button>
          </div>
        </div>

        {/* 3. Product Cards Grid (Section 2.C & 2.D) */}
        <section className="products-grid-section">
          <div className="products-grid-header">
            <h2>Available Agricultural Supplies</h2>
            <span className="products-active-counter">
              Showing {filteredProducts.length} of {products.length} products
            </span>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="catalogue-state" role="status">
              Loading agricultural products catalogue…
            </div>
          )}

          {/* Error State */}
          {!isLoading && productError && (
            <div className="catalogue-state error" role="alert">
              <p>Products could not be loaded: {productError}</p>
              <button type="button" onClick={loadProducts}>
                Retry Loading
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !productError && filteredProducts.length === 0 && (
            <div className="products-empty-state">
              <div className="empty-icon">🌾</div>
              <h3>No products match your criteria</h3>
              <p>Try adjusting your search query, crop, problem, or sequence filters.</p>
              <button
                type="button"
                className="btn-reset-filters"
                onClick={handleResetFilters}
              >
                Reset All Filters
              </button>
            </div>
          )}

          {/* Products Grid */}
          {!isLoading && !productError && filteredProducts.length > 0 && (
            <div className="ecommerce-products-grid">
              {filteredProducts.map((product) => {
                const availableSizes = product.availableSizes?.length
                  ? product.availableSizes
                  : [100, 500];
                const selectedSize = getSelectedSize(product.id, availableSizes);

                const currentPrice =
                  selectedSize === 500
                    ? (product.p500 ?? product.prices?.find((p) => Number(p.size) === 500)?.amount ?? 0)
                    : (product.p100 ?? product.prices?.find((p) => Number(p.size) === 100)?.amount ?? 0);

                const dosage = product.dosagePerAcre || mlPerAcre(product.problem);
                const dosageUnit = product.dosageUnit || 'ml';
                const stockCount = product.stock ?? 50;

                const problemColor =
                  product.problem === 'Insecticide'
                    ? 'problem-red'
                    : product.problem === 'Fungicide'
                    ? 'problem-yellow'
                    : product.problem === 'PGR'
                    ? 'problem-green'
                    : 'problem-purple';

                const addKey = `${product.id || product._id}-${selectedSize}`;
                const isJustAdded = addedItemIds[addKey];

                return (
                  <article key={product.id || product._id} className="ecommerce-product-card">
                    {/* Card Media Banner */}
                    <div className="card-media-wrap">
                      <img
                        src={getProductImageUrl(product)}
                        alt={product.name}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = '/products/res.jpg';
                        }}
                      />
                      <div className="card-media-badges">
                        <span className={`card-badge ${problemColor}`}>{product.problem}</span>
                      </div>
                      <div className="card-seq-badge">
                        Seq: {product.seq || product.sequence || 1}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="card-content-body">
                      <h3 className="card-product-title">{product.name}</h3>
                      <div className="card-brand-subtitle">
                        {product.brand || product.company || 'Himalaya FarmCare'}
                      </div>

                      {/* Specs Tags */}
                      <div className="card-specs-row">
                        <span className="spec-chip crop">🌾 {product.crop}</span>
                        <span className="spec-chip">💧 {product.method || product.applicationMethod}</span>
                      </div>

                      {/* Verified Dosage Block */}
                      <div className="card-dosage-block">
                        <span className="dosage-title">Verified Dosage</span>
                        <span className="dosage-stat">
                          💊 {dosage} {dosageUnit} / Acre
                        </span>
                      </div>

                      {/* Stock Status */}
                      <div className="card-stock-row">
                        <span className="label">Availability:</span>
                        {stockCount > 0 ? (
                          <span className="stock-tag in-stock">
                            🟢 In Stock ({stockCount})
                          </span>
                        ) : (
                          <span className="stock-tag out-of-stock">
                            🔴 Out of Stock
                          </span>
                        )}
                      </div>

                      {/* Pricing and Size Selector */}
                      <div className="card-price-controls">
                        <div className="price-unit-display">
                          <span className="price-amount">{money(currentPrice)}</span>
                          <span className="price-gst">+ 5% GST</span>
                        </div>

                        <select
                          className="size-select-dropdown"
                          aria-label={`${product.name} package size`}
                          value={selectedSize}
                          onChange={(e) => handleCardSizeChange(product.id, e.target.value)}
                        >
                          {availableSizes.map((size) => (
                            <option key={size} value={size}>
                              {size} ml
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="card-actions-row">
                        <button
                          type="button"
                          className="btn-card-details"
                          onClick={() => setSelectedProduct(product)}
                        >
                          View Details 👁️
                        </button>
                        <button
                          type="button"
                          className={`btn-card-add ${isJustAdded ? 'added' : ''}`}
                          onClick={() => handleAddToCart(product, selectedSize)}
                        >
                          {isJustAdded ? 'Added ✓' : 'Add to Cart 🛒'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Floating Cart Button (Section 5) */}
      <button
        type="button"
        className="floating-cart-trigger"
        onClick={() => setIsCartOpen(true)}
        aria-label="Open Cart"
      >
        <span>🛒 View Cart</span>
        <span className="cart-count-badge">{itemCount}</span>
        <span>• {money(total)}</span>
      </button>

      {/* Slide-over Cart Drawer */}
      {isCartOpen && (
        <div
          className="cart-drawer-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsCartOpen(false);
          }}
        >
          <div className="cart-drawer-content" role="dialog" aria-modal="true" aria-label="Your Cart">
            <div className="cart-drawer-header">
              <h3>
                <span>🛒</span> Your Farm Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
              </h3>
              <button
                type="button"
                className="btn-close-drawer"
                onClick={() => setIsCartOpen(false)}
                aria-label="Close cart drawer"
              >
                &times;
              </button>
            </div>
            <div className="cart-drawer-body">
              <Cart
                cart={cart}
                onQuantity={changeLine}
                onPrice={changeLine}
                onRemove={removeLine}
                onCheckout={() => {
                  setIsCartOpen(false);
                  setShowCheckout(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Product Details Modal */}
      <ProductDetailsModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={addToCart}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        cart={cart}
        onOrderPlaced={clearCart}
      />

      <Footer />
    </div>
  );
}
