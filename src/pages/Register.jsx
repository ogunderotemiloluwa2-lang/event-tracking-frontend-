import React, { useState } from 'react';
import { registerUser } from '../services/api';
import PasswordInput from '../components/PasswordInput';
import { isValidEmail, isValidPhone, passwordStrength, isStrongEnough } from '../utils/validation';

function Register({ onRegistered, onBack, roleDefault }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState(() => roleDefault || localStorage.getItem('registerRole') || 'organizer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({ email: false, phone: false });

  const strength = passwordStrength(password);
  const emailInvalid = touched.email && email !== '' && !isValidEmail(email);
  const phoneInvalid = touched.phone && !isValidPhone(phone);
  const passwordsMismatch = confirmPassword !== '' && password !== confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    if (!isStrongEnough(password)) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const payload = { name, email, password, role, phone };
      if (role === 'organizer') payload.organization = organization;
      const res = await registerUser(payload);
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      onRegistered && onRegistered(user);
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page--split">
      <div className="auth-card">
        <div className="auth-card-header">
          <button type="button" className="link-button compact" onClick={onBack}>
            ← Back
          </button>
          <div>
            <h2>Create account</h2>
            <p className="muted">Sign up as {role === 'organizer' ? 'an organizer' : 'an attendee'}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Full name</label>
            <input value={name} onChange={e => setName(e.target.value)} required />
          </div>
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
            {emailInvalid
              ? <span className="field-hint error">Enter a valid email, e.g. you@example.com</span>
              : <span className="field-hint">We'll use this to sign you in.</span>}
          </div>
          <div className="form-field">
            <label>Phone number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onBlur={() => setTouched(t => ({ ...t, phone: true }))}
              placeholder="+234 800 000 0000"
            />
            {phoneInvalid
              ? <span className="field-hint error">Use 7–20 digits, e.g. +234 800 000 0000</span>
              : <span className="field-hint">Optional — for event reminders.</span>}
          </div>
          {role === 'organizer' && (
            <div className="form-field">
              <label>Organization</label>
              <input value={organization} onChange={e => setOrganization(e.target.value)} placeholder="Company or event brand" />
            </div>
          )}
          <div className="form-field">
            <label>Password</label>
            <PasswordInput
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              required
            />
            {password !== '' && (
              <div className={`pw-strength ${strength.key}`}>
                <div className="pw-strength-bar"><span style={{ width: `${(strength.score / 4) * 100}%` }} /></div>
                <span className="pw-strength-label">{strength.label}</span>
              </div>
            )}
            <span className="field-hint">Use 6+ characters. Add upper & lower case, a number and a symbol for a stronger password.</span>
          </div>
          <div className="form-field">
            <label>Confirm password</label>
            <PasswordInput
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              required
            />
            {passwordsMismatch && <span className="field-hint error">Passwords do not match.</span>}
          </div>

          <div className="form-actions">
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </div>

          {error && <div className="error-alert">{error}</div>}
        </form>
      </div>

      {/* Desktop-only decorative panel — fills the empty space beside the form */}
      <aside className="auth-visual" aria-hidden="true">
        <div className="auth-visual-overlay">
          <span className="auth-visual-brand">◆ EventFlow</span>
          <div className="auth-visual-copy">
            <h3 className="auth-visual-title">Everything you need to run great events.</h3>
            <ul className="auth-visual-points">
              <li><span className="tick">✓</span> Create events &amp; share a pass in seconds</li>
              <li><span className="tick">✓</span> Collect guest photos straight to your Drive</li>
              <li><span className="tick">✓</span> Track check-ins and RSVPs in real time</li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default Register;
