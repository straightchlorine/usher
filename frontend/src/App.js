import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import EventList from './components/EventList';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile'; 
import TicketForm from './components/TicketForm'; 
import './styles/NavBar.css';
import './styles/Profile.css';

const App = () => {
  const [username, setUsername] = useState(null);

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setUsername(null);
  };

  return (
    <Router>
      {/* Przycisk Logout oraz Profile w prawym górnym rogu */}
      <div className="logout-container">
        {username && (
          <>
            <span className="username-display">Welcome, {username}!</span>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
            <Link to="/profile" className="profile-button">
              Profile
            </Link>
          </>
        )}
      </div>

      {/* Nawigacja */}
      <div className="nav-container">
        <div className="nav-buttons">
          {!username && (
            <>
              <Link to="/login" className="nav-button">Login</Link>
              <Link to="/register" className="nav-button">Register</Link>
            </>
          )}
        </div>
      </div>

      {/* Przycisk Events na środku */}
      <div className="center-button">
        <Link to="/" className="center-nav-button">Events</Link>
      </div>

      <Routes>
        <Route path="/" element={<EventList />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} /> {/* Nowa ścieżka */}
        <Route path="/buy-ticket" element={<TicketForm />} /> {/* Trasa do TicketForm */}
      </Routes>
    </Router>
  );
};

export default App;
