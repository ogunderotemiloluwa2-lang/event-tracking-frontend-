import React, { useState, useEffect } from 'react';
import { getEvents, getEventPhotos } from '../services/api';

function Gallery() {
  const [filterEvent, setFilterEvent] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [events, setEvents] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [stats, setStats] = useState({ totalPhotos: 0, contributors: 0, events: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadGalleryData();
  }, []);

  const loadGalleryData = async () => {
    try {
      setLoading(true);
      const response = await getEvents();
      const eventsData = response.data || [];
      setEvents(eventsData);
      
      // Fetch photos for each event from the new endpoint
      const allPhotos = [];
      const contributorsSet = new Set();
      
      for (const event of eventsData) {
        try {
          const photosResponse = await getEventPhotos(event._id);
          const eventPhotos = photosResponse.data?.photos || [];
          
          eventPhotos.forEach((photo) => {
            allPhotos.push({
              id: photo.photoId,
              eventId: event._id,
              eventTitle: event.title,
              caption: photo.photoCaption || photo.fileName,
              timestamp: new Date(photo.uploadedAt).toLocaleTimeString(),
              uploader: photo.uploaderName,
              fileName: photo.fileName,
              downloadUrl: photo.downloadUrl,
              thumbnailUrl: photo.thumbnailUrl
            });
            contributorsSet.add(photo.uploaderName);
          });
        } catch (err) {
          console.warn(`Could not load photos for event ${event._id}:`, err.message);
        }
      }
      
      // Use real photos if available, otherwise show message
      if (allPhotos.length === 0) {
        setPhotos([]);
        setStats({
          totalPhotos: 0,
          contributors: 0,
          events: eventsData.length
        });
        setError('No photos uploaded yet. Attendees can share their photos!');
      } else {
        setPhotos(allPhotos);
        setStats({
          totalPhotos: allPhotos.length,
          contributors: contributorsSet.size,
          events: eventsData.length
        });
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to load gallery data:', err);
      setError('Failed to load photos');
      setLoading(false);
    }
  };

  const filteredPhotos = filterEvent === 'all' 
    ? photos 
    : photos.filter(p => p.eventId == filterEvent);

  const mockEvents = [
    { id: 1, title: 'Summer Tech Meetup', date: 'May 25, 2026', photos: 3 },
    { id: 2, title: 'Innovation Summit', date: 'May 18, 2026', photos: 4 },
  ];

  const displayEvents = events.length > 0 ? events : mockEvents;

  return (
    <div className="gallery-page">
      <header className="gallery-header">
        <div className="gallery-hero">
          <h1>Event Gallery</h1>
          <p>Memories from recent events - captured and shared by attendees</p>
        </div>
      </header>

      <main className="gallery-main">
        <div className="gallery-toolbar">
          <div className="gallery-controls">
            <label>Filter Events:</label>
            <select value={filterEvent} onChange={(e) => setFilterEvent(e.target.value)} className="filter-select">
              <option value="all">All Events</option>
              {displayEvents.map(event => (
                <option key={event._id || event.id} value={event._id || event.id}>
                  {event.title}
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
              Masonry Grid
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
          <div className="gallery-loading">Loading gallery...</div>
        ) : error ? (
          <div className="gallery-error">Error loading gallery. Showing sample data.</div>
        ) : filteredPhotos.length === 0 ? (
          <div className="gallery-empty">No photos yet. Start capturing memories!</div>
        ) : (
          <>
            {viewMode === 'grid' && (
              <div className="gallery-masonry">
                {filteredPhotos.map((photo, idx) => (
                  <div key={photo.id} className={`masonry-item ${idx % 3 === 0 ? 'large' : idx % 5 === 0 ? 'wide' : ''}`}>
                    <div className="photo-container">
                      {photo.thumbnailUrl ? (
                        <a href={photo.downloadUrl} target="_blank" rel="noopener noreferrer">
                          <img src={photo.thumbnailUrl} alt={photo.caption} className="gallery-photo-img" referrerPolicy="no-referrer" />
                        </a>
                      ) : (
                        <div className="photo-placeholder">Photo</div>
                      )}
                      <div className="photo-overlay">
                        <div className="overlay-content">
                          <p className="photo-caption">{photo.caption}</p>
                          <span className="photo-uploader">{photo.uploader}</span>
                          <span className="photo-time">{photo.timestamp}</span>
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
                    <div key={photo.id} className="timeline-card">
                      <div className="card-header">
                        <h3>{photo.caption}</h3>
                        <span className="card-time">{photo.timestamp}</span>
                      </div>
                      {photo.thumbnailUrl ? (
                        <a href={photo.downloadUrl} target="_blank" rel="noopener noreferrer">
                          <img src={photo.thumbnailUrl} alt={photo.caption} className="gallery-photo-img" referrerPolicy="no-referrer" />
                        </a>
                      ) : (
                        <div className="photo-preview">Photo</div>
                      )}
                      <div className="card-footer">
                        <span className="uploader">Captured by {photo.uploader}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="gallery-actions-section">
          <button className="action-btn primary">Upload Your Photos</button>
          <button className="action-btn secondary">Download All</button>
          <button className="action-btn secondary">Share This Gallery</button>
        </div>

        <footer className="gallery-info">
          <p>All photos are automatically organized and backed up to secure cloud storage</p>
        </footer>
      </main>
    </div>
  );
}

export default Gallery;
