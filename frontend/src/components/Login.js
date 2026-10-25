import React, { useState } from 'react';
import { login } from '../api';
import { useNavigate } from 'react-router-dom'; 
import styles from '../styles/Login.module.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate(); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await login({ username, password });
      setSuccess(true);
      setError(null);

      localStorage.setItem('token', data.token);
      localStorage.setItem('username', username);

      navigate('/'); 
      setTimeout(() => {
        window.location.reload(); 
      }, 100); 
    } catch (err) {
      setError(err.message || 'Login failed');
      setSuccess(false);
    }
  };

  return (
    <div className={styles['login-container']}>
      <h2 className={styles['login-title']}>Login</h2>
      <form onSubmit={handleSubmit} className={styles['login-form']}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={styles['login-input']}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles['login-input']}
          required
        />
        <button type="submit" className={styles['login-button']}>
          Login
        </button>
      </form>
      {success && <p className={styles['login-success']}>Logged in successfully!</p>}
      {error && <p className={styles['login-error']}>{error}</p>}
    </div>
  );
};

export default Login;
