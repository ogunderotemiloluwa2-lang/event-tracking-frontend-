import React, { useState, useEffect } from 'react';
import { getOrganizerEvents, createEvent, getGoogleAuthUrl, saveGoogleToken, getGoogleDriveStatus } from '../services/api';

function Dashboard({ user, onNavigate }) {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    venue: '',
    timeZone: 'UTC',
    dressCode: '',
    ageRestriction: '',
    additionalInfo: '',
    expectedAttendees: 0,
    capacity: 0,
    googleDriveFolderLink: ''
  });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [stats, setStats] = useState({ total: 0, confirmed: 0, photos: 0 });
  const [driveConnected, setDriveConnected] = useState(false);
  const [connectingDrive, setConnectingDrive] = useState(false);
  const [driveMessage, setDriveMessage] = useState('');

  const handleNavigation = (page, data = {}) => {
    if (onNavigate) {
      onNavigate(page, data);
    }
  };

  useEffect(() => {
    if (user && user.id) {
      loadEvents();
      checkDriveStatus();
    }
  }, [user]);

  const checkDriveStatus = async () => {
    try {
      const res = await getGoogleDriveStatus(user.id);
      setDriveConnected(!!res.data?.hasGoogleDrive);
    } catch (err) {
      console.warn('Could not check Google Drive status:', err.message);
    }
  };

  // Open Google's OAuth consent in a popup, then save the returned tokens
  // against the organizer's account.
  const handleConnectDrive = async () => {
    setConnectingDrive(true);
    setDriveMessage('');
    try {
      const res = await getGoogleAuthUrl();
      const authUrl = res.data?.authUrl;
      if (!authUrl) {
        setDriveMessage('Google OAuth is not configured on the server.');
        setConnectingDrive(false);
        return;
      }

      const popup = window.open(authUrl, 'google-drive-auth', 'width=600,height=700');

      // If the browser blocked the popup, window.open returns null. Without this
      // guard the spinner would stay on "Connecting…" forever with no explanation.
      if (!popup) {
        setDriveMessage('Your browser blocked the Google sign-in popup. Allow popups for this site and click "Connect Google Drive" again.');
        setConnectingDrive(false);
        return;
      }

      const handleMessage = async (event) => {
        if (!event.data || event.data.type !== 'google-auth-success') return;
        window.removeEventListener('message', handleMessage);
        const { accessToken, refreshToken } = event.data;
        try {
          await saveGoogleToken(user.id, accessToken, refreshToken);
          setDriveConnected(true);
          setDriveMessage('Google Drive connected! Guest photos will now upload to your Drive.');
        } catch (err) {
          setDriveMessage('Failed to save Google Drive connection: ' + (err.response?.data?.message || err.message));
        } finally {
          setConnectingDrive(false);
          if (popup && !popup.closed) popup.close();
        }
      };

      window.addEventListener('message', handleMessage);

      // Safety: if the popup is closed without completing, stop the spinner
      const poll = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(poll);
          window.removeEventListener('message', handleMessage);
          setConnectingDrive(false);
        }
      }, 800);
    } catch (err) {
      setDriveMessage('Could not start Google connection: ' + (err.response?.data?.message || err.message));
      setConnectingDrive(false);
    }
  };

  const loadEvents = async () => {
    try {
      const response = await getOrganizerEvents(user.id);
      setEvents(response.data);
      calculateStats(response.data);
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

  const calculateStats = (eventsList) => {
    const totalAttendees = eventsList.reduce((acc, e) => acc + (e.attendees?.length || 0), 0);
    const confirmed = eventsList.reduce((acc, e) => acc + (e.attendees?.filter(a => a.status === 'confirmed')?.length || 0), 0);
    const photos = eventsList.reduce((acc, e) => acc + (e.photos?.length || 0), 0);
    setStats({ total: totalAttendees, confirmed, photos });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'expectedAttendees' || name === 'capacity' ? parseInt(value) : value
    }));
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      const response = await createEvent({
        ...formData,
        organizerId: user.id
      });
      setEvents([...events, response.data]);
      setFormData({ 
        title: '', 
        description: '', 
        date: '', 
        startTime: '', 
        endTime: '', 
        location: '', 
        venue: '', 
        timeZone: 'UTC', 
        dressCode: '', 
        ageRestriction: '', 
        additionalInfo: '', 
        expectedAttendees: 0, 
        capacity: 0
      });
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  const downloadQRCode = (eventId) => {
    const qrCode = document.getElementById(`qr-${eventId}`);
    const url = qrCode.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `pass-${eventId}.png`;
    link.click();
  };

  return (
    <div className="dashboard">
      <section className="dashboard-hero">
        <div className="hero-content">
          <div>
            <h1>Your Events</h1>
            <p className="subtitle">Create and manage events effortlessly</p>
          </div>
          <button className="btn-create-hero" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'New Event'}
          </button>
        </div>
      </section>

      {/* Organizer Profile Section */}
      <section className="organizer-profile">
        <div className="profile-card">
          <div className="profile-info">
            <h2>{user?.name}</h2>
            <p className="organization">{user?.organization}</p>
            <p className="email">{user?.email}</p>
            <p className="cloud-status">
              {driveConnected
                ? 'Google Drive connected — guest photos upload to your Drive'
                : 'Google Drive not connected — connect it so guest photos can be saved'}
            </p>
            {!driveConnected && (
              <>
                <button
                  className="btn-primary"
                  onClick={handleConnectDrive}
                  disabled={connectingDrive}
                  style={{ marginTop: '8px' }}
                >
                  {connectingDrive ? 'Connecting…' : 'Connect Google Drive'}
                </button>

                {/* Plain-language walk-through of the Google screens, so even a
                    first-time user knows exactly what to expect and tap. */}
                <div className="drive-help">
                  <p className="drive-help-title">What happens when you click connect:</p>
                  <ol className="drive-help-steps">
                    <li>A Google window opens. Choose the Google account where you want guest photos saved.</li>
                    <li>
                      Google may show a screen that says
                      <strong> “Google hasn’t verified this app.”</strong> This is normal for
                      private apps. Click <strong>Advanced</strong>, then click
                      <strong> “Go to EventFlow (unsafe)”</strong> — it is safe; this only
                      means the app is still under review.
                    </li>
                    <li>
                      On the next screen Google asks if you trust EventFlow with your Drive.
                      Click <strong>Continue</strong> / <strong>Allow</strong>. This lets
                      EventFlow save your guests’ event photos into your own Drive — nothing
                      else, and you can disconnect any time from your Google account.
                    </li>
                    <li>The window closes by itself and you’ll see “connected” here.</li>
                  </ol>
                </div>
              </>
            )}
            {driveMessage && (
              <p className="cloud-status" style={{ marginTop: '8px' }}>{driveMessage}</p>
            )}
          </div>
        </div>
      </section>

      <section className="dashboard-container">
        <div className="stats-column">
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Total Attendees</div>
            </div>
          </div>
          <div className="stat-card highlight">
            <div className="stat-content">
              <div className="stat-number">{stats.confirmed}</div>
              <div className="stat-label">Confirmed</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-number">{stats.photos}</div>
              <div className="stat-label">Photos</div>
            </div>
          </div>
        </div>

        <div className="events-column">
          <div className="events-header">
            <h2>Events</h2>
            {events.length > 0 && <span className="event-count">{events.length}</span>}
          </div>

          {showForm && (
            <form className="event-creation-form" onSubmit={handleCreateEvent}>
              <h3>Create New Event</h3>
              <div className="form-row">
                <div className="form-group full">
                  <label>Event Title</label>
                  <input 
                    type="text" 
                    name="title" 
                    placeholder="e.g., Tech Conference 2026" 
                    value={formData.title} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date</label>
                  <input 
                    type="date" 
                    name="date" 
                    value={formData.date} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Start Time</label>
                  <input 
                    type="time" 
                    name="startTime" 
                    value={formData.startTime} 
                    onChange={handleInputChange} 
                  />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input 
                    type="time" 
                    name="endTime" 
                    value={formData.endTime} 
                    onChange={handleInputChange} 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Location/City</label>
                  <input 
                    type="text" 
                    name="location" 
                    placeholder="e.g., New York" 
                    value={formData.location} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Venue Name</label>
                  <input 
                    type="text" 
                    name="venue" 
                    placeholder="e.g., Convention Center" 
                    value={formData.venue} 
                    onChange={handleInputChange} 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Time Zone</label>
                  <select 
                    name="timeZone" 
                    value={formData.timeZone} 
                    onChange={handleInputChange}
                  >
                    <option value="UTC">UTC</option>
                    <option value="EST">EST (Eastern Standard)</option>
                    <option value="CST">CST (Central Standard)</option>
                    <option value="MST">MST (Mountain Standard)</option>
                    <option value="PST">PST (Pacific Standard)</option>
                    <option value="GMT">GMT (Greenwich Mean)</option>
                    <option value="IST">IST (Indian Standard)</option>
                    <option value="JST">JST (Japan Standard)</option>
                    <option value="AEST">AEST (Australia Eastern)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Dress Code</label>
                  <input 
                    type="text" 
                    name="dressCode" 
                    placeholder="e.g., Business Casual, Formal" 
                    value={formData.dressCode} 
                    onChange={handleInputChange} 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Age Restriction</label>
                  <input 
                    type="text" 
                    name="ageRestriction" 
                    placeholder="e.g., 18+, 21+, All Ages" 
                    value={formData.ageRestriction} 
                    onChange={handleInputChange} 
                  />
                </div>
                <div className="form-group">
                  <label>Expected Attendees</label>
                  <input 
                    type="number" 
                    name="expectedAttendees" 
                    placeholder="0" 
                    value={formData.expectedAttendees} 
                    onChange={handleInputChange} 
                  />
                </div>
                <div className="form-group">
                  <label>Venue Capacity</label>
                  <input 
                    type="number" 
                    name="capacity" 
                    placeholder="0" 
                    value={formData.capacity} 
                    onChange={handleInputChange} 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full">
                  <label>Description</label>
                  <textarea 
                    name="description" 
                    placeholder="Tell attendees about your event..." 
                    value={formData.description} 
                    onChange={handleInputChange}
                    rows="3"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full">
                  <label>Google Drive Folder Link (for Photos)</label>
                  <input 
                    type="text" 
                    name="googleDriveFolderLink" 
                    placeholder="https://drive.google.com/drive/folders/..." 
                    value={formData.googleDriveFolderLink} 
                    onChange={handleInputChange}
                  />
                  <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
                    All photos will be uploaded directly to this Google Drive folder.
                    <br/>Create a folder in Google Drive, share it (Anyone with the link), then paste the link here.
                    <br/>Photos go directly to your Drive — never stored on our servers.
                  </small>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">Create Event</button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          )}

          <div className="events-list">
            {events.length === 0 ? (
              <div className="empty-state">
                <h3>No events yet</h3>
                <p>Create your first event to get started</p>
              </div>
            ) : (
              events.map(event => (
                <div key={event._id} className="event-card" onClick={() => setSelectedEvent(event)}>
                  <div className="event-card-header">
                    <h3>{event.title}</h3>
                    <button className="btn-options">⋮</button>
                  </div>
                  
                  {/* Pass ID Section */}
                  <div className="pass-id-section">
                    <div className="pass-id-label">Pass ID for Attendees:</div>
                    <div className="pass-id-code">{event.passId}</div>
                  </div>

                  <div className="event-card-info">
                    <div className="info-item">
                      <span>{event.location}</span>
                    </div>
                    <div className="info-item">
                      <span>{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  
                  <div className="event-card-stats">
                    <div className="stat">
                      <span className="stat-value">{event.attendees?.length || 0}</span>
                      <span className="stat-name">Total</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{event.attendees?.filter(a => a.status === 'confirmed').length || 0}</span>
                      <span className="stat-name">Confirmed</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{event.photos?.length || 0}</span>
                      <span className="stat-name">Photos</span>
                    </div>
                  </div>

                  {/* QR Code Section */}
                  {event.qrCode && (
                    <div className="qr-section">
                      <img src={event.qrCode} alt="QR Code" className="qr-display" id={`qr-${event._id}`} />
                      <button className="btn-qr" onClick={(e) => {
                        e.stopPropagation();
                        downloadQRCode(event._id);
                      }}>Download QR Code</button>
                    </div>
                  )}

                  {/* Event Management Actions */}
                  <div className="event-actions">
                    <button 
                      className="btn-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigation('attendee-management', { event });
                      }}
                    >
                      Manage Attendees
                    </button>
                    <button 
                      className="btn-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigation('checkin', { event });
                      }}
                    >
                      Check-In
                    </button>
                    <button 
                      className="btn-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigation('reminders', { event });
                      }}
                    >
                      Send Reminders
                    </button>
                    <button 
                      className="btn-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigation('analytics', { event });
                      }}
                    >
                      Analytics
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {selectedEvent && (
        <section className="event-details-modal">
          <div className="modal-content">
            <button className="close-btn" onClick={() => setSelectedEvent(null)}>✕</button>
            <h2>{selectedEvent.title}</h2>
            <p>{selectedEvent.description}</p>
            
            <div className="event-details">
              <span><strong>Location:</strong> {selectedEvent.location}</span>
              <span><strong>Date:</strong> {new Date(selectedEvent.date).toLocaleDateString()}</span>
              <span><strong>Time:</strong> {new Date(selectedEvent.date).toLocaleTimeString()}</span>
              <span><strong>Attendees:</strong> {selectedEvent.attendees?.length || 0} / {selectedEvent.capacity} Capacity</span>
            </div>

            <h4>Attendees List</h4>
            <ul className="attendees-list">
              {selectedEvent.attendees && selectedEvent.attendees.length > 0 ? (
                selectedEvent.attendees.map(attendee => (
                  <li key={attendee._id}>
                    <span>{attendee.name}</span>
                    <span style={{ 
                      backgroundColor: attendee.status === 'yes' ? '#10b981' : '#ef4444',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      fontWeight: '600'
                    }}>
                      {attendee.status}
                    </span>
                  </li>
                ))
              ) : (
                <li>No attendees yet</li>
              )}
            </ul>

            <button className="btn-secondary" onClick={() => setSelectedEvent(null)}>Close</button>
          </div>
        </section>
      )}
    </div>
  );
}

export default Dashboard;
