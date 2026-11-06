import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!email.trim() || !password) {
      setLocalError('Please enter both your email address and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setLocalError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeError = localError || authError;

  return (
    <>
      <Navbar />
      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <span className="eyebrow">HIMALAYA FARMCARE · AUTHENTICATION</span>
            <h1>Welcome Back</h1>
            <p>Sign in to access your farm recommendation plan, saved catalogue, and dosage records.</p>
          </div>

          {activeError && (
            <div className="auth-alert error" role="alert">
              <strong>Login Error:</strong> {activeError}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="form-field">
              <label htmlFor="login-email">Email Address</label>
              <div className="form-input-wrap">
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  placeholder="farmer@example.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="login-password">Password</label>
              <div className="form-input-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex="-1"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Signing In…' : 'Sign In to FarmCare'}
            </button>
          </form>

          <div className="auth-badge-notice">
            🌱 Serving Your Farm Is Our Duty · Himalaya FarmCare Security
          </div>

          <div className="auth-footer">
            Don't have an account?{' '}
            <Link to="/register">Create a Farmer Account</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
