import React, { useState, useRef } from 'react';
import { uploadPhoto } from '../services/api';

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
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [uploaderName, setUploaderName] = useState('');
  const [uploaderEmail, setUploaderEmail] = useState('');

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        setError('');
      }
    } catch (err) {
      setError('Unable to access camera. Please check permissions.');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
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
        };
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.9);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadPhoto = async (e) => {
    e.preventDefault();
    if (!capturedImage || !event || !attendeePassId) {
      setError('Photo and event information are required');
      return;
    }

    if (!uploaderName.trim() || !uploaderEmail.trim()) {
      setError('Please provide your name and email to upload photos');
      return;
    }

    setUploading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Convert data URL to Blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });

      console.log('About to upload with event._id:', event?._id);
      console.log('Full event object:', event);

      // Upload photo with metadata
      const uploadResponse = await uploadPhoto(
        event._id, 
        attendeePassId, 
        file,
        uploaderName,
        uploaderEmail,
        photoCaption
      );

      if (uploadResponse.data) {
        setSuccessMessage('✅ Photo uploaded successfully to Google Drive!');
        setCapturedImage(null);
        setPhotoCaption('');
        setUploaderName('');
        setUploaderEmail('');
        
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
      setError(err.response?.data?.message || 'Failed to upload photo. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
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
                <button className="btn-primary-large" onClick={startCamera}>
                  📱 Start Camera
                </button>
              ) : (
                <>
                  <button className="btn-secondary-large" onClick={stopCamera}>
                    ✕ Stop Camera
                  </button>
                  <button className="btn-primary-large" onClick={capturePhoto}>
                    📸 Capture Photo
                  </button>
                </>
              )}
              
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
              <div className="camera-preview">
                <video 
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', borderRadius: '12px' }}
                />
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

            <form onSubmit={handleUploadPhoto} className="photo-upload-form">
              <div className="form-field">
                <label htmlFor="name">Your Name *</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={uploaderName}
                  onChange={(e) => setUploaderName(e.target.value)}
                  className="input-large"
                  required
                />
                <small>We'll credit you as the photo contributor</small>
              </div>

              <div className="form-field">
                <label htmlFor="email">Your Email *</label>
                <input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={uploaderEmail}
                  onChange={(e) => setUploaderEmail(e.target.value)}
                  className="input-large"
                  required
                />
                <small>For event organizer contact and photo attribution</small>
              </div>

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
                  type="submit"
                  className="btn-primary-large"
                  disabled={uploading || !uploaderName.trim() || !uploaderEmail.trim()}
                >
                  {uploading ? '📤 Uploading...' : '✓ Upload Photo'}
                </button>
              </div>

              <div className="photo-info-note">
                <p>💡 <strong>Note:</strong> Your photo will be automatically saved to the event organizer's Google Drive and appear in the event gallery.</p>
              </div>
            </form>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

export default PhotoUpload;
