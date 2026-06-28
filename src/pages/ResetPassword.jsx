import React, { useState } from 'react';
import { resetPassword } from '../services/api';
import PasswordInput from '../components/PasswordInput';

function ResetPassword({ email, code, onBack, onSuccess }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      await resetPassword(email, code, newPassword, confirmPassword);
      onSuccess && onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to reset password');
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
            <h2>Create New Password</h2>
            <p className="muted">Enter your new password below</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>New Password</label>
            <PasswordInput
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="form-field">
            <label>Confirm Password</label>
            <PasswordInput
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="form-actions">
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </div>

          {error && <div className="error-alert">{error}</div>}

          <div className="form-note" style={{ fontSize: '0.9rem' }}>
            <span>✓ Password must be at least 6 characters</span>
            <br />
            <span>✓ Passwords must match</span>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
