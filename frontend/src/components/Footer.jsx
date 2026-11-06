import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand-col">
          <Logo />
          <p>
            Himalaya FarmCare is a smart agricultural platform that helps farmers explore crop
            protection products, discover suitable recommendations, calculate application
            requirements, and manage their orders conveniently.
          </p>
        </div>
        <div>
          <h3>Quick Links</h3>
          <Link to="/">Home</Link>
          <Link to="/#about">About</Link>
          <Link to="/#contact">Contact</Link>
        </div>
        <div>
          <h3>Explore</h3>
          <Link to="/products">Products</Link>
          <Link to="/recommendation">Recommendation</Link>
        </div>
        <div>
          <h3>Contact</h3>
          <p>
            Need assistance with agricultural products or your orders? Our team is here to help you
            navigate the Himalaya FarmCare platform.
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        &copy; {new Date().getFullYear()} Himalaya FarmCare. All rights reserved. &ldquo;Serving Your
        Farm Is Our Duty&rdquo;
      </div>
    </footer>
  );
}
