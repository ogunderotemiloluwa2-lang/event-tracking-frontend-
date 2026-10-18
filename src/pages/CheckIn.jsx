import React, { useState, useEffect } from 'react';
import { checkInAttendeeByPass, getEventAttendees } from '../services/api';

function CheckIn({ event, onBack }) {
  const [checkedInAttendee, setCheckedInAttendee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [attendees, setAttendees] = useState([]);
  const [attendeesLoading, setAttendeesLoading] = useState(true);

  // Load attendees for this event so the organizer can check in with one click.
  useEffect(() => {
    const loadAttendees = async () => {
      try {
        const res = await getEventAttendees(event._id);
        setAttendees(res.data || []);
      } catch (err) {
        setAttendees([]);
      } finally {
        setAttendeesLoading(false);
      }
    };
    loadAttendees();
  }, [event._id]);

  // The counter is derived from the attendee list so it always reflects the
  // real number of checked-in guests, including on page reload.
  const checkInCount = attendees.filter(a => a.status === 'checked-in').length;

  const markCheckedIn = (attendeeId) => {
    setAttendees(prev =>
      prev.map(a => (a._id === attendeeId ? { ...a, status: 'checked-in' } : a))
    );
  };

  const handleCheckIn = async (attendee) => {
    if (!attendee.passId) return;

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await checkInAttendeeByPass(event._id, attendee.passId.toUpperCase());
      
      if (response.data) {
        const data = response.data;
        setCheckedInAttendee(data);
        setSuccessMessage(
          data.alreadyCheckedIn
            ? `✓ ${data.name} already checked in!`
            : `✓ Welcome ${data.name}!`
        );
        markCheckedIn(attendee._id);

        setTimeout(() => {
          setCheckedInAttendee(null);
          setSuccessMessage('');
        }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Check-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkin-page">
      <button className="back-btn" onClick={onBack}>← Back</button>

      <section className="checkin-container">
        <div className="checkin-header">
          <h1>Event Check-In</h1>
          <p className="subtitle">{event.title}</p>
          <div className="checkin-counter">
            <span className="counter-label">Checked In:</span>
            <span className="counter-value">{checkInCount}</span>
          </div>
        </div>

        {successMessage && (
          <div className="success-message">
            <div className="success-icon">✓</div>
            <p>{successMessage}</p>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <div className="checkin-methods">
          <div className="method-section">
            <h3>Attendee List</h3>
            {attendeesLoading ? (
              <p className="loading-hint">Loading attendees...</p>
            ) : attendees.length === 0 ? (
              <p className="loading-hint">No attendees have joined yet.</p>
            ) : (
              <div className="attendee-checkin-list">
                {attendees.map(attendee => {
                  const isCheckedIn = attendee.status === 'checked-in';
                  return (
                  <div key={attendee._id} className="attendee-checkin-row">
                    <div className="attendee-info">
                      <span className="attendee-name">{attendee.name || 'Attendee'}</span>
                      {attendee.email && <span className="attendee-email">{attendee.email}</span>}
                    </div>
                    <button
                      className={`btn-checkin-attendee${isCheckedIn ? ' is-checked-in' : ''}`}
                      onClick={() => handleCheckIn(attendee)}
                      disabled={loading || !attendee.passId || isCheckedIn}
                      title={isCheckedIn ? 'Already checked in' : (attendee.passId ? `Check in ${attendee.name || 'this attendee'}` : 'No pass ID available')}
                    >
                      {isCheckedIn ? '✓ Checked In' : 'Check In'}
                    </button>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {checkedInAttendee && (
          <div className="checkin-result">
            <h3>Checked In: {checkedInAttendee.name}</h3>
            <p>Guests: {checkedInAttendee.guestCount || 1}</p>
            {checkedInAttendee.dietaryRestrictions && (
              <p className="dietary-note">🥗 Dietary: {checkedInAttendee.dietaryRestrictions}</p>
            )}
            {checkedInAttendee.specialRequests && (
              <p className="special-note">⭐ {checkedInAttendee.specialRequests}</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default CheckIn;
