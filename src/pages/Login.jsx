import React, { useState } from 'react';
import { loginUser } from '../services/api';
import PasswordInput from '../components/PasswordInput';
import { isValidEmail } from '../utils/validation';

const roleLabel = (r) => (r === 'organizer' ? 'Organizer' : 'Attendee');

function Login({ onLoggedIn, onBack, onNavigate }) {
  const [role, setRole] = useState(() => localStorage.getItem('loginRole') || 'organizer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({ email: false });

  const emailInvalid = touched.email && email !== '' && !isValidEmail(email);

  const selectRole = (r) => {
    setRole(r);
    localStorage.setItem('loginRole', r);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await loginUser({ email, password });
      const { token, user } = res.data;

      // Make sure they're using the correct portal for their account type.
      if (user.role !== role) {
        setError(`This is ${roleLabel(user.role).toLowerCase()} account. Switch to ${roleLabel(user.role)} sign in to continue.`);
        selectRole(user.role);
        setLoading(false);
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      onLoggedIn && onLoggedIn(user);
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card-header">
          <button type="button" className="link-button compact" onClick={onBack}>
            ← Back
          </button>
          <div>
            <h2>{roleLabel(role)} sign in</h2>
            <p className="muted">
              {role === 'organizer'
                ? 'Access your dashboard, events and analytics.'
                : 'Sign in to view your events, passes and check in.'}
            </p>
          </div>
        </div>

        <div className="role-toggle" role="tablist" aria-label="Account type">
          <button
            type="button"
            role="tab"
            aria-selected={role === 'organizer'}
            className={`role-toggle-btn ${role === 'organizer' ? 'active' : ''}`}
            onClick={() => selectRole('organizer')}
          >
            Organizer
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={role === 'attendee'}
            className={`role-toggle-btn ${role === 'attendee' ? 'active' : ''}`}
            onClick={() => selectRole('attendee')}
          >
            Attendee
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onBlur={() => setTouched(t => ({ ...t, email: true }))}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            {emailInvalid && <span className="field-hint error">Enter a valid email, e.g. you@example.com</span>}
          </div>
          <div className="form-field">
            <label>Password</label>
            <PasswordInput
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
              required
            />
          </div>

          <div className="form-actions">
            <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
          </div>

          {error && <div className="error-alert">{error}</div>}

          <div className="form-note">
            <span>Need an account?</span>
            <button type="button" className="link-button" onClick={() => { localStorage.setItem('registerRole', role); onNavigate && onNavigate('register'); }}>
              Create {role === 'organizer' ? 'an organizer' : 'an attendee'} account
            </button>
          </div>

          <div className="form-note">
            <button type="button" className="link-button" onClick={() => onNavigate && onNavigate('forgot-password')}>
              Forgot password?
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
