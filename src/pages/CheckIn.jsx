import React, { useState, useRef, useEffect, useCallback } from 'react';
import { checkInAttendeeByPass } from '../services/api';

function CheckIn({ event, onBack }) {
  const [passId, setPassId] = useState('');
  const [checkedInAttendee, setCheckedInAttendee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [checkInCount, setCheckInCount] = useState(0);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanTimerRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scannerSupported, setScannerSupported] = useState(true);

  useEffect(() => {
    // Check if BarcodeDetector is available
    if (!('BarcodeDetector' in window)) {
      setScannerSupported(false);
    }
    return () => {
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, []);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    handleCheckIn(passId);
  };

  // QR scanning loop using the built-in BarcodeDetector API
  const scanFrame = useCallback(async () => {
    if (!videoRef.current || !isCameraActive) return;
    
    try {
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const barcodes = await detector.detect(videoRef.current);
      
      for (const barcode of barcodes) {
        if (barcode.rawValue) {
          // Found a QR code — stop scanning and check in
          setIsCameraActive(false);
          if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
          }
          handleCheckIn(barcode.rawValue);
          return;
        }
      }
    } catch (err) {
      // BarcodeDetector may fail on some frames — keep trying
    }

    // Schedule next scan
    scanTimerRef.current = setTimeout(scanFrame, 500);
  }, [isCameraActive]);

  const toggleCamera = async () => {
    if (isCameraActive) {
      setIsCameraActive(false);
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraActive(true);
          // Start scanning after a short delay to let the video stream initialize
          setTimeout(() => { scanFrame(); }, 1000);
        }
      } catch (err) {
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
                <label>Enter Pass ID</label>
                <input 
                  type="text" 
                  placeholder="Enter the pass ID"
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
                  className="camera-video"
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <p className="camera-hint">Point camera at QR code</p>
              </div>
            )}
            {!scannerSupported && (
              <p className="scanner-note">QR scanner requires a Chromium-based browser (Chrome, Edge, Samsung Internet). Use manual entry instead.</p>
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
