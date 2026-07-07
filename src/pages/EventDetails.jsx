import React, { useState, useEffect } from 'react';
import { getEventByPassId, joinEventByPassId } from '../services/api';
import { downloadPassImage, downloadPassPdf } from '../utils/passCard';

function EventDetails({ passId, user, autoJoinPassId, onAutoJoined, onBack, onNavigate }) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadEventDetails();
  }, [passId]);

  // Auto-join when coming from a shareable ?join=CODE link
  useEffect(() => {
    if (autoJoinPassId && event && !isJoined && !joining) {
      handleJoinEvent();
    }
  }, [autoJoinPassId, event, isJoined]);

  const loadEventDetails = async () => {
    try {
      setLoading(true);
      const response = await getEventByPassId(passId);
      setEvent(response.data);
      // Check if user already joined
      const alreadyJoined = response.data.attendees?.some(a => a.userId === user?.id);
      setIsJoined(alreadyJoined);
    } catch (err) {
      setError('Failed to load event details. Invalid pass ID.');
      console.error('Error loading event:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate the attendee's number (1-based index in the attendees array)
  const getAttendeeNumber = () => {
    if (!event?.attendees || !user?.id) return null;
    const idx = event.attendees.findIndex(a => a.userId === user.id);
    return idx >= 0 ? idx + 1 : null;
  };

  const handleJoinEvent = async () => {
    if (!user) {
      setError('Please log in to join an event');
      return;
    }

    try {
      setJoining(true);
      await joinEventByPassId(passId);
      setIsJoined(true);
      setError('');
      // Clear the auto-join flag so it doesn't re-trigger
      if (onAutoJoined) onAutoJoined();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join event');
      console.error('Error joining event:', err);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="event-details-page">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="loading">Loading event details...</div>
      </div>
    );
  }

  if (!event || error.includes('Invalid')) {
    return (
      <div className="event-details-page">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="error-state">
          <div className="error-icon">❌</div>
          <h2>Event Not Found</h2>
          <p>{error || 'The pass ID does not match any event.'}</p>
          <button className="btn-secondary" onClick={onBack}>Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="event-details-page">
      <button className="back-btn" onClick={onBack}>← Back</button>

      <section className="event-details-container">
        <div className="event-header-details">
          <h1>{event.title}</h1>
          <p className="organizer">Hosted by {event.createdBy?.name || 'Organizer'}</p>
        </div>

        <div className="event-info-grid">
          <div className="info-card">
            <div className="info-label">📍 Location</div>
            <div className="info-value">{event.location || 'TBA'}</div>
          </div>

          <div className="info-card">
            <div className="info-label">🏢 Venue</div>
            <div className="info-value">{event.venue || 'Not specified'}</div>
          </div>

          <div className="info-card">
            <div className="info-label">📅 Date</div>
            <div className="info-value">
              {new Date(event.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>

          <div className="info-card">
            <div className="info-label">🕐 Start Time</div>
            <div className="info-value">
              {event.startTime ? event.startTime : new Date(event.date).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </div>
          </div>

          <div className="info-card">
            <div className="info-label">🛑 End Time</div>
            <div className="info-value">{event.endTime || 'TBA'}</div>
          </div>

          <div className="info-card">
            <div className="info-label">⏰ Time Zone</div>
            <div className="info-value">{event.timeZone || 'UTC'}</div>
          </div>

          <div className="info-card">
            <div className="info-label">👔 Dress Code</div>
            <div className="info-value">{event.dressCode || 'No dress code'}</div>
          </div>

          <div className="info-card">
            <div className="info-label">🔞 Age Restriction</div>
            <div className="info-value">{event.ageRestriction || 'All ages welcome'}</div>
          </div>

          <div className="info-card">
            <div className="info-label">👥 Capacity</div>
            <div className="info-value">
              {event.attendees?.length || 0} / {event.capacity || '∞'}
            </div>
          </div>
        </div>

        {event.description && (
          <div className="event-description">
            <h3>About this event</h3>
            <p>{event.description}</p>
          </div>
        )}

        {event.additionalInfo && (
          <div className="additional-info-section">
            <h3>Important Information</h3>
            <p>{event.additionalInfo}</p>
          </div>
        )}

        <div className="event-statistics">
          <div className="stat-box">
            <div className="stat-box-label">Total Registrations</div>
            <div className="stat-box-value">{event.attendees?.length || 0}</div>
          </div>
          <div className="stat-box">
            <div className="stat-box-label">Confirmed Attendees</div>
            <div className="stat-box-value">
              {event.attendees?.filter(a => a.status === 'confirmed').length || 0}
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-box-label">Event Photos</div>
            <div className="stat-box-value">{Array.isArray(event.photos) ? event.photos.length : 0}</div>
          </div>
        </div>

        {error && !error.includes('Invalid') && (
          <div className="error-message">{error}</div>
        )}

        <div className="action-section">
          {isJoined ? (
            <div className="joined-status">
              <div className="joined-icon">✓</div>
              <p>You're registered for this event!</p>
              <div className="pass-download-buttons">
                <button
                  className="btn-primary"
                  onClick={() => downloadPassImage({ event, passId, attendeeName: user?.name, attendeeNumber: getAttendeeNumber() })}
                >
                  🖼️ Download Pass (Image)
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => downloadPassPdf({ event, passId, attendeeName: user?.name, attendeeNumber: getAttendeeNumber() })}
                >
                  📄 Download Pass (PDF)
                </button>
              </div>
              {onNavigate && (
                <button 
                  className="btn-primary"
                  onClick={() => onNavigate('photo-upload', { event, attendeePassId: passId })}
                  style={{ marginTop: '16px' }}
                >
                  📸 Upload Event Photos
                </button>
              )}
            </div>
          ) : (
            <button 
              className="btn-primary btn-large"
              onClick={handleJoinEvent}
              disabled={joining}
            >
              {joining ? 'Registering...' : 'Register for Event'}
            </button>
          )}
        </div>

        <div className="pass-id-info">
          <p className="small-text">Pass ID: <span className="pass-code">{event.passId}</span></p>
          {event.qrCode && (
            <div className="qr-preview">
              <img src={event.qrCode} alt="Pass QR Code" />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default EventDetails;
