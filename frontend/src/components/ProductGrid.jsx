import ProductCard from './ProductCard';
export default function ProductGrid({ products, acres, isCategoryFull, activePlanCrop, onAdd, onShow }) {
  if (products.catalogueState === 'loading') return <div className="catalogue-state" role="status">Loading products…</div>;
  if (products.catalogueState === 'error') return <div className="catalogue-state error" role="alert"><p>Products could not be loaded. {products.catalogueError}</p><button type="button" onClick={products.retry}>Retry</button></div>;
  if (products.length === 0) return <div className="catalogue-state">No products match the selected filters.</div>;
  return <div className="grid">{products.map((product) => <ProductCard key={product.id} product={product} acres={acres} greyed={activePlanCrop === product.crop && isCategoryFull(product.problem)} onAdd={onAdd} onShow={onShow} />)}</div>;
}
