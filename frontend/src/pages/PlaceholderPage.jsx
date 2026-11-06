import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
export default function PlaceholderPage({ title }) { return <><Navbar /><main className="placeholder-page"><span className="eyebrow">FUTURE PHASE</span><h1>{title}</h1><p>{title} is intentionally not implemented yet. Authentication will be introduced in a later phase without changing the catalogue workflow.</p><Link className="button primary" to="/">Return Home</Link></main><Footer /></>; }
