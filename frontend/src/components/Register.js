import React, { useState } from "react";
import axios from "axios";
import styles from "../styles/Register.module.css";

const Register = () => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("https://example.com/api/register", formData);
      setSuccess(true);
    } catch (err) {
      setError("Error during registration. Please try again.");
    }
  };

  return (
    <div className={styles.container}>
      <h1>Register</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          className={styles.input}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          className={styles.input}
        />
        <button type="submit" className={styles.button}>Register</button>
      </form>
      {success && <p className={styles.success}>Registration successful!</p>}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};

export default Register;
