import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import CataloguePreview from '../components/CataloguePreview';
import CropCategories from '../components/CropCategories';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { getCrops } from '../services/cropService';
import { getProducts } from '../services/productService';
import { sortCropNames } from '../utils/cropOrder';

const steps = [
  ['01', 'Select Crop', 'Choose the crop relevant to your farm plan.'],
  ['02', 'Select Problem', 'Narrow results by the agricultural problem.'],
  ['03', 'Select Application Method', 'Choose spray or drip application options.'],
  ['04', 'Get Product Recommendations', 'Build a product plan, dosage, and bill.'],
];

const features = [
  'Smart Product Recommendation',
  'Multiple Crop Types',
  'Multiple Agricultural Problems',
  'Multiple Application Methods',
  'Dosage Calculation',
  'Product Catalogue',
  'Cart and Bill',
  'Farmer Assistance Chatbot',
];

export default function Landing() {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [crops, setCrops] = useState([]);
  const [isLoadingCrops, setIsLoadingCrops] = useState(true);
  const [cropError, setCropError] = useState('');

  const PRODUCTS = products;

  useEffect(() => {
    getProducts()
      .then(({ products: apiProducts }) => setProducts(apiProducts))
      .catch(() => setProducts([]));
  }, []);

  const loadCrops = useCallback(async () => {
    setIsLoadingCrops(true);
    setCropError('');
    try {
      const { crops: apiCrops } = await getCrops();
      setCrops(apiCrops);
    } catch (error) {
      setCrops([]);
      setCropError(error.message || 'Unable to load crop categories from the API.');
    } finally {
      setIsLoadingCrops(false);
    }
  }, []);

  useEffect(() => {
    loadCrops();
  }, [loadCrops]);

  useEffect(() => {
    if (location.hash) {
      document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.hash]);

  const sortedCropNames = sortCropNames(crops.map((crop) => crop.name));

  return (
    <>
      <Navbar />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow light">AGRICULTURE · TECHNOLOGY · PLANNING</span>
            <h1>
              Smart Agriculture
              <br />
              <em>Product Recommendation</em>
            </h1>
            <p>
              Find suitable agricultural products based on your crop, problem and application
              method.
            </p>
            <div className="hero-actions">
              <Link className="button primary" to="/recommendation">
                Start Smart Recommendation
              </Link>
              <Link className="button secondary" to="/products">
                Explore Products
              </Link>
            </div>
            <div className="hero-note">
              <span>✓</span> Catalogue, dosage planning, cart, and bill tools in one workflow.
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="field-lines" />
            <div className="hero-leaf">⌁</div>
            <div className="stat-card">
              <strong>{crops.length}</strong>
              <span>Crop categories</span>
            </div>
            <div className="stat-card second">
              <strong>{PRODUCTS.length}</strong>
              <span>Products</span>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-heading">
            <span className="eyebrow">HOW IT WORKS</span>
            <h2>A simple path to a practical product plan.</h2>
          </div>
          <div className="steps-grid">
            {steps.map(([number, title, copy]) => (
              <article className="step-card" key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section surface">
          <div className="section-heading">
            <span className="eyebrow">CROP CATEGORIES</span>
            <h2>Start with your crop.</h2>
            <p>Categories are loaded from the crop catalogue.</p>
          </div>
          {isLoadingCrops && (
            <div className="catalogue-state" role="status">
              Loading crop categories…
            </div>
          )}
          {!isLoadingCrops && cropError && (
            <div className="catalogue-state error" role="alert">
              <p>{cropError}</p>
              <button type="button" onClick={loadCrops}>
                Retry
              </button>
            </div>
          )}
          {!isLoadingCrops && !cropError && crops.length === 0 && (
            <div className="catalogue-state" role="status">
              No crop categories are available.
            </div>
          )}
          {!isLoadingCrops && !cropError && crops.length > 0 && (
            <CropCategories crops={sortedCropNames} />
          )}
        </section>

        <section className="section recommendation-callout">
          <div>
            <span className="eyebrow light">SMART RECOMMENDATION</span>
            <h2>Turn product choices into a clear application plan.</h2>
            <p>
              Filter the catalogue, fill plan slots, calculate bottle quantities from acreage, and
              review a printable bill.
            </p>
          </div>
          <Link className="button secondary" to="/recommendation">
            Get Recommendation
          </Link>
        </section>

        <section className="section">
          <div className="section-heading inline-heading">
            <div>
              <span className="eyebrow">CATALOGUE PREVIEW</span>
              <h2>Explore available products.</h2>
            </div>
            <Link className="text-link" to="/products">
              View All Products →
            </Link>
          </div>
          <CataloguePreview products={PRODUCTS.slice(0, 4)} />
        </section>

        <section className="section surface">
          <div className="section-heading">
            <span className="eyebrow">PLATFORM CAPABILITIES</span>
            <h2>Comprehensive tools for modern agriculture.</h2>
          </div>
          <div className="feature-grid">
            {features.map((feature, index) => (
              <article className="feature-card" key={feature}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{feature}</h3>
                <p>
                  {feature === 'Farmer Assistance Chatbot'
                    ? 'Active AI assistant to guide farmers in English, Hindi & Hinglish.'
                    : 'Active and available on Himalaya FarmCare.'}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="section about-grid" id="about">
          <div>
            <span className="eyebrow">ABOUT HIMALAYA FARMCARE</span>
            <h2>Designed as a clear, structured agriculture product-planning experience.</h2>
          </div>
          <p>
            Himalaya FarmCare is a smart agricultural platform that helps farmers explore crop
            protection products, discover suitable recommendations, calculate application
            requirements, and manage their orders conveniently.
          </p>
        </section>

        <section className="contact-section" id="contact">
          <div>
            <span className="eyebrow light">CONTACT & SUPPORT</span>
            <h2>We're Here to Support Your Farm.</h2>
            <p>
              Need assistance with agricultural products or your orders? Our team is here to help
              you navigate the Himalaya FarmCare platform.
            </p>
          </div>
          <div className="contact-placeholder">
            <span>Platform Support</span>
            <strong>Guidance & order assistance for farmers</strong>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
