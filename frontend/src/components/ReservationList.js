import React, { useState } from "react";
import styles from "../styles/ReservationForm.module.css";

const ReservationForm = ({ onReserve }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [eventId, setEventId] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onReserve) {
      onReserve({ name, email, eventId });
    }
    setName("");
    setEmail("");
    setEventId("");
  };

  return (
    <div className={styles.container}>
      <h2>Make a Reservation</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.input}
        />
        <input
          type="email"
          placeholder="Your Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
        />
        <input
          type="text"
          placeholder="Event ID"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className={styles.input}
        />
        <button type="submit" className={styles.button}>
          Reserve
        </button>
      </form>
    </div>
  );
};

export default ReservationForm;