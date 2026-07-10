import React, { useState, useEffect } from 'react';
import { getEvents, getEventPhotos, deleteEvent, getOrganizerEvents, getUserEvents } from '../services/api';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function Gallery({ user }) {
  const [filterEvent, setFilterEvent] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [events, setEvents] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [stats, setStats] = useState({ totalPhotos: 0, contributors: 0, events: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadGalleryData();
  }, [user]);

  const loadGalleryData = async () => {
    try {
      setLoading(true);

      let eventsData;
      if (user?.role === 'attendee') {
        const resp = await getUserEvents();
        eventsData = resp.data || [];
      } else if (user?.role === 'organizer') {
        const resp = await getOrganizerEvents();
        eventsData = resp.data || [];
      } else {
        const resp = await getEvents();
        eventsData = resp.data || [];
      }

      const seen = new Set();
      const uniqueEvents = eventsData.filter(e => {
        const key = `${e.title}|${e.date}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setEvents(uniqueEvents);
      
      const allPhotos = [];
      const contributorsSet = new Set();
      
      for (const event of uniqueEvents) {
        try {
          const photosResponse = await getEventPhotos(event._id);
          const eventPhotos = photosResponse.data?.photos || [];
          
          eventPhotos.forEach((photo) => {
            // Use the backend proxy URL so images load without Google auth issues
            const proxyUrl = photo.fileId
              ? `${API_BASE}/events/${event._id}/drive-image/${photo.fileId}`
              : null;
            allPhotos.push({
              id: photo.photoId,
              eventId: event._id,
              eventTitle: event.title,
              caption: photo.photoCaption || photo.fileName,
              timestamp: new Date(photo.uploadedAt).toLocaleTimeString(),
              uploader: photo.uploaderName,
              fileName: photo.fileName,
              downloadUrl: photo.downloadUrl,
              thumbnailUrl: proxyUrl || photo.thumbnailUrl,
              fileId: photo.fileId
            });
            if (photo.uploaderName) contributorsSet.add(photo.uploaderName);
          });
        } catch (err) {
          console.warn(`Could not load photos for event ${event._id}:`, err.message);
        }
      }
      
      // Deduplicate photos by fileId to prevent showing the same photo twice
      const seenFileIds = new Set();
      const uniquePhotos = allPhotos.filter(photo => {
        const key = photo.fileId || photo.id;
        if (seenFileIds.has(key)) return false;
        seenFileIds.add(key);
        return true;
      });

      setPhotos(uniquePhotos);
      setStats({
        totalPhotos: uniquePhotos.length,
        contributors: contributorsSet.size,
        events: uniqueEvents.length
      });

      setLoading(false);
    } catch (err) {
      console.error('Failed to load gallery data:', err);
      setError('Failed to load photos');
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteEvent(eventId);
      setEvents(prev => prev.filter(e => e._id !== eventId));
      setPhotos(prev => prev.filter(p => p.eventId !== eventId));
      setStats(prev => ({
        totalPhotos: prev.totalPhotos - photos.filter(p => p.eventId === eventId).length,
        contributors: prev.contributors,
        events: prev.events - 1
      }));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete event:', err);
      alert('Failed to delete event: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeleting(false);
    }
  };

  const filteredPhotos = filterEvent === 'all' 
    ? photos 
    : photos.filter(p => p.eventId == filterEvent);

  const displayEvents = events;

  return (
    <div className="gallery-page">
      <header className="gallery-header">
        <div className="gallery-hero">
          <h1>Event Gallery</h1>
          <p>Memories captured and shared by attendees</p>
        </div>
      </header>

      <main className="gallery-main">
        <div className="gallery-toolbar">
          <div className="gallery-controls">
            <label>Filter Events:</label>
            <select value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)} className="filter-select">
              <option value="all">All Events ({events.length})</option>
              {displayEvents.map(event => (
                <option key={event._id || event.id} value={event._id || event.id}>
                  {event.title} ({photos.filter(p => p.eventId === event._id).length} photos)
                </option>
              ))}
            </select>
          </div>

          <div className="gallery-stats">
            <div className="quick-stat">
              <span className="stat-number">{stats.totalPhotos}</span>
              <span className="stat-name">Total Photos</span>
            </div>
            <div className="quick-stat">
              <span className="stat-number">{stats.contributors}</span>
              <span className="stat-name">Contributors</span>
            </div>
            <div className="quick-stat">
              <span className="stat-number">{stats.events}</span>
              <span className="stat-name">Events</span>
            </div>
          </div>

          <div className="view-switcher">
            <button 
              className={`view-option ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              Grid View
            </button>
            <button 
              className={`view-option ${viewMode === 'timeline' ? 'active' : ''}`}
              onClick={() => setViewMode('timeline')}
            >
              Timeline View
            </button>
          </div>
        </div>

        {loading ? (
          <div className="gallery-loading">
            <div className="loading-spinner"></div>
            <p>Loading gallery...</p>
          </div>
        ) : error ? (
          <div className="gallery-error">
            <span className="error-icon">!</span>
            <p>{error}</p>
            <button className="btn-secondary" onClick={loadGalleryData}>Retry</button>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="gallery-empty">
            <div className="empty-icon">No Photos Yet</div>
            <h3>No photos in this gallery</h3>
            <p>Photos uploaded by attendees will appear here. Share your event pass with guests so they can start capturing memories.</p>
          </div>
        ) : (
          <>
            {viewMode === 'grid' && (
              <div className="gallery-masonry">
                {filteredPhotos.map((photo, idx) => (
                  <div key={photo.id} className={`masonry-item ${idx % 3 === 0 ? 'large' : idx % 5 === 0 ? 'wide' : ''}`}>
                    <div className="photo-container" onClick={() => setLightboxPhoto(photo)}>
                      {photo.thumbnailUrl ? (
                        <img
                          src={photo.thumbnailUrl}
                          alt={photo.caption}
                          className="gallery-photo-img"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.classList.add('img-error');
                          }}
                        />
                      ) : (
                        <div className="photo-placeholder">No Preview</div>
                      )}
                      <div className="photo-overlay">
                        <div className="overlay-content">
                          <p className="photo-caption">{photo.caption}</p>
                          <span className="photo-uploader">{photo.uploader || 'Anonymous'}</span>
                          <span className="photo-time">{photo.timestamp}</span>
                          <span className="photo-event-name">{photo.eventTitle}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'timeline' && (
              <div className="timeline-gallery">
                <div className="timeline-left">
                  <div className="timeline-scroll">
                    {filteredPhotos.map((photo, idx) => (
                      <div key={photo.id} className="timeline-dot">
                        <div className="dot"></div>
                        <span className="dot-label">{photo.timestamp}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="timeline-right">
                  {filteredPhotos.map(photo => (
                    <div key={photo.id} className="timeline-card" onClick={() => setLightboxPhoto(photo)}>
                      <div className="card-header">
                        <h3>{photo.caption}</h3>
                        <span className="card-time">{photo.timestamp}</span>
                      </div>
                      {photo.thumbnailUrl ? (
                        <img
                          src={photo.thumbnailUrl}
                          alt={photo.caption}
                          className="gallery-photo-img"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.classList.add('img-error');
                          }}
                        />
                      ) : (
                        <div className="photo-preview">No Preview</div>
                      )}
                      <div className="card-footer">
                        <span className="uploader">Captured by {photo.uploader || 'Anonymous'}</span>
                        <span className="event-label">{photo.eventTitle}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Lightbox */}
        {lightboxPhoto && (
          <div className="lightbox-overlay" onClick={() => setLightboxPhoto(null)}>
            <div className="lightbox-content" onClick={e => e.stopPropagation()}>
              <button className="lightbox-close" onClick={() => setLightboxPhoto(null)}>Close</button>
              {lightboxPhoto.thumbnailUrl ? (
                <img src={lightboxPhoto.downloadUrl || lightboxPhoto.thumbnailUrl} alt={lightboxPhoto.caption} className="lightbox-image" />
              ) : (
                <div className="lightbox-placeholder">No Preview</div>
              )}
              <div className="lightbox-info">
                <h3>{lightboxPhoto.caption}</h3>
                <p>Uploaded by {lightboxPhoto.uploader || 'Anonymous'}</p>
                <p>{lightboxPhoto.timestamp}</p>
                <p>{lightboxPhoto.eventTitle}</p>
                {lightboxPhoto.downloadUrl && (
                  <a href={lightboxPhoto.downloadUrl} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'inline-block', marginTop: '1rem', textDecoration: 'none' }}>
                    Download Full Size
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="lightbox-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="lightbox-content delete-confirm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', padding: '2rem' }}>
              <h3>Delete Event?</h3>
              <p style={{ margin: '1rem 0', color: '#ccc' }}>
                This will remove the event from the gallery. Photos in Google Drive will not be affected.
              </p>
              <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                <button
                  className="btn-primary"
                  style={{ backgroundColor: '#ef4444' }}
                  onClick={() => handleDeleteEvent(deleteConfirm)}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete Event'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Event cards section */}
        {displayEvents.length > 0 && (
          <div className="gallery-events-section">
            <h2>Events</h2>
            <div className="gallery-event-cards">
              {displayEvents.map(event => {
                const eventPhotoCount = photos.filter(p => p.eventId === event._id).length;
                return (
                  <div key={event._id} className="gallery-event-card">
                    <div className="gallery-event-card-info">
                      <h3>{event.title}</h3>
                      <p>{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      <p>{event.location || 'No location'}</p>
                      <p>{eventPhotoCount} photo{eventPhotoCount !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="gallery-event-card-actions">
                      {user?.role === 'organizer' && (
                        <button
                          className="btn-action btn-delete"
                          onClick={() => setDeleteConfirm(event._id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="gallery-actions-section">
          <button 
            className="action-btn take-photo-btn" 
            onClick={() => {
              if (events.length > 0) {
                const firstEvent = events[0];
                window.location.href = `/?page=photo-upload&eventId=${firstEvent._id}`;
              } else {
                alert('Create an event first to upload photos.');
              }
            }}
          >
            <span className="action-icon">+</span>
            Take Photo
          </button>
          <button className="action-btn secondary" onClick={() => {
            if (photos.length === 0) {
              alert('No photos to download.');
              return;
            }
            photos.forEach(photo => {
              if (photo.downloadUrl) window.open(photo.downloadUrl, '_blank');
            });
          }}>
            Download All
          </button>
          <button className="action-btn secondary" onClick={() => {
            const url = window.location.href;
            if (navigator.share) {
              navigator.share({ title: 'Event Gallery', url }).catch(() => {});
            } else if (navigator.clipboard?.writeText) {
              navigator.clipboard.writeText(url).then(() => alert('Gallery link copied!'));
            } else {
              window.prompt('Copy this gallery link:', url);
            }
          }}>
            Share Gallery
          </button>
        </div>

        <footer className="gallery-info">
          <p>All photos are automatically organised and backed up to secure cloud storage</p>
        </footer>
      </main>
    </div>
  );
}

export default Gallery;
