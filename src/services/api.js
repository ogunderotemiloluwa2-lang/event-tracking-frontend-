import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Events API
export const getEvents = () => api.get('/events');
export const getEventById = (id) => api.get(`/events/${id}`);
export const createEvent = (data) => api.post('/events', data);
export const updateEvent = (id, data) => api.put(`/events/${id}`, data);
export const deleteEvent = (id) => api.delete(`/events/${id}`);
export const getOrganizerEvents = (organizerId) => api.get(`/events/organizer/${organizerId}`);
export const getEventByPassId = (passId) => api.get(`/events/by-passid/${passId}`);
export const joinEventByPassId = (passId, userId) => api.post('/events/join-by-passid', { passId, userId });
export const getUserEvents = (userId) => api.get(`/events/by-user/${userId}`);
export const leaveEventByPassId = (passId, userId) => api.post('/events/leave-by-passid', { passId, userId });
export const confirmAttendee = (eventId, attendeeId) => api.post(`/events/${eventId}/confirm-attendee`, { attendeeId });

// Attendees API
export const getAttendees = (eventId) => api.get(`/events/${eventId}/attendees`);
export const getEventAttendees = (eventId) => api.get(`/attendees/event/${eventId}`);
export const addAttendee = (eventId, data) => api.post(`/events/${eventId}/attendees`, data);
export const updateAttendeeRSVP = (eventId, attendeeId, status) => 
  api.put(`/events/${eventId}/attendees/${attendeeId}`, { status });
export const submitAttendeeInfo = (data) => api.post('/attendees/info', data);
export const updateAttendeeStatus = (attendeeId, status) => api.put(`/attendees/${attendeeId}`, { status });
export const removeAttendee = (attendeeId) => api.delete(`/attendees/${attendeeId}`);
export const checkInAttendeeByPass = (eventId, passId) => api.post(`/attendees/checkin/${eventId}`, { passId });

// Photos API
export const uploadPhoto = (eventId, passId, file, uploaderName, uploaderEmail, photoCaption) => {
  console.log('uploadPhoto called with eventId:', eventId);
  console.log('Full URL will be:', `/events/${eventId}/photos`);
  const formData = new FormData();
  formData.append('file', file);
  formData.append('passId', passId);
  formData.append('uploaderName', uploaderName);
  formData.append('uploaderEmail', uploaderEmail);
  formData.append('photoCaption', photoCaption || '');
  return api.post(`/events/${eventId}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const getEventPhotos = (eventId) => api.get(`/events/${eventId}/photos-list`);

// Email API
export const sendEmailReminder = (eventId) => api.post(`/events/${eventId}/send-reminders`);
export const sendEventReminders = (data) => api.post('/events/send-reminders', data);

// Auth
export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const verifyCode = (email, code) => api.post('/auth/verify-code', { email, code });
export const resetPassword = (email, code, newPassword, confirmPassword) => 
  api.post('/auth/reset-password', { email, code, newPassword, confirmPassword });

// Google Drive API (OAuth Authentication)
export const getGoogleAuthUrl = () => api.get('/auth/google-auth-url');
export const saveGoogleToken = (userId, accessToken, refreshToken) =>
  api.post('/auth/save-google-token', { userId, accessToken, refreshToken });
export const getGoogleDriveStatus = (userId) => api.get(`/auth/google-drive-status/${userId}`);

export default api;
