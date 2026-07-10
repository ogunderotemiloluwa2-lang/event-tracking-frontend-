import React, { useState, useRef, useEffect, useCallback } from 'react';
import { uploadPhoto } from '../services/api';

const PHOTO_DRAFT_KEY = 'photoUploadDraft';

function PhotoUpload({ event, attendeePassId, user, onUploadSuccess, onBack }) {
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
  const capturingRef = useRef(false);
  const uploadingRef = useRef(false);
  const selectingRef = useRef(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [photoCaption, setPhotoCaption] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PHOTO_DRAFT_KEY))?.photoCaption || ''; } catch { return ''; }
  });

  useEffect(() => {
    try {
      localStorage.setItem(PHOTO_DRAFT_KEY, JSON.stringify({ photoCaption }));
    } catch { /* ignore quota errors */ }
  }, [photoCaption]);

  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        setHasMultipleCameras(devices.filter(d => d.kind === 'videoinput').length > 1);
      }).catch(() => {});
    }
  }, []);

  // Callback ref — assigns the stream to the <video> the moment it mounts,
  // avoiding the timing race of waiting for a useEffect after setIsCameraActive.
  const setVideoRef = useCallback((node) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch(() => {});
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Your browser cannot open the camera here. This usually means the page is not on a secure (https) link. Use "Choose from Gallery" below, or open the link in Chrome/Safari over https.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      setError('');
    } catch (err) {
      console.error('Camera error:', err);
      if (err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setError('Camera permission was blocked. Allow camera access for this site in your browser settings, then try again or use "Choose from Gallery".');
      } else if (err && (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError')) {
        setError('No camera was found on this device. Use "Choose from Gallery" instead.');
      } else {
        setError('Unable to open the camera. Use "Choose from Gallery" or check your browser camera permissions.');
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play?.().catch(() => {});
      }
    } catch (err) {
      console.error('Switch camera error:', err);
      setError('Could not switch camera. Your device may only have one camera.');
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const capturePhoto = () => {
    if (capturingRef.current) return;
    capturingRef.current = true;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      // If the video hasn't loaded yet, use a fallback size
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, width, height);

      canvas.toBlob((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setCapturedImage(reader.result);
          setError('');
          capturingRef.current = false;
        };
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.9);

      stopCamera();
    } else {
      capturingRef.current = false;
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files && e.target.files[0];

    // Reset the input value so the same file can be re-selected next time
    if (e.target) e.target.value = '';

    if (!file) {
      return;
    }

    if (selectingRef.current) return;
    selectingRef.current = true;

    if (!file.type || !file.type.startsWith('image/')) {
      setError('That file is not an image. Please choose a photo (JPG, PNG, etc.).');
      selectingRef.current = false;
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('That image is larger than 15 MB. Please choose a smaller photo.');
      selectingRef.current = false;
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result);
      setError('');
      selectingRef.current = false;
    };
    reader.onerror = () => {
      setError('Sorry, that image could not be read. Please try another photo.');
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

    if (uploadingRef.current) return;
    uploadingRef.current = true;
    setUploading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      const uniqueSuffix = Math.random().toString(36).substring(2, 8);
      const file = new File([blob], `photo-${Date.now()}-${uniqueSuffix}.jpg`, { type: 'image/jpeg' });

      console.log('About to upload with event._id:', event?._id);
      console.log('Full event object:', event);

      const uploadResponse = await uploadPhoto(
        event._id, 
        attendeePassId, 
        file,
        photoCaption,
        user?.name || 'Guest'
      );

      if (uploadResponse.data) {
        setSuccessMessage('Photo uploaded successfully to Google Drive!');
        setCapturedImage(null);
        setPhotoCaption('');
        try { localStorage.removeItem(PHOTO_DRAFT_KEY); } catch { /* ignore */ }
        
        if (onUploadSuccess) {
          onUploadSuccess(uploadResponse.data);
        }

        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      }
    } catch (err) {
      const data = err.response?.data || {};
      let serverMsg = data.message || data.details || data.error || '';
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
          <h2>Capture Event Moment</h2>
          <p>Share your photos from {event?.title}</p>
          {onBack && (
            <button className="btn-back" onClick={onBack}>Back</button>
          )}
        </div>

        {!capturedImage ? (
          <div className="camera-section">
            <div className="camera-modes">
              {!isCameraActive ? (
                <>
                  <button className="btn-primary-large" onClick={startCamera}>
                    Open In-Browser Camera
                  </button>
                  <div className="divider">or</div>
                  {/* Native phone camera — opens the device's own camera app on mobile */}
                  <button
                    className="btn-primary-large btn-camera-native"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.capture = 'environment';
                      input.onchange = (e) => handleFileSelect(e);
                      input.click();
                    }}
                  >
                    Use Phone Camera
                  </button>
                </>
              ) : null}
              
              <div className="divider">or</div>
              
              <button 
                className="btn-secondary-large"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose from Gallery
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
                  ref={setVideoRef}
                  autoPlay
                  playsInline
                  muted
                />
                <div className="camera-controls-overlay">
                  {hasMultipleCameras && (
                    <button className="camera-btn camera-btn-switch" onClick={switchCamera} title="Switch Camera">
                      Switch
                    </button>
                  )}
                  <button className="camera-btn camera-btn-capture" onClick={capturePhoto} title="Capture">
                    Capture
                  </button>
                  <button className="camera-btn camera-btn-close" onClick={stopCamera} title="Close Camera">
                    Close
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
            <div className="photo-preview-container">
              <img src={capturedImage} alt="Captured photo" className="photo-preview-image" />
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

              <div className="form-actions photo-actions">
                <button 
                  type="button"
                  className="btn-delete-photo"
                  onClick={discardPhoto}
                  disabled={uploading}
                >
                  Delete Photo
                </button>
                <button 
                  type="button"
                  className="btn-primary-large"
                  disabled={uploading}
                  onClick={handleUploadPhoto}
                >
                  {uploading ? 'Uploading...' : 'Upload Photo'}
                </button>
              </div>

              <div className="photo-info-note">
                <p><strong>Note:</strong> Your photo will be automatically saved to the event organizer's Google Drive and appear in the event gallery.</p>
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
