import axios from 'axios';

export const TOKEN_KEY = 'usher.token';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080/api',
});

API.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    // storage unavailable: proceed unauthenticated
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('usher:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export function errorMessage(err, fallback) {
  const data = err?.response?.data;
  if (data && typeof data === 'object') {
    if (typeof data.message === 'string' && data.message) return data.message;
    if (typeof data.error === 'string' && data.error) return data.error;
  }
  return fallback;
}

const data = (promise) => promise.then((r) => r.data);

export const login = ({ username, password }) => data(API.post('/login', { username, password }));
export const logout = () => data(API.post('/logout'));
export const register = ({ name, surname, username, email, password }) =>
  data(API.post('/register', { name, surname, username, email, password }));

export const getEvents = () => data(API.get('/events')).then((d) => d.events || []);
export const getEvent = (id) => data(API.get(`/events/${id}`));
export const createEvent = (payload) => data(API.put('/events', payload));
export const updateEvent = (id, payload) => data(API.put(`/events/${id}`, payload));
export const deleteEvent = (id) => data(API.delete(`/events/${id}`));

export const getLocations = () => data(API.get('/locations')).then((d) => d.locations || []);
export const createLocation = (payload) => data(API.put('/locations', payload));
export const updateLocation = (id, payload) => data(API.put(`/locations/${id}`, payload));
export const deleteLocation = (id) => data(API.delete(`/locations/${id}`));

export const createReservation = (eventId, ticketTypes) =>
  data(
    API.put('/reservations', {
      event_id: eventId,
      tickets: ticketTypes.map((type) => ({ type })),
    })
  );

export const getMyReservations = () =>
  data(API.get('/reservations/user'))
    .then((d) => (Array.isArray(d) ? d : d?.reservations || []))
    .catch((err) => {
      if (err.response?.status === 404) return [];
      throw err;
    });

export const getAllReservations = () =>
  data(API.get('/reservations')).then((d) => (Array.isArray(d) ? d : d?.reservations || []));
export const cancelReservation = (id) => data(API.post(`/reservations/${id}/cancel`));
export const deleteReservation = (id) => data(API.delete(`/reservations/${id}`));
