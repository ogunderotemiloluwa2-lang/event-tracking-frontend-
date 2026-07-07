import React, { useState, useRef, useEffect, useCallback } from 'react';
import { uploadPhoto } from '../services/api';

const PHOTO_DRAFT_KEY = 'photoUploadDraft';

function PhotoUpload({ event, attendeePassId, onUploadSuccess, onBack }) {
  console.log('PhotoUpload received event:', event);
  console.log('PhotoUpload received attendeePassId:', attendeePassId);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const capturingRef = useRef(false); // Prevents double-capture race condition
  const uploadingRef = useRef(false); // Prevents double-submit race condition
  const selectingRef = useRef(false); // Prevents double-file-select race condition (Android camera fires change event twice)
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  // Restore draft fields so switching apps to find the event code doesn't lose data.
  const [photoCaption, setPhotoCaption] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PHOTO_DRAFT_KEY))?.photoCaption || ''; } catch { return ''; }
  });
  // Name & email removed — only photo + optional caption

  // Persist draft fields to localStorage so they survive page refreshes.
  useEffect(() => {
    try {
      localStorage.setItem(PHOTO_DRAFT_KEY, JSON.stringify({ photoCaption }));
    } catch { /* ignore quota errors */ }
  }, [photoCaption]);

  // Detect how many cameras are available so we can show/hide the switch button.
  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        setHasMultipleCameras(devices.filter(d => d.kind === 'videoinput').length > 1);
      }).catch(() => {});
    }
  }, []);

  const startCamera = useCallback(async () => {
    // getUserMedia only exists in a secure context (https:// or localhost).
    // When a guest opens a shared link over plain http on their phone the API
    // is simply missing, which previously left the button doing nothing.
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Your browser can\u2019t open the camera here. This usually means the page isn\u2019t on a secure (https) link. Use \u201cChoose from Gallery\u201d below, or open the link in Chrome/Safari over https.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      // Keep the stream in a ref and flip the flag so the <video> element gets
      // rendered. The stream is attached in the effect below once it exists in
      // the DOM — attaching here failed because videoRef wasn't mounted yet.
      streamRef.current = stream;
      setIsCameraActive(true);
      setError('');
    } catch (err) {
      console.error('Camera error:', err);
      if (err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setError('Camera permission was blocked. Allow camera access for this site in your browser settings, then try again \u2014 or use \u201cChoose from Gallery\u201d.');
      } else if (err && (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError')) {
        setError('No camera was found on this device. Use \u201cChoose from Gallery\u201d instead.');
      } else {
        setError('Unable to open the camera. Use \u201cChoose from Gallery\u201d, or check your browser camera permissions.');
      }
    }
  }, [facingMode]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const switchCamera = async () => {
    // Stop current stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    // Flip facing mode
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    // Re-acquire stream with new facing mode
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      // Re-attach to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play?.().catch(() => {});
      }
    } catch (err) {
      console.error('Switch camera error:', err);
      setError('Could not switch camera. Your device may only have one camera.');
    }
  };

  // Attach the live stream once the <video> element is actually on screen, and
  // make sure the camera is released if the user leaves the page.
  useEffect(() => {
    if (isCameraActive && !capturedImage && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play?.().catch(() => {});
    }
  }, [isCameraActive, capturedImage]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const capturePhoto = () => {
    // Prevent double-capture race condition — if the user taps the button twice
    // quickly, only the first capture is processed.
    if (capturingRef.current) return;
    capturingRef.current = true;

    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);

      canvasRef.current.toBlob((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setCapturedImage(reader.result);
          setError('');
          capturingRef.current = false;
        };
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.9);

      // The frame is already on the canvas, so release the camera immediately —
      // otherwise the device's camera light/feed stays on during review.
      stopCamera();
    } else {
      capturingRef.current = false;
    }
  };

  const handleFileSelect = (e) => {
    // On some Android phones, the camera input fires the change event TWICE.
    // The first call is the photo from the camera. The second call is triggered
    // when Android saves the photo to the gallery. Guard with a ref so only the
    // first event is processed and the duplicate is silently dropped.
    if (selectingRef.current) return;
    selectingRef.current = true;

    const file = e.target.files && e.target.files[0];
    // Reset the input value so picking the SAME image again still fires onChange.
    if (e.target.value !== undefined) {
      e.target.value = '';
    }

    if (!file) {
      selectingRef.current = false;
      return;
    }

    if (!file.type || !file.type.startsWith('image/')) {
      setError('That file isn\u2019t an image. Please choose a photo (JPG, PNG, etc.).');
      selectingRef.current = false;
      return;
    }

    // Guard very large files so the upload doesn't silently fail on slow links.
    if (file.size > 15 * 1024 * 1024) {
      setError('That image is larger than 15 MB. Please choose a smaller photo.');
      selectingRef.current = false;
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result);
      setError('');
      // Reset the guard after the image is set, so the user can select another
      // photo later if they discard/retake this one.
      selectingRef.current = false;
    };
    reader.onerror = () => {
      setError('Sorry, that image couldn\u2019t be read. Please try another photo.');
      selectingRef.current = false;
    };
    reader.readAsDataURL(file);
  };

  const handleUploadPhoto = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!capturedImage || !event || !attendeePassId) {
      setError('Photo and event information are required');
      return;
    }

    // Prevent double-submit — if already uploading, ignore the click.
    if (uploadingRef.current) return;
    uploadingRef.current = true;
    setUploading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Convert data URL to Blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      // Use timestamp + random suffix so two photos taken in the same
      // millisecond never collide / overwrite each other in Google Drive.
      const uniqueSuffix = Math.random().toString(36).substring(2, 8);
      const file = new File([blob], `photo-${Date.now()}-${uniqueSuffix}.jpg`, { type: 'image/jpeg' });

      console.log('About to upload with event._id:', event?._id);
      console.log('Full event object:', event);

      // Upload photo with metadata
      const uploadResponse = await uploadPhoto(
        event._id, 
        attendeePassId, 
        file,
        photoCaption
      );

      if (uploadResponse.data) {
        setSuccessMessage('✅ Photo uploaded successfully to Google Drive!');
        setCapturedImage(null);
        setPhotoCaption('');
        // Clear the saved draft so a fresh upload starts clean.
        try { localStorage.removeItem(PHOTO_DRAFT_KEY); } catch { /* ignore */ }
        
        // Call callback if provided
        if (onUploadSuccess) {
          onUploadSuccess(uploadResponse.data);
        }

        // Reset after 3 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      }
    } catch (err) {
      // Surface the real backend reason so the attendee/organizer sees the
      // actionable cause (e.g. "organizer hasn't connected Google Drive").
      const data = err.response?.data || {};
      let serverMsg = data.message || data.details || data.error || '';
      // Append the raw Google detail when it adds something beyond the message.
      if (data.error && data.message && !data.message.includes(data.error)) {
        serverMsg = `${data.message} (${data.error})`;
      }
      setError(serverMsg || 'Failed to upload photo. Please try again.');
      console.error('Upload error:', err, 'response:', data);
    } finally {
      setUploading(false);
      uploadingRef.current = false;
    }
  };

  const discardPhoto = () => {
    setCapturedImage(null);
    setPhotoCaption('');
    setError('');
  };

  return (
    <div className="photo-upload-page">
      <div className="photo-upload-container">
        <div className="photo-upload-header">
          <h2>📸 Capture Event Moment</h2>
          <p>Share your photos from {event?.title}</p>
          {onBack && (
            <button className="btn-back" onClick={onBack}>← Back</button>
          )}
        </div>

        {!capturedImage ? (
          <div className="camera-section">
            <div className="camera-modes">
              {!isCameraActive ? (
                <>
                  <button className="btn-primary-large" onClick={startCamera}>
                    📱 Open In-Browser Camera
                  </button>
                  <div className="divider">or</div>
                  {/* Native phone camera — opens the device's own camera app on mobile */}
                  <button
                    className="btn-primary-large"
                    style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}
                    onClick={() => {
                      // Use capture attribute to open native camera directly
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.capture = 'environment';
                      input.onchange = (e) => handleFileSelect(e);
                      input.click();
                    }}
                  >
                    📷 Use Phone Camera
                  </button>
                </>
              ) : null}
              
              <div className="divider">or</div>
              
              <button 
                className="btn-secondary-large"
                onClick={() => fileInputRef.current?.click()}
              >
                📁 Choose from Gallery
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            {isCameraActive && (
              <div className="camera-fullscreen">
                <video 
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                />
                <div className="camera-controls-overlay">
                  {hasMultipleCameras && (
                    <button className="camera-btn" onClick={switchCamera} title="Switch Camera">
                      🔄 Switch
                    </button>
                  )}
                  <button className="camera-btn camera-btn-capture" onClick={capturePhoto} title="Capture">
                        📸
                  </button>
                  <button className="camera-btn" onClick={stopCamera} title="Close Camera">
                    ✕ Close
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="error-alert">{error}</div>
            )}
          </div>
        ) : (
          <div className="photo-review-section">
            <div className="photo-preview">
              <img src={capturedImage} alt="Captured photo" style={{ maxWidth: '100%', borderRadius: '12px' }} />
            </div>

            <div className="photo-upload-form">
              <div className="form-field">
                <label htmlFor="caption">Photo Caption (Optional)</label>
                <input
                  id="caption"
                  type="text"
                  placeholder="Add a caption to your photo..."
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  className="input-large"
                  maxLength="200"
                />
                <small>{photoCaption.length}/200</small>
              </div>

              {error && <div className="error-alert">{error}</div>}
              {successMessage && <div className="success-alert">{successMessage}</div>}

              <div className="form-actions">
                <button 
                  type="button"
                  className="btn-secondary-large"
                  onClick={discardPhoto}
                  disabled={uploading}
                >
                  ↩️ Retake
                </button>
                <button 
                  type="button"
                  className="btn-primary-large"
                  disabled={uploading}
                  onClick={handleUploadPhoto}
                >
                  {uploading ? '📤 Uploading...' : '✓ Upload Photo'}
                </button>
              </div>

              <div className="photo-info-note">
                <p>💡 <strong>Note:</strong> Your photo will be automatically saved to the event organizer's Google Drive and appear in the event gallery.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

export default PhotoUpload;
