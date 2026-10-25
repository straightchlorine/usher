import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8080/api",
});

export const login = async (credentials) => {
  try {
    const response = await API.post('/login', credentials);
    return response.data;
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    throw error.response?.data || error;
  }
};


export const logout = async () => {
  const response = await API.post("/logout");
  return response.data;
};

export const getEvents = async () => {
  console.log(API.baseURL);
  const response = await API.get("/events");
  return response.data.events;
};

export const getEventById = async (id) => {
  const response = await API.get(`/events/${id}`);
  return response.data;
};

export const createEvent = async (eventData) => {
  const response = await API.put("/events", eventData);
  return response.data;
};

export const updateEvent = async (id, eventData) => {
  const response = await API.put(`/events/${id}`, eventData);
  return response.data;
};

export const deleteEvent = async (id) => {
  const response = await API.delete(`/events/${id}`);
  return response.data;
};

export const getReservations = async () => {
  const response = await API.get("/reservations");
  return response.data.reservations;
};

export const getReservationById = async (id) => {
  const response = await API.get(`/reservations/${id}`);
  return response.data;
};

export const createReservation = async (reservationData, token) => {
  const response = await API.put("/reservations", reservationData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const cancelReservation = async (id) => {
  const response = await API.post(`/reservations/${id}/cancel`);
  return response.data;
};

export const getLocations = async () => {
  const response = await API.get("/locations");
  return response.data.locations;
};

export const createLocation = async (locationData) => {
  const response = await API.put("/locations", locationData);
  return response.data;
};

export const updateLocation = async (id, locationData) => {
  const response = await API.put(`/locations/${id}`, locationData);
  return response.data;
};

export const deleteLocation = async (id) => {
  const response = await API.delete(`/locations/${id}`);
  return response.data;
};

export const getUsers = async () => {
  const response = await API.get("/users");
  return response.data.users;
};

export const getUserById = async (id) => {
  const response = await API.get(`/users/${id}`);
  return response.data;
};

export const createUser = async (userData) => {
  const response = await API.put("/users", userData);
  return response.data;
};

export const updateUser = async (id, userData) => {
  const response = await API.put(`/users/${id}`, userData);
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await API.delete(`/users/${id}`);
  return response.data;
};

export const getReservationsByUser = async (userId, token) => {
  const response = await API.get(`/reservations/user/${userId}/tickets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const createTicket = async (eventId, ticketType, token) => {
  const response = await API.post(
    `/tickets`,
    { eventId, ticketType },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};
