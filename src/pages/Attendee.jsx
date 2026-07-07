import React, { useState, useEffect } from 'react';
import { getUserEvents, getEventByPassId, leaveEventByPassId } from '../services/api';

function Attendee({ user, onNavigate }) {
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [passId, setPassId] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [leavingId, setLeavingId] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState(null);

  useEffect(() => {
    if (user?.id) {
      loadMyEvents();
    }
  }, [user]);

  const loadMyEvents = async () => {
    try {
      setLoading(true);
      const response = await getUserEvents();
      setMyEvents(response.data || []);
    } catch (err) {
      console.error('Failed to load events:', err);
      setError('Failed to load your events');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPass = async (e) => {
    e.preventDefault();
    setJoining(true);
    setJoinError('');
    try {
      const response = await getEventByPassId(passId);
      if (response.data) {
        onNavigate('event-details', { passId });
      }
    } catch (err) {
      setJoinError(err.response?.data?.message || 'Invalid pass ID. Please check and try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveEvent = async (event) => {
    if (leaving) return;
    setLeavingId(event._id);
    setLeaving(true);
    try {
      await leaveEventByPassId(event.passId);
      setMyEvents(prev => prev.filter(e => e._id !== event._id));
    } catch (err) {
      alert('Failed to leave event: ' + (err.response?.data?.message || err.message));
    } finally {
      setLeaving(false);
      setLeavingId(null);
    }
  };

  const toggleExpand = (eventId) => {
    setExpandedEvent(expandedEvent === eventId ? null : eventId);
  };

  if (loading) {
    return (
      <div className="attendee-page">
        <div className="attendee-container">
          <div className="loading">Loading your events...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="attendee-page">
      <div className="attendee-container" style={{ maxWidth: '700px' }}>
        <div className="attendee-content">
          {/* Header */}
          <div className="my-events-header">
            <h1>My Events</h1>
            <p className="step-description">
              {myEvents.length > 0
                ? `You are registered for ${myEvents.length} event${myEvents.length > 1 ? 's' : ''}`
                : 'You haven\'t joined any events yet'}
            </p>
          </div>

          {/* Error state */}
          {error && <div className="error-alert">{error}</div>}

          {/* My Events List */}
          {myEvents.length > 0 && (
            <div className="my-events-list">
              {myEvents.map(event => {
                const isExpanded = expandedEvent === event._id;
                const isLeaving = leaving && leavingId === event._id;
                const attendeeInfo = event.attendees?.find(a => a.userId?.toString() === user.id);
                const status = attendeeInfo?.status || 'pending';
                const statusColors = {
                  pending: { bg: '#FEF3C7', color: '#92400E' },
                  confirmed: { bg: '#D1FAE5', color: '#065F46' },
                  'checked-in': { bg: '#DBEAFE', color: '#1E40AF' }
                };
                const statusColor = statusColors[status] || statusColors.pending;

                return (
                  <div key={event._id} className={`my-event-card ${isExpanded ? 'expanded' : ''}`}>
                    <div className="my-event-card-main" onClick={() => toggleExpand(event._id)}>
                      <div className="my-event-card-top">
                        <h3>{event.title}</h3>
                        <span className="event-status-badge" style={{ backgroundColor: statusColor.bg, color: statusColor.color }}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </div>
                      <div className="my-event-card-meta">
                        <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span>{event.location || 'TBA'}</span>
                      </div>
                      {!isExpanded && (
                        <div className="my-event-card-preview">
                          <span>{event.attendees?.length || 0} registered</span>
                          <span className="expand-hint">Tap for details ▼</span>
                        </div>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="my-event-card-details">
                        <div className="my-event-details-grid">
                          <div className="detail-item">
                            <span className="detail-label">Venue</span>
                            <span className="detail-value">{event.venue || 'Not specified'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Time</span>
                            <span className="detail-value">
                              {event.startTime || 'TBA'}{event.endTime ? ` - ${event.endTime}` : ''}
                            </span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Time Zone</span>
                            <span className="detail-value">{event.timeZone || 'UTC'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Dress Code</span>
                            <span className="detail-value">{event.dressCode || 'No dress code'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Age Restriction</span>
                            <span className="detail-value">{event.ageRestriction || 'All ages'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Capacity</span>
                            <span className="detail-value">{event.attendees?.length || 0} / {event.capacity || '∞'}</span>
                          </div>
                        </div>

                        {event.description && (
                          <div className="my-event-description">
                            <h4>About</h4>
                            <p>{event.description}</p>
                          </div>
                        )}

                        {event.additionalInfo && (
                          <div className="my-event-additional">
                            <h4>Important Information</h4>
                            <p>{event.additionalInfo}</p>
                          </div>
                        )}

                        <div className="my-event-pass-id">
                          <span>Pass ID: </span>
                          <strong>{event.passId}</strong>
                        </div>

                        <div className="my-event-card-actions">
                          <button
                            className="btn-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('event-details', { passId: event.passId });
                            }}
                          >
                            View Full Details
                          </button>
                          <button
                            className="btn-action btn-delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLeaveEvent(event);
                            }}
                            disabled={isLeaving}
                          >
                            {isLeaving ? 'Leaving...' : 'Leave Event'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {myEvents.length === 0 && !error && (
            <div className="empty-state" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div className="empty-icon-large">No Events</div>
              <h3>No Events Yet</h3>
              <p style={{ color: '#666', margin: '0.5rem 0 1.5rem' }}>
                Join an event using a pass ID from your organizer
              </p>
            </div>
          )}

          {/* Join New Event Section */}
          <div className="join-new-section">
            {!showJoinForm ? (
              <button
                className="btn-primary-large"
                onClick={() => setShowJoinForm(true)}
                style={{ width: '100%' }}
              >
                Join New Event
              </button>
            ) : (
              <div className="step-container pass-step" style={{ marginTop: '1rem' }}>
                <h3>Enter Event Pass ID</h3>
                <form onSubmit={handleSubmitPass} className="step-form">
                  <div className="form-field">
                    <input
                      type="text"
                      placeholder="Enter pass code (e.g., A1B2C3D4)"
                      value={passId}
                      onChange={(e) => setPassId(e.target.value.toUpperCase())}
                      required
                      maxLength="8"
                      className="input-large"
                    />
                    <small>You'll find this in your event invitation</small>
                  </div>

                  {joinError && <div className="error-alert">{joinError}</div>}

                  <div className="form-actions" style={{ gap: '0.75rem' }}>
                    <button type="submit" className="btn-primary" disabled={joining || !passId}>
                      {joining ? 'Validating...' : 'View Event'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => {
                      setShowJoinForm(false);
                      setPassId('');
                      setJoinError('');
                    }}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Attendee;
