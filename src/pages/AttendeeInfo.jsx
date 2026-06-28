import React, { useState } from 'react';
import { submitAttendeeInfo } from '../services/api';

function AttendeeInfo({ event, user, onBack, onSubmitted }) {
  const [rsvpStatus, setRsvpStatus] = useState('yes');
  const [guestCount, setGuestCount] = useState(1);
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await submitAttendeeInfo({
        eventId: event._id,
        userId: user.id,
        rsvpStatus,
        guestCount: parseInt(guestCount),
        dietaryRestrictions,
        specialRequests
      });

      if (response.data) {
        setSuccess(true);
        setTimeout(() => {
          onSubmitted && onSubmitted();
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit information');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="attendee-info-page">
        <div className="success-state">
          <div className="success-icon">✓</div>
          <h2>Information Submitted!</h2>
          <p>Thank you for completing your event details. We'll see you at {event.title}!</p>
          <button className="btn-primary" onClick={() => onBack()}>Back to Events</button>
        </div>
      </div>
    );
  }

  return (
    <div className="attendee-info-page">
      <button className="back-btn" onClick={onBack}>← Back</button>
      
      <section className="attendee-info-container">
        <div className="info-header">
          <h1>Event Details</h1>
          <p className="subtitle">{event.title}</p>
        </div>

        <form onSubmit={handleSubmit} className="attendee-info-form">
          <div className="form-section">
            <h3>Are you attending?</h3>
            <div className="radio-group">
              <label className="radio-label">
                <input 
                  type="radio" 
                  value="yes" 
                  checked={rsvpStatus === 'yes'} 
                  onChange={(e) => setRsvpStatus(e.target.value)}
                />
                <span>Yes, I'm attending</span>
              </label>
              <label className="radio-label">
                <input 
                  type="radio" 
                  value="maybe" 
                  checked={rsvpStatus === 'maybe'} 
                  onChange={(e) => setRsvpStatus(e.target.value)}
                />
                <span>Maybe / Unsure</span>
              </label>
              <label className="radio-label">
                <input 
                  type="radio" 
                  value="no" 
                  checked={rsvpStatus === 'no'} 
                  onChange={(e) => setRsvpStatus(e.target.value)}
                />
                <span>No, I can't attend</span>
              </label>
            </div>
          </div>

          {rsvpStatus !== 'no' && (
            <>
              <div className="form-section">
                <label htmlFor="guestCount">Number of Guests (including you)</label>
                <input 
                  type="number" 
                  id="guestCount"
                  min="1" 
                  max="10"
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  className="form-input"
                />
                <small>How many people total will be attending from your group?</small>
              </div>

              <div className="form-section">
                <label htmlFor="dietary">Dietary Restrictions (optional)</label>
                <input 
                  type="text" 
                  id="dietary"
                  placeholder="e.g., Vegetarian, Gluten-free, Nut allergy"
                  value={dietaryRestrictions}
                  onChange={(e) => setDietaryRestrictions(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-section">
                <label htmlFor="requests">Special Requests (optional)</label>
                <textarea 
                  id="requests"
                  placeholder="Any special accommodations or requests we should know about?"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  rows="3"
                  className="form-input"
                />
              </div>
            </>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="submit" className="btn-primary btn-large" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit RSVP'}
            </button>
            <button type="button" className="btn-secondary btn-large" onClick={onBack}>
              Skip for Now
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default AttendeeInfo;
