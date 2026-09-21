import axios, { type InternalAxiosRequestConfig } from 'axios';



export const AUTH_LOGOUT_EVENT = 'auth:logout';



// config custom para requests que no deben disparar auth:logout ante un 401
// (ej. el chequeo de sesion al montar la app, que 401ea normalmente si no
// hay sesion todavia y no debe redirigir a /login por eso)
export interface SkipAuthLogoutConfig {
  _skipAuthLogout?: boolean;
}



// la cookie httpOnly la maneja el navegador: withCredentials alcanza para
// que viaje en cada request, no hay token que inyectar a mano
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config as (InternalAxiosRequestConfig & SkipAuthLogoutConfig) | undefined;

    if (error.response?.status === 401 && !config?._skipAuthLogout) {
      window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
    }

    return Promise.reject(error);
  },
);
