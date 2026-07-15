import React, { useState, useEffect } from 'react';
import { getEventAttendees } from '../services/api';

function Analytics({ event, onBack }) {
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAnalytics();
  }, [event._id]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await getEventAttendees(event._id);
      setAttendees(response.data);
    } catch (err) {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalRegistered: attendees.length,
    confirmed: attendees.filter(a => a.status === 'yes').length,
    maybe: attendees.filter(a => a.status === 'maybe').length,
    declined: attendees.filter(a => a.status === 'no').length,
    pending: attendees.filter(a => a.status === 'pending').length,
    totalGuests: attendees.reduce((sum, a) => sum + (a.guestCount || 1), 0),
    checkedIn: attendees.filter(a => a.checkInTime).length
  };

  const confirmationRate = stats.totalRegistered > 0 
    ? Math.round((stats.confirmed / stats.totalRegistered) * 100) 
    : 0;

  const attendanceRate = stats.totalRegistered > 0 
    ? Math.round((stats.checkedIn / stats.totalRegistered) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="analytics-page">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="loading">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <button className="back-btn" onClick={onBack}>← Back</button>

      <section className="analytics-container">
        <div className="analytics-header">
          <h1>Event Analytics</h1>
          <p className="subtitle">{event.title}</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Key Metrics */}
        <div className="metrics-grid">
          <div className="metric-card primary">
            <div className="metric-number">{stats.totalRegistered}</div>
            <div className="metric-label">Total Registered</div>
            <div className="metric-detail">Capacity: {event.capacity || '∞'}</div>
          </div>

          <div className="metric-card success">
            <div className="metric-number">{stats.confirmed}</div>
            <div className="metric-label">Confirmed</div>
            <div className="metric-detail">{confirmationRate}% confirmation</div>
          </div>

          <div className="metric-card warning">
            <div className="metric-number">{stats.totalGuests}</div>
            <div className="metric-label">Total Guests</div>
            <div className="metric-detail">Including +1s</div>
          </div>

          <div className="metric-card info">
            <div className="metric-number">{stats.checkedIn}</div>
            <div className="metric-label">Checked In</div>
            <div className="metric-detail">{attendanceRate}% attended</div>
          </div>
        </div>

        {/* RSVP Breakdown */}
        <div className="analytics-section">
          <h3>RSVP Status Breakdown</h3>
          <div className="status-breakdown">
            <div className="breakdown-item">
              <div className="breakdown-bar">
                <div className="bar-fill confirmed" style={{ width: `${(stats.confirmed / stats.totalRegistered) * 100}%` }}></div>
              </div>
              <div className="breakdown-info">
                <span className="status-name">✓ Confirmed</span>
                <span className="status-count">{stats.confirmed} ({stats.totalRegistered > 0 ? Math.round((stats.confirmed / stats.totalRegistered) * 100) : 0}%)</span>
              </div>
            </div>

            <div className="breakdown-item">
              <div className="breakdown-bar">
                <div className="bar-fill pending" style={{ width: `${(stats.pending / stats.totalRegistered) * 100}%` }}></div>
              </div>
              <div className="breakdown-info">
                <span className="status-name">⏳ Pending Response</span>
                <span className="status-count">{stats.pending} ({stats.totalRegistered > 0 ? Math.round((stats.pending / stats.totalRegistered) * 100) : 0}%)</span>
              </div>
            </div>

            <div className="breakdown-item">
              <div className="breakdown-bar">
                <div className="bar-fill maybe" style={{ width: `${(stats.maybe / stats.totalRegistered) * 100}%` }}></div>
              </div>
              <div className="breakdown-info">
                <span className="status-name">❓ Maybe</span>
                <span className="status-count">{stats.maybe} ({stats.totalRegistered > 0 ? Math.round((stats.maybe / stats.totalRegistered) * 100) : 0}%)</span>
              </div>
            </div>

            <div className="breakdown-item">
              <div className="breakdown-bar">
                <div className="bar-fill declined" style={{ width: `${(stats.declined / stats.totalRegistered) * 100}%` }}></div>
              </div>
              <div className="breakdown-info">
                <span className="status-name">✕ Declined</span>
                <span className="status-count">{stats.declined} ({stats.totalRegistered > 0 ? Math.round((stats.declined / stats.totalRegistered) * 100) : 0}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dietary Requirements */}
        <div className="analytics-section">
          <h3>Dietary Restrictions</h3>
          <div className="dietary-list">
            {attendees
              .filter(a => a.dietaryRestrictions)
              .map((attendee, idx) => (
                <div key={idx} className="dietary-item">
                  <span className="dietary-icon">🥗</span>
                  <span className="dietary-text">{attendee.name}: {attendee.dietaryRestrictions}</span>
                </div>
              ))}
            {attendees.filter(a => a.dietaryRestrictions).length === 0 && (
              <p className="no-data">No dietary restrictions reported</p>
            )}
          </div>
        </div>

        {/* Special Requests */}
        {attendees.some(a => a.specialRequests) && (
          <div className="analytics-section">
            <h3>Special Requests</h3>
            <div className="requests-list">
              {attendees
                .filter(a => a.specialRequests)
                .map((attendee, idx) => (
                  <div key={idx} className="request-item">
                    <span className="request-name">{attendee.name}</span>
                    <span className="request-text">{attendee.specialRequests}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Export Options */}
        <div className="export-section">
          <h3>Export Data</h3>
          <button className="btn-secondary" onClick={() => {
            if (!attendees || attendees.length === 0) {
              alert('No attendee data to export.');
              return;
            }
            const headers = ['Name', 'Email', 'Phone', 'Status', 'Guests', 'Dietary', 'Requests', 'Check-In Time'];
            const rows = attendees.map(a => [
              a.name || '',
              a.email || '',
              a.phone || '',
              a.status || '',
              a.guestCount || 1,
              a.dietaryRestrictions || '',
              a.specialRequests || '',
              a.checkInTime ? new Date(a.checkInTime).toLocaleString() : ''
            ]);
            const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `attendees-${event?.title || 'export'}.csv`;
            link.click();
            URL.revokeObjectURL(url);
          }}>
            📥 Download Attendee List (CSV)
          </button>
        </div>
      </section>
    </div>
  );
}

export default Analytics;
