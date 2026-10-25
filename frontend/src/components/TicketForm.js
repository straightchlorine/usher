import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createReservation } from "../api";
import "../styles/TicketForm.css";

const TicketForm = () => {
  const [ticketType, setTicketType] = useState("standard");
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const { eventId, eventName, availableTickets } = location.state || {};

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!eventId) {
      setError("Event ID is missing.");
      return;
    }

    if (availableTickets <= 0) {
      setError("No tickets available for this event.");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const data = await createReservation(
        {
          event_id: eventId,
          tickets: [{ type: ticketType.toUpperCase() }],
        },
        token
      );
      alert(
        `Successfully purchased a ${ticketType} ticket for ${eventName}! Reservation ID: ${data.id}`
      );
      navigate("/"); 
    } catch (err) {
      console.error(err);
      setError("Failed to purchase ticket. Please try again.");
    }
  };

  return (
    <div className="ticket-form-container">
      <h2>Buy Ticket for {eventName}</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Select Ticket Type:
          <select
            value={ticketType}
            onChange={(e) => setTicketType(e.target.value)}
          >
            <option value="standard">Standard</option>
            <option value="senior">Senior</option>
            <option value="student">Student</option>
          </select>
        </label>
        <button type="submit" className="buy-ticket-button">
          Buy
        </button>
      </form>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default TicketForm;
