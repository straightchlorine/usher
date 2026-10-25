import React, { useState } from "react";
import { createEvent, updateEvent } from "../api";

const EventForm = ({ existingEvent, onSuccess }) => {
  const [event, setEvent] = useState(
    existingEvent || { name: "", price: "", date: "", available_tickets: "" }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEvent((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (existingEvent) {
        await updateEvent(existingEvent.id, event);
      } else {
        await createEvent(event);
      }
      onSuccess();
    } catch (err) {
      console.error(err);
      setError("Failed to save event.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>{existingEvent ? "Edit Event" : "Create Event"}</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <label>
        Name:
        <input
          type="text"
          name="name"
          value={event.name}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Price:
        <input
          type="number"
          name="price"
          value={event.price}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Date:
        <input
          type="datetime-local"
          name="date"
          value={event.date}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Available Tickets:
        <input
          type="number"
          name="available_tickets"
          value={event.available_tickets}
          onChange={handleChange}
          required
        />
      </label>
      <button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save"}
      </button>
    </form>
  );
};

export default EventForm;
