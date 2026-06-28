import React, { useState, useEffect } from 'react';
import { getEventAttendees, sendEventReminders } from '../services/api';

function Reminders({ event, onBack }) {
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [reminderType, setReminderType] = useState('confirmed');

  useEffect(() => {
    loadAttendees();
  }, [event._id]);

  const loadAttendees = async () => {
    try {
      setLoading(true);
      const response = await getEventAttendees(event._id);
      setAttendees(response.data);
    } catch (err) {
      setError('Failed to load attendees');
    } finally {
      setLoading(false);
    }
  };

  const getRecipientList = () => {
    switch (reminderType) {
      case 'confirmed':
        return attendees.filter(a => a.status === 'yes');
      case 'all':
        return attendees;
      case 'maybe':
        return attendees.filter(a => a.status === 'maybe');
      case 'pending':
        return attendees.filter(a => a.status === 'pending');
      default:
        return [];
    }
  };

  const recipients = getRecipientList();

  const handleSendReminders = async () => {
    if (recipients.length === 0) {
      setError('No attendees to send reminders to');
      return;
    }

    if (!window.confirm(`Send reminder to ${recipients.length} attendee(s)?`)) {
      return;
    }

    setSending(true);
    setError('');
    setSuccess('');

    try {
      const response = await sendEventReminders({
        eventId: event._id,
        reminderType,
        customMessage: customMessage || undefined
      });

      if (response.data) {
        setSuccess(`✓ Reminders sent to ${recipients.length} attendee(s)`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reminders');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="reminders-page">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="loading">Loading attendees...</div>
      </div>
    );
  }

  return (
    <div className="reminders-page">
      <button className="back-btn" onClick={onBack}>← Back</button>

      <section className="reminders-container">
        <div className="reminders-header">
          <h1>Send Reminders</h1>
          <p className="subtitle">{event.title}</p>
        </div>

        <div className="reminder-info">
          <p>Send event reminders and details to your attendees.</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="reminder-type-section">
          <h3>Send reminder to:</h3>
          <div className="radio-group">
            <label className="radio-label">
              <input 
                type="radio" 
                value="confirmed" 
                checked={reminderType === 'confirmed'} 
                onChange={(e) => setReminderType(e.target.value)}
              />
              <span>Confirmed Attendees ({attendees.filter(a => a.status === 'yes').length})</span>
            </label>
            <label className="radio-label">
              <input 
                type="radio" 
                value="maybe" 
                checked={reminderType === 'maybe'} 
                onChange={(e) => setReminderType(e.target.value)}
              />
              <span>Maybe / Pending ({attendees.filter(a => ['maybe', 'pending'].includes(a.status)).length})</span>
            </label>
            <label className="radio-label">
              <input 
                type="radio" 
                value="all" 
                checked={reminderType === 'all'} 
                onChange={(e) => setReminderType(e.target.value)}
              />
              <span>Everyone ({attendees.length})</span>
            </label>
          </div>
        </div>

        <div className="reminder-preview">
          <h3>Reminder Email Preview</h3>
          <div className="email-preview-box">
            <div className="email-subject">📧 <strong>Subject:</strong> Reminder: {event.title}</div>
            <div className="email-body">
              <p><strong>Event:</strong> {event.title}</p>
              <p><strong>Date:</strong> {new Date(event.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
              <p><strong>Time:</strong> {event.startTime || 'TBA'}</p>
              <p><strong>Location:</strong> {event.venue || event.location}</p>
              <p><strong>Dress Code:</strong> {event.dressCode || 'Not specified'}</p>
              <p><strong>Additional Info:</strong> {event.additionalInfo || 'See attached event details'}</p>
              <p>We look forward to seeing you!</p>
            </div>
          </div>
        </div>

        <div className="custom-message-section">
          <label htmlFor="customMsg">Add Custom Message (optional)</label>
          <textarea 
            id="customMsg"
            placeholder="Add any additional message to include in the reminder email..."
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            rows="4"
            className="form-input"
          />
          <small>This will be added to the beginning of the reminder email</small>
        </div>

        <div className="recipient-list">
          <h3>Recipients ({recipients.length})</h3>
          {recipients.length === 0 ? (
            <p className="no-recipients">No attendees to send reminders to</p>
          ) : (
            <div className="recipients-preview">
              {recipients.slice(0, 5).map(attendee => (
                <div key={attendee._id} className="recipient-item">
                  <span className="recipient-name">{attendee.name}</span>
                  <span className="recipient-email">{attendee.email}</span>
                </div>
              ))}
              {recipients.length > 5 && (
                <p className="more-recipients">...and {recipients.length - 5} more</p>
              )}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button 
            className="btn-primary btn-large"
            onClick={handleSendReminders}
            disabled={sending || recipients.length === 0}
          >
            {sending ? `Sending to ${recipients.length} attendees...` : `Send Reminders (${recipients.length})`}
          </button>
          <button className="btn-secondary btn-large" onClick={onBack}>
            Cancel
          </button>
        </div>
      </section>
    </div>
  );
}

export default Reminders;
