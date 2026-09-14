import axios from 'axios';

export const AUTH_LOGOUT_EVENT = 'auth:logout';

// la cookie httpOnly la maneja el navegador: withCredentials alcanza para
// que viaje en cada request, no hay token que inyectar a mano
export const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
    }

    return Promise.reject(error);
  },
);
