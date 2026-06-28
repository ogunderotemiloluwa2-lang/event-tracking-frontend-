import React, { useState } from 'react';
import { getEventByPassId } from '../services/api';

function Attendee({ user, onNavigate }) {
  const [passId, setPassId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmitPass = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Validate the pass ID by trying to fetch event details
      const response = await getEventByPassId(passId);
      if (response.data) {
        // Navigate to event details page with the pass ID
        onNavigate('event-details', { passId });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid pass ID. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="attendee-page">
      <div className="attendee-container">
        <div className="attendee-content">
          <div className="step-container pass-step">
            <div className="step-icon">🎟️</div>
            <h1>Join an Event</h1>
            <p className="step-description">Enter your event pass to see details and register</p>

            <form onSubmit={handleSubmitPass} className="step-form">
              <div className="form-field">
                <label>Event Pass ID</label>
                <input 
                  type="text" 
                  placeholder="Enter your pass code (e.g., A1B2C3D4)" 
                  value={passId} 
                  onChange={(e) => setPassId(e.target.value.toUpperCase())} 
                  required 
                  maxLength="8"
                  className="input-large"
                />
                <small>You'll find this in your event invitation</small>
              </div>

              {error && <div className="error-alert">{error}</div>}

              <button type="submit" className="btn-primary-large" disabled={loading || !passId}>
                {loading ? 'Validating...' : 'View Event'}
              </button>
            </form>

            <div className="divider">or</div>
            <button type="button" className="btn-secondary-large" disabled>
              📱 Scan QR Code (Coming soon)
            </button>

            <div className="help-section">
              <h4>Don't have a pass?</h4>
              <p>Ask the event organizer for the event pass ID or ask them to send you the invitation link with the QR code.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Attendee;
