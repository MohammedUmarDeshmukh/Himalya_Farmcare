import { Link } from 'react-router-dom';

export default function Logo() {
  return <Link to="/" className="logo" aria-label="Himalaya FarmCare home">
    <span className="logo-mark" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M24 40V22" /><path d="M24 29C14 28 10 21 10 12c9 0 14 5 14 17Z" /><path d="M25 23c1-10 7-15 15-15 0 9-5 15-15 15Z" /><path d="M9 40h30" /></svg></span>
    <span><strong>Himalaya FarmCare</strong><small>Serving Your Farm Is Our Duty</small></span>
  </Link>;
}
