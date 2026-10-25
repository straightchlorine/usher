import React, { useState, useEffect } from "react";
import { getEvents } from "../api";
import { useNavigate } from "react-router-dom";
import "../styles/EventList.css";

const EventList = () => {
  const [events, setEvents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [eventsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await getEvents();
        setEvents(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load events.");
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = events.slice(indexOfFirstEvent, indexOfLastEvent);

  const handleNextPage = () => {
    if (indexOfLastEvent < events.length) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleBuyTicket = (event) => {
    navigate("/buy-ticket", {
      state: {
        eventId: event.id,
        eventName: event.name,
        availableTickets: event.available_tickets,
      },
    });
  };

  if (loading) return <p>Loading events...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="event-list-container">
      <table className="event-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Date</th>
            <th>Price</th>
            <th>Available Tickets</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {currentEvents.map((event) => (
            <tr key={event.id}>
              <td>{event.name}</td>
              <td>{new Date(event.date).toLocaleString()}</td>
              <td>${event.price}</td>
              <td>{event.available_tickets}</td>
              <td>
                <button
                  className="buy-button"
                  onClick={() => handleBuyTicket(event)}
                >
                  Buy
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pagination-container">
        <button
          className="pagination-button"
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span className="pagination-info">Page {currentPage}</span>
        <button
          className="pagination-button"
          onClick={handleNextPage}
          disabled={indexOfLastEvent >= events.length}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default EventList;
