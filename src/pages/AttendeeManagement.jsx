import React, { useState, useEffect } from 'react';
import { getEventAttendees, updateAttendeeStatus, removeAttendee } from '../services/api';

function AttendeeManagement({ event, onBack }) {
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

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
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (attendeeId, newStatus) => {
    try {
      await updateAttendeeStatus(attendeeId, newStatus);
      setAttendees(attendees.map(a => 
        a._id === attendeeId ? { ...a, status: newStatus } : a
      ));
    } catch (err) {
      setError('Failed to update attendee status');
    }
  };

  const handleRemoveAttendee = async (attendeeId) => {
    if (window.confirm('Are you sure you want to remove this attendee?')) {
      try {
        await removeAttendee(attendeeId);
        setAttendees(attendees.filter(a => a._id !== attendeeId));
      } catch (err) {
        setError('Failed to remove attendee');
      }
    }
  };

  const filteredAttendees = filterStatus === 'all' 
    ? attendees 
    : attendees.filter(a => a.status === filterStatus);

  const stats = {
    total: attendees.length,
    confirmed: attendees.filter(a => a.status === 'yes').length,
    maybe: attendees.filter(a => a.status === 'maybe').length,
    declined: attendees.filter(a => a.status === 'no').length,
    pending: attendees.filter(a => a.status === 'pending').length
  };

  if (loading) {
    return (
      <div className="attendee-management-page">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="loading">Loading attendees...</div>
      </div>
    );
  }

  return (
    <div className="attendee-management-page">
      <button className="back-btn" onClick={onBack}>← Back</button>

      <section className="attendee-management-container">
        <div className="management-header">
          <h1>Attendee Management</h1>
          <p className="subtitle">{event.title}</p>
        </div>

        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Total Registered</div>
          </div>
          <div className="stat-card confirmed">
            <div className="stat-number">{stats.confirmed}</div>
            <div className="stat-label">Confirmed</div>
          </div>
          <div className="stat-card maybe">
            <div className="stat-number">{stats.maybe}</div>
            <div className="stat-label">Maybe</div>
          </div>
          <div className="stat-card declined">
            <div className="stat-number">{stats.declined}</div>
            <div className="stat-label">Declined</div>
          </div>
          <div className="stat-card pending">
            <div className="stat-number">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>

        <div className="filter-section">
          <label>Filter by Status:</label>
          <div className="filter-buttons">
            {['all', 'yes', 'maybe', 'no', 'pending'].map(status => (
              <button
                key={status}
                className={`filter-btn ${filterStatus === status ? 'active' : ''}`}
                onClick={() => setFilterStatus(status)}
              >
                {status === 'all' ? 'All' : status === 'yes' ? 'Confirmed' : status === 'no' ? 'Declined' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {filteredAttendees.length === 0 ? (
          <div className="empty-state">
            <p>No attendees with this status</p>
          </div>
        ) : (
          <div className="attendees-table-container">
            <table className="attendees-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Guests</th>
                  <th>Dietary Restrictions</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendees.map(attendee => (
                  <tr key={attendee._id} className={`status-${attendee.status}`}>
                    <td className="name-cell">{attendee.name}</td>
                    <td>{attendee.email}</td>
                    <td>{attendee.phone || '-'}</td>
                    <td>{attendee.guestCount || 1}</td>
                    <td className="dietary">{attendee.dietaryRestrictions || '-'}</td>
                    <td>
                      <select 
                        value={attendee.status}
                        onChange={(e) => handleStatusChange(attendee._id, e.target.value)}
                        className="status-select"
                      >
                        <option value="pending">Pending</option>
                        <option value="yes">Confirmed</option>
                        <option value="maybe">Maybe</option>
                        <option value="no">Declined</option>
                      </select>
                    </td>
                    <td>
                      <button 
                        className="btn-remove"
                        onClick={() => handleRemoveAttendee(attendee._id)}
                        title="Remove attendee"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default AttendeeManagement;
