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

// Pages safe to restore after a browser refresh. Sub-pages that need transient
// state (a selected event, a pass id, reset data) are intentionally excluded so
// a refresh on them falls back to a sensible home instead of crashing.
const RESTORABLE_PAGES = new Set([
  'landing', 'login', 'register', 'forgot-password',
  'dashboard', 'attendee', 'gallery'
]);
const AUTH_REQUIRED_PAGES = new Set(['dashboard', 'attendee']);

function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [user, setUser] = useState(null);
  const [resetData, setResetData] = useState({ email: '', code: '' });
  const [eventPassId, setEventPassId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [photoUploadData, setPhotoUploadData] = useState({ event: null, attendeePassId: null });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = token ? JSON.parse(localStorage.getItem('user') || 'null') : null;
    if (savedUser) setUser(savedUser);

    // Check for ?join=CODE in URL — shareable event link from an organizer
    const params = new URLSearchParams(window.location.search);
    const joinPassId = params.get('join');
    if (joinPassId) {
      // Clean the URL without reloading
      window.history.replaceState({}, '', window.location.pathname);
      if (savedUser && savedUser.role === 'attendee') {
        setEventPassId(joinPassId);
        setCurrentPage('event-details');
        return;
      } else if (savedUser && savedUser.role === 'organizer') {
        // Organizers can't join events as attendees — send them to dashboard
        setCurrentPage('dashboard');
        return;
      } else {
        // Not logged in — save the passId so we can redirect after login
        localStorage.setItem('pendingJoinPassId', joinPassId);
        setCurrentPage('login');
        return;
      }
    }

    // Restore the page the user was on before refreshing, instead of dropping to landing.
    const savedPage = localStorage.getItem('currentPage');
    if (savedPage && RESTORABLE_PAGES.has(savedPage)) {
      if (AUTH_REQUIRED_PAGES.has(savedPage) && !savedUser) {
        setCurrentPage('landing');
      } else {
        setCurrentPage(savedPage);
      }
    }
  }, []);

  // Remember the current page so a browser refresh doesn't reset to landing.
  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
  }, [currentPage]);

  const handleRoleSelect = (role) => {
    localStorage.setItem('registerRole', role === 'host' ? 'organizer' : 'attendee');
    setCurrentPage('login');
  };

  const handleNavigation = (page, data = {}) => {
    // Guard the two role-specific home pages so nobody can slip between the
    // organizer and attendee experiences without being signed in for that role.
    if (page === 'dashboard' && (!user || user.role !== 'organizer')) {
      setCurrentPage(user ? 'attendee' : 'login');
      return;
    }
    if (page === 'attendee' && (!user || user.role !== 'attendee')) {
      setCurrentPage(user ? 'dashboard' : 'login');
      return;
    }

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
            // If user came via a ?join=CODE link, redirect to event details
            const pendingJoin = localStorage.getItem('pendingJoinPassId');
            if (pendingJoin && user.role === 'attendee') {
              localStorage.removeItem('pendingJoinPassId');
              setEventPassId(pendingJoin);
              setCurrentPage('event-details');
            } else {
              setCurrentPage(user.role === 'organizer' ? 'dashboard' : 'attendee');
            }
          }}
          onBack={() => handleNavigation('landing')}
        />
      ) : currentPage === 'login' ? (
        <Login
          onLoggedIn={(user) => {
            setUser(user);
            // If user came via a ?join=CODE link, redirect to event details
            const pendingJoin = localStorage.getItem('pendingJoinPassId');
            if (pendingJoin && user.role === 'attendee') {
              localStorage.removeItem('pendingJoinPassId');
              setEventPassId(pendingJoin);
              setCurrentPage('event-details');
            } else {
              setCurrentPage(user.role === 'organizer' ? 'dashboard' : 'attendee');
            }
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
              {currentPage === 'gallery' && user?.role === 'organizer' && (
                <button className="nav-link" onClick={() => handleNavigation('dashboard')}>Host Dashboard</button>
              )}
              {currentPage === 'gallery' && user?.role === 'attendee' && (
                <button className="nav-link" onClick={() => handleNavigation('attendee')}>Check In</button>
              )}
              <button className="nav-link" onClick={handleBackToLanding}>Home</button>
            </div>
          </nav>
          <Gallery user={user} />
        </div>
      )}
    </div>
  );
}

export default App;
