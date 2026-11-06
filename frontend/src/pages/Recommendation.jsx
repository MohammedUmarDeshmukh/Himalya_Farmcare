import { useCallback, useEffect, useMemo, useState } from 'react';
import Cart from '../components/Cart';
import CheckoutModal from '../components/CheckoutModal';
import DosageCalculator from '../components/DosageCalculator';
import FilterPanel from '../components/FilterPanel';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import PrintableBill from '../components/PrintableBill';
import ProductDetailsModal from '../components/ProductDetailsModal';
import ProductGrid from '../components/ProductGrid';
import RecommendationPlan from '../components/RecommendationPlan';
import RecommendationResults from '../components/RecommendationResults';
import { useCart } from '../context/CartContext';
import { getApplicationMethods } from '../services/applicationMethodService';
import { getCrops } from '../services/cropService';
import { getProblems } from '../services/problemService';
import { getProducts } from '../services/productService';
import { generateRecommendations } from '../services/recommendationService';
import { sortCropNames } from '../utils/cropOrder';
import { buildPlanProjection, matchesFilters, mlPerAcre } from '../utils/recommendation';

const initialFilters = { crop: 'Cotton', problem: 'All', method: 'All', seq: 'All' };

export default function Recommendation() {
  const { cart, setCart, addToCart, removeLine, changeLine, clearCart, showCheckout, setShowCheckout } = useCart();

  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [planCrop, setPlanCrop] = useState('Cotton');

  const [acreInput, setAcreInput] = useState('');
  const [acres, setAcres] = useState(null);
  const [dosageStatus, setDosageStatus] = useState('Dosage: not calculated');
  const [showAcreWarning, setShowAcreWarning] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [productError, setProductError] = useState('');

  const [crops, setCrops] = useState([]);
  const [isLoadingCrops, setIsLoadingCrops] = useState(true);
  const [cropError, setCropError] = useState('');

  const [problems, setProblems] = useState([]);
  const [isLoadingProblems, setIsLoadingProblems] = useState(true);
  const [problemError, setProblemError] = useState('');

  const [applicationMethods, setApplicationMethods] = useState([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [methodError, setMethodError] = useState('');

  const [recommendation, setRecommendation] = useState(null);
  const [isGeneratingRecommendation, setIsGeneratingRecommendation] = useState(false);
  const [recommendationError, setRecommendationError] = useState('');

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setProductError('');
    try {
      const { products: apiProducts } = await getProducts();
      setProducts(apiProducts);
    } catch (error) {
      setProducts([]);
      setProductError(error.message || 'Unable to load products from the API.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const loadCrops = useCallback(async () => {
    setIsLoadingCrops(true);
    setCropError('');
    try {
      const { crops: apiCrops } = await getCrops();
      setCrops(apiCrops);
    } catch (error) {
      setCrops([]);
      setCropError(error.message || 'Unable to load crop options from the API.');
    } finally {
      setIsLoadingCrops(false);
    }
  }, []);

  useEffect(() => {
    loadCrops();
  }, [loadCrops]);

  const loadProblems = useCallback(async () => {
    setIsLoadingProblems(true);
    setProblemError('');
    try {
      const { problems: apiProblems } = await getProblems();
      setProblems(apiProblems);
    } catch (error) {
      setProblems([]);
      setProblemError(error.message || 'Unable to load problem options from the API.');
    } finally {
      setIsLoadingProblems(false);
    }
  }, []);

  useEffect(() => {
    loadProblems();
  }, [loadProblems]);

  const loadApplicationMethods = useCallback(async () => {
    setIsLoadingMethods(true);
    setMethodError('');
    try {
      const { applicationMethods: apiMethods } = await getApplicationMethods();
      setApplicationMethods(apiMethods);
    } catch (error) {
      setApplicationMethods([]);
      setMethodError(error.message || 'Unable to load application methods from the API.');
    } finally {
      setIsLoadingMethods(false);
    }
  }, []);

  useEffect(() => {
    loadApplicationMethods();
  }, [loadApplicationMethods]);

  const PRODUCTS = products;
  const cropOptions = useMemo(() => sortCropNames(crops.map((crop) => crop.name)), [crops]);
  const problemOptions = useMemo(() => problems.map((problem) => problem.name), [problems]);
  const methodOptions = useMemo(() => applicationMethods.map((method) => method.name), [applicationMethods]);

  const results = useMemo(() => {
    const filtered = PRODUCTS.filter((product) => matchesFilters(product, appliedFilters));
    filtered.catalogueState = isLoading ? 'loading' : productError ? 'error' : '';
    filtered.catalogueError = productError;
    filtered.retry = loadProducts;
    return filtered;
  }, [PRODUCTS, appliedFilters, isLoading, productError, loadProducts]);

  const projection = useMemo(() => buildPlanProjection(planCrop, cart, PRODUCTS), [planCrop, cart, PRODUCTS]);

  const selectFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  const search = () => {
    setAppliedFilters(filters);
    if (filters.crop === 'Cotton' || filters.crop === 'Turmeric') {
      setPlanCrop(filters.crop);
    }
  };

  const handleAddToCart = (productId, sizeMl) => {
    const product = PRODUCTS.find((item) => (item.id === productId || item._id === productId));
    if (!product) return;
    addToCart(product, sizeMl);
    setPlanCrop(product.crop);
  };

  const generateRecommendation = async () => {
    setIsGeneratingRecommendation(true);
    setRecommendationError('');
    setRecommendation(null);
    try {
      const input = {
        crop: filters.crop,
        problem: filters.problem,
        applicationMethod: filters.method,
        acreage: acreInput,
      };
      if (filters.seq !== 'All') input.spraySequence = filters.seq;
      setRecommendation(await generateRecommendations(input));
    } catch (error) {
      setRecommendationError(error.message || 'Unable to generate recommendations.');
    } finally {
      setIsGeneratingRecommendation(false);
    }
  };

  const calculateDosage = () => {
    const value = Number(acreInput);
    if (!(value > 0)) {
      setAcres(null);
      setShowAcreWarning(true);
      setDosageStatus('Dosage: enter acres and click Next');
      return;
    }
    setAcres(value);
    setShowAcreWarning(false);
    if (!cart.length) {
      setDosageStatus(`Dosage calculated for ${value} Acre (cart empty)`);
      return;
    }
    setCart((current) =>
      current.map((line) => {
        const product = PRODUCTS.find((item) => item.id === line.productId || item._id === line.productId);
        return product
          ? {
              ...line,
              qty: Math.max(1, Math.ceil((mlPerAcre(product.problem) * value) / line.sizeMl)),
            }
          : line;
      })
    );
    setDosageStatus(`Dosage calculated for ${value} Acre ✅`);
  };

  const printBill = () => {
    if (!cart.length) return window.alert('Cart is empty. Add products first.');
    if (!(acres > 0) && !window.confirm('Acreage is not calculated. Print anyway?')) return;
    window.print();
  };

  const isCategoryFull = (problem) => projection.slots[problem]?.every(Boolean) ?? false;
  const unsupportedCrop = appliedFilters.crop !== 'All' && appliedFilters.crop !== 'Cotton' && appliedFilters.crop !== 'Turmeric';

  return (
    <>
      <Navbar>
        <FilterPanel
          filters={filters}
          onChange={selectFilter}
          onSearch={search}
          cropOptions={cropOptions}
          isLoadingCrops={isLoadingCrops}
          cropError={cropError}
          onRetryCrops={loadCrops}
          problemOptions={problemOptions}
          isLoadingProblems={isLoadingProblems}
          problemError={problemError}
          onRetryProblems={loadProblems}
          methodOptions={methodOptions}
          isLoadingMethods={isLoadingMethods}
          methodError={methodError}
          onRetryMethods={loadApplicationMethods}
        />
        <DosageCalculator
          acreInput={acreInput}
          onAcreChange={setAcreInput}
          onCalculate={calculateDosage}
          onPrint={printBill}
          dosageStatus={dosageStatus}
        />
      </Navbar>

      <main className="main">
        {/* Left Panel: Smart Recommendations & Product Catalogue */}
        <section className="panel">
          <div className="panelHeader">
            <h2>Smart Recommendation & Product Matching</h2>
            <div className="meta">
              <span className="pill">{results.length} items</span>
              <span className="pill">Crop: {appliedFilters.crop}</span>
              <span className="pill">Acre: {acres > 0 ? acres : '—'}</span>
            </div>
          </div>

          <div className="catalogue">
            <RecommendationResults
              filters={filters}
              acreage={acreInput}
              isLoading={isGeneratingRecommendation}
              error={recommendationError}
              recommendation={recommendation}
              onGenerate={generateRecommendation}
              onAdd={handleAddToCart}
            />

            {unsupportedCrop && (
              <div className="warnBox show">
                Smart recommendation sequencing rules are loaded for <b>Cotton</b> & <b>Turmeric</b> (filters still display others).
              </div>
            )}

            {showAcreWarning && (
              <div className="warnBox show">
                Enter acreage above and click <b>Next (Calculate)</b> to auto-calculate ideal bottle quantities for your cart.
              </div>
            )}

            <ProductGrid
              products={results}
              acres={acres}
              isCategoryFull={isCategoryFull}
              activePlanCrop={planCrop}
              onAdd={handleAddToCart}
              onShow={setSelectedProduct}
            />
          </div>
        </section>

        {/* Right Panel: Recommended Plan & Cart */}
        <section className="panel">
          <div className="rightBody">
            <RecommendationPlan
              crop={planCrop}
              projection={projection}
              onRemove={removeLine}
            />

            <Cart
              cart={cart}
              onQuantity={changeLine}
              onPrice={changeLine}
              onRemove={removeLine}
              onCheckout={() => setShowCheckout(true)}
            />

            <div className="hint">
              Cotton logic: <b>2 Insecticides mandatory</b>, <b>1 Fungicide recommended</b>, <b>2 PGR recommended</b>, <b>1 Special PGR optional</b>. Plant grows with mandatory + recommended progress and glows when complete.
              <br /><br />
              Dosage rules for this MVP: <b>Insecticides: 100ml/Acre</b>, <b>Fungicides: 500ml/Acre</b>, <b>Others: 200ml/Acre</b>.
            </div>
          </div>
        </section>
      </main>

      <PrintableBill
        cart={cart}
        products={PRODUCTS}
        acres={acres}
        crop={planCrop}
      />

      <ProductDetailsModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />

      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        cart={cart}
        onOrderPlaced={clearCart}
      />

      <Footer />
    </>
  );
}
