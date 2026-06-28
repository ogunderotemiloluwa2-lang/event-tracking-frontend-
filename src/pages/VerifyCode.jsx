import React, { useState } from 'react';
import { verifyCode } from '../services/api';

function VerifyCode({ email, onBack, onNext }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await verifyCode(email, code);
      onNext && onNext('reset-password', { email, code });
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid or expired code');
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
            <h2>Verify Code</h2>
            <p className="muted">Enter the 6-digit code sent to your email</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Email</label>
            <input 
              type="email" 
              value={email} 
              disabled 
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-field">
            <label>Verification Code</label>
            <input 
              type="text" 
              value={code} 
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} 
              placeholder="000000"
              maxLength="6"
              required 
              style={{ fontSize: '1.5rem', letterSpacing: '0.5rem', textAlign: 'center' }}
            />
            <small style={{ marginTop: '4px', display: 'block' }}>
              {code.length}/6 digits
            </small>
          </div>

          <div className="form-actions">
            <button className="btn-primary" type="submit" disabled={loading || code.length !== 6}>
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </div>

          {error && <div className="error-alert">{error}</div>}

          <div className="form-note">
            <span>Didn't receive a code?</span>
            <button type="button" className="link-button" onClick={onBack}>
              Request new code
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VerifyCode;
