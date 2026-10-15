import React, { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import { checkInAttendeeByPass, getEventAttendees } from '../services/api';

function CheckIn({ event, onBack }) {
  const [passId, setPassId] = useState('');
  const [checkedInAttendee, setCheckedInAttendee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [checkInCount, setCheckInCount] = useState(0);
  const [attendees, setAttendees] = useState([]);
  const [attendeesLoading, setAttendeesLoading] = useState(true);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanTimerRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const detectorRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  // Refs mirror state so the scan loop never reads a stale closure value.
  const cameraActiveRef = useRef(false);
  const scanningRef = useRef(false);
  const handleCheckInRef = useRef(null);

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      detectorRef.current = null;
    };
  }, []);

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

  const handleCheckIn = async (code) => {
    if (!code.trim()) return;

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await checkInAttendeeByPass(event._id, code.toUpperCase());
      
      if (response.data) {
        setCheckedInAttendee(response.data);
        setSuccessMessage(`✓ Welcome ${response.data.name}!`);
        setCheckInCount(prev => prev + 1);
        setPassId('');

        setTimeout(() => {
          setCheckedInAttendee(null);
          setSuccessMessage('');
        }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid pass ID. Please try again.');
      setPassId('');
    } finally {
      setLoading(false);
    }
  };

  handleCheckInRef.current = handleCheckIn;

  const handleSubmit = (e) => {
    e.preventDefault();
    handleCheckIn(passId);
  };

  const stopCamera = useCallback(() => {
    cameraActiveRef.current = false;
    scanningRef.current = false;
    setIsCameraActive(false);
    setScanning(false);
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  // QR scanning loop. Uses the native BarcodeDetector when available and falls
  // back to jsQR (canvas pixel decoding) everywhere else, so the scanner works
  // in Safari/Firefox too.
  const scanFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!cameraActiveRef.current || !scanningRef.current || !video) return;

    let decoded = null;

    try {
      if (detectorRef.current) {
        const barcodes = await detectorRef.current.detect(video);
        const hit = barcodes.find(b => b.rawValue);
        if (hit) decoded = hit.rawValue;
      } else if (video.videoWidth && video.videoHeight) {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });
          if (result && result.data) decoded = result.data;
        }
      }
    } catch (err) {
      // Decoding can fail on individual frames — keep scanning.
    }

    if (decoded) {
      stopCamera();
      handleCheckInRef.current?.(decoded);
      return;
    }

    scanTimerRef.current = setTimeout(scanFrame, 400);
  }, [stopCamera]);

  const toggleCamera = async () => {
    if (cameraActiveRef.current) {
      stopCamera();
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Your browser cannot open the camera here. This usually means the page is not on a secure (https) link. Use manual entry instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      if (!videoRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play?.().catch(() => {});

      // Create the detector once (if the browser has it) before scanning starts.
      if (!detectorRef.current && 'BarcodeDetector' in window) {
        try {
          detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
        } catch {
          detectorRef.current = null; // fall back to jsQR
        }
      }

      cameraActiveRef.current = true;
      scanningRef.current = true;
      setIsCameraActive(true);
      setScanning(true);
      setError('');

      // Give the video a moment to produce real frames before decoding.
      scanTimerRef.current = setTimeout(scanFrame, 600);
    } catch (err) {
      if (err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setError('Camera permission was blocked. Allow camera access for this site in your browser settings, then try again.');
      } else if (err && (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError')) {
        setError('No camera was found on this device. Use manual entry instead.');
      } else {
        setError('Unable to access camera. Please use manual entry.');
      }
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
            <h3>Manual Entry</h3>
            <form onSubmit={handleSubmit} className="checkin-form">
              <div className="form-field">
                <label>Enter Attendee Pass ID</label>
                <input 
                  type="text" 
                  placeholder="Enter the attendee's pass ID"
                  value={passId}
                  onChange={(e) => setPassId(e.target.value.toUpperCase())}
                  maxLength="64"
                  disabled={loading}
                  className="form-input large"
                  autoFocus
                />
              </div>
              <button type="submit" className="btn-primary btn-large" disabled={loading}>
                {loading ? 'Checking in...' : 'Check In'}
              </button>
            </form>
          </div>

          <div className="method-divider">OR</div>

          <div className="method-section">
            <h3>Attendee List</h3>
            {attendeesLoading ? (
              <p className="loading-hint">Loading attendees...</p>
            ) : attendees.length === 0 ? (
              <p className="loading-hint">No attendees have joined yet.</p>
            ) : (
              <div className="attendee-checkin-list">
                {attendees.map(attendee => (
                  <div key={attendee._id} className="attendee-checkin-row">
                    <div className="attendee-info">
                      <span className="attendee-name">{attendee.name || 'Attendee'}</span>
                      {attendee.email && <span className="attendee-email">{attendee.email}</span>}
                    </div>
                    <button
                      className="btn-checkin-attendee"
                      onClick={() => handleCheckIn(attendee.passId)}
                      disabled={loading || !attendee.passId}
                      title={attendee.passId ? `Check in ${attendee.name || 'this attendee'}` : 'No pass ID available'}
                    >
                      Check In
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="method-divider">OR</div>

          <div className="method-section">
            <h3>QR Code Scanner</h3>
            <button 
              type="button"
              className={`btn-secondary btn-large ${isCameraActive ? 'active' : ''}`}
              onClick={toggleCamera}
            >
              {isCameraActive ? '📹 Stop Camera' : '📱 Scan QR Code'}
            </button>
            
            {isCameraActive && (
              <div className="camera-container">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline
                  muted
                  className="camera-video"
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <p className="camera-hint">{scanning ? 'Scanning for QR code...' : 'Point camera at QR code'}</p>
              </div>
            )}
            {!('BarcodeDetector' in window) && (
              <p className="scanner-note">Using the built-in QR decoder. For faster scanning, use Chrome, Edge or Samsung Internet.</p>
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
