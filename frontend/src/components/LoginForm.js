import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api'; 
import '../styles/LoginForm.css'; 

const LoginForm = () => {
  const [username, setUsername] = useState(''); 
  const [password, setPassword] = useState(''); 
  const [error, setError] = useState(null); 
  const [success, setSuccess] = useState(false); 
  const navigate = useNavigate(); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await login({ username, password }); 
      setError(null); 
      setSuccess(true); 

      localStorage.setItem('token', data.token); 
      localStorage.setItem('username', data.username); 

      console.log('Login successful, navigating to events page...');
      setTimeout(() => navigate('/'), 1000); 
    } catch (err) {
      setError(err.message || 'Login failed'); 
      setSuccess(false);
      console.error('Error during login:', err);
    }
  };

  return (
    <div className="login-form-container">
      <h2 className="login-title">Login</h2>
      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="login-input"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="login-input"
          required
        />
        <button type="submit" className="login-button">
          Login
        </button>
      </form>
      {success && <p className="login-success">Logged in successfully!</p>}
      {error && <p className="login-error">{error}</p>}
    </div>
  );
};

export default LoginForm;
