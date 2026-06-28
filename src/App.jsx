import React, { useState, useEffect } from 'react';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Attendee from './pages/Attendee';
import AttendeeInfo from './pages/AttendeeInfo';
import AttendeeManagement from './pages/AttendeeManagement';
import CheckIn from './pages/CheckIn';
import Reminders from './pages/Reminders';
import Analytics from './pages/Analytics';
import Gallery from './pages/Gallery';
import PhotoUpload from './pages/PhotoUpload';
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import VerifyCode from './pages/VerifyCode';
import ResetPassword from './pages/ResetPassword';
import EventDetails from './pages/EventDetails';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [user, setUser] = useState(null);
  const [resetData, setResetData] = useState({ email: '', code: '' });
  const [eventPassId, setEventPassId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [photoUploadData, setPhotoUploadData] = useState({ event: null, attendeePassId: null });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setUser(JSON.parse(localStorage.getItem('user')));
    }
  }, []);

  const handleRoleSelect = (role) => {
    localStorage.setItem('registerRole', role === 'host' ? 'organizer' : 'attendee');
    setCurrentPage('login');
  };

  const handleNavigation = (page, data = {}) => {
    if (page === 'verify-code' || page === 'reset-password') {
      setResetData(data);
    }
    if (page === 'event-details') {
      setEventPassId(data.passId);
    }
    if (['attendee-info', 'attendee-management', 'checkin', 'reminders', 'analytics'].includes(page)) {
      setSelectedEvent(data.event);
    }
    if (page === 'photo-upload') {
      setPhotoUploadData({ event: data.event, attendeePassId: data.attendeePassId });
    }
    setCurrentPage(page);
  };

  const handleBackToLanding = () => {
    setCurrentPage('landing');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <div className="app">
      {currentPage === 'landing' ? (
        <Landing onRoleSelect={handleRoleSelect} onNavigate={handleNavigation} />
      ) : currentPage === 'register' ? (
        <Register
          onRegistered={(user) => {
            setUser(user);
            setCurrentPage(user.role === 'organizer' ? 'dashboard' : 'attendee');
          }}
          onBack={() => handleNavigation('landing')}
        />
      ) : currentPage === 'login' ? (
        <Login
          onLoggedIn={(user) => {
            setUser(user);
            setCurrentPage(user.role === 'organizer' ? 'dashboard' : 'attendee');
          }}
          onBack={() => handleNavigation('landing')}
          onNavigate={handleNavigation}
        />
      ) : currentPage === 'forgot-password' ? (
        <ForgotPassword 
          onBack={() => handleNavigation('login')} 
          onNext={handleNavigation}
        />
      ) : currentPage === 'verify-code' ? (
        <VerifyCode 
          email={resetData.email}
          onBack={() => handleNavigation('forgot-password')} 
          onNext={handleNavigation}
        />
      ) : currentPage === 'reset-password' ? (
        <ResetPassword 
          email={resetData.email}
          code={resetData.code}
          onBack={() => handleNavigation('verify-code')} 
          onSuccess={() => handleNavigation('login')}
        />
      ) : currentPage === 'event-details' ? (
        <div>
          <EventDetails 
            passId={eventPassId}
            user={user}
            onBack={() => handleNavigation('attendee')}
            onNavigate={handleNavigation}
          />
        </div>
      ) : currentPage === 'attendee-info' ? (
        <div>
          <AttendeeInfo 
            event={selectedEvent}
            user={user}
            onBack={() => handleNavigation('event-details', { passId: selectedEvent.passId })}
            onSubmitted={() => handleNavigation('event-details', { passId: selectedEvent.passId })}
          />
        </div>
      ) : currentPage === 'attendee-management' ? (
        <div>
          <nav className="app-nav">
            <div className="nav-brand">EventFlow</div>
            <div className="nav-menu">
              <button className="nav-link" onClick={() => handleNavigation('dashboard')}>Dashboard</button>
              <button className="nav-link" onClick={handleBackToLanding}>Exit</button>
            </div>
          </nav>
          <AttendeeManagement 
            event={selectedEvent}
            onBack={() => handleNavigation('dashboard')}
          />
        </div>
      ) : currentPage === 'checkin' ? (
        <div>
          <nav className="app-nav">
            <div className="nav-brand">EventFlow</div>
            <div className="nav-menu">
              <button className="nav-link" onClick={() => handleNavigation('dashboard')}>Dashboard</button>
              <button className="nav-link" onClick={handleBackToLanding}>Exit</button>
            </div>
          </nav>
          <CheckIn 
            event={selectedEvent}
            onBack={() => handleNavigation('dashboard')}
          />
        </div>
      ) : currentPage === 'reminders' ? (
        <div>
          <nav className="app-nav">
            <div className="nav-brand">EventFlow</div>
            <div className="nav-menu">
              <button className="nav-link" onClick={() => handleNavigation('dashboard')}>Dashboard</button>
              <button className="nav-link" onClick={handleBackToLanding}>Exit</button>
            </div>
          </nav>
          <Reminders 
            event={selectedEvent}
            onBack={() => handleNavigation('dashboard')}
          />
        </div>
      ) : currentPage === 'analytics' ? (
        <div>
          <nav className="app-nav">
            <div className="nav-brand">EventFlow</div>
            <div className="nav-menu">
              <button className="nav-link" onClick={() => handleNavigation('dashboard')}>Dashboard</button>
              <button className="nav-link" onClick={handleBackToLanding}>Exit</button>
            </div>
          </nav>
          <Analytics 
            event={selectedEvent}
            onBack={() => handleNavigation('dashboard')}
          />
        </div>
      ) : currentPage === 'dashboard' ? (
        <div>
          <nav className="app-nav">
            <div className="nav-brand">EventFlow</div>
            <div className="nav-menu">
              <button className="nav-link" onClick={() => handleNavigation('dashboard')}>Host Dashboard</button>
              <button className="nav-link" onClick={() => handleNavigation('gallery')}>Gallery</button>
              <button className="nav-link" onClick={handleBackToLanding}>Exit</button>
            </div>
          </nav>
          <Dashboard user={user} setUser={setUser} onNavigate={handleNavigation} />
        </div>
      ) : currentPage === 'attendee' ? (
        <div>
          <nav className="app-nav">
            <div className="nav-brand">EventFlow</div>
            <div className="nav-menu">
              <button className="nav-link" onClick={() => handleNavigation('gallery')}>Gallery</button>
              <button className="nav-link" onClick={handleBackToLanding}>Back</button>
            </div>
          </nav>
          <Attendee user={user} onNavigate={handleNavigation} />
        </div>
      ) : currentPage === 'photo-upload' ? (
        <div>
          <nav className="app-nav">
            <div className="nav-brand">EventFlow</div>
            <div className="nav-menu">
              <button className="nav-link" onClick={() => handleNavigation('gallery')}>Gallery</button>
              <button className="nav-link" onClick={handleBackToLanding}>Home</button>
            </div>
          </nav>
          <PhotoUpload 
            event={photoUploadData.event}
            attendeePassId={photoUploadData.attendeePassId}
            onUploadSuccess={() => handleNavigation('gallery')}
            onBack={() => handleNavigation('gallery')}
          />
        </div>
      ) : (
        <div>
          <nav className="app-nav">
            <div className="nav-brand">EventFlow</div>
            <div className="nav-menu">
              {currentPage === 'gallery' && (
                <>
                  <button className="nav-link" onClick={() => handleNavigation('dashboard')}>Host Dashboard</button>
                  <button className="nav-link" onClick={() => handleNavigation('attendee')}>Check In</button>
                </>
              )}
              <button className="nav-link" onClick={handleBackToLanding}>Home</button>
            </div>
          </nav>
          <Gallery />
        </div>
      )}
    </div>
  );
}

export default App;
