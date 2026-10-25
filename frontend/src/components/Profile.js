import React, { useState, useEffect } from 'react';
import '../styles/Profile.css';
import { getReservationsByUser } from '../api';

const Profile = () => {
  const [reservations, setReservations] = useState([]);
  const [currentPage, setCurrentPage] = useState(1); 
  const [reservationsPerPage] = useState(10); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const userId = localStorage.getItem('username');
        const token = localStorage.getItem('token');
        const data = await getReservationsByUser(userId, token);
        setReservations(data.tickets);
        setError(null);
      } catch (err) {
        setError('Failed to fetch reservations.');
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, []);

  const indexOfLastReservation = currentPage * reservationsPerPage;
  const indexOfFirstReservation = indexOfLastReservation - reservationsPerPage;
  const currentReservations = reservations.slice(indexOfFirstReservation, indexOfLastReservation);

  const handleNextPage = () => {
    if (indexOfLastReservation < reservations.length) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (loading) return <p>Loading reservations...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="profile-container">
      <h2>Your Tickets</h2>
      <table className="reservations-table">
        <thead>
          <tr>
            <th>Event Name</th>
            <th>Date</th>
            <th>Price</th>
            <th>Ticket Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {currentReservations.map((reservation) => (
            <tr key={reservation.id}>
              <td>{reservation.event.name}</td>
              <td>{new Date(reservation.event.date).toLocaleString()}</td>
              <td>${reservation.price.toFixed(2)}</td>
              <td>{reservation.type}</td>
              <td
                className={
                  reservation.status === 'SOLD' ? 'status-sold' :
                  reservation.status === 'RESERVED' ? 'status-reserved' :
                  reservation.status === 'CANCELLED' ? 'status-cancelled' : ''
                }
              >
                {reservation.status}
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
          disabled={indexOfLastReservation >= reservations.length}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Profile;
