import React, { useState } from 'react';
import { forgotPassword } from '../services/api';

function ForgotPassword({ onBack, onNext }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await forgotPassword(email);
      setSuccess('✓ Verification code sent! Check your email.');
      setTimeout(() => {
        onNext && onNext('verify-code', { email });
      }, 2000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to send reset code');
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
            <h2>Reset Password</h2>
            <p className="muted">Enter your email to receive a verification code</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              placeholder="your@email.com"
            />
          </div>

          <div className="form-actions">
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Sending Code...' : 'Send Verification Code'}
            </button>
          </div>

          {error && <div className="error-alert">{error}</div>}
          {success && <div className="success-alert">{success}</div>}

          <div className="form-note">
            <span>Remember your password?</span>
            <button type="button" className="link-button" onClick={onBack}>
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ForgotPassword;
