// tests unitarios de AuthContext: restaurar sesion (200/401), login, logout
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';



vi.mock('../services/api', () => ({
  AUTH_LOGOUT_EVENT: 'auth:logout',
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));



import { api } from '../services/api';
import { AuthProvider, useAuth } from '../context/AuthContext';



function AuthConsumer() {
  const { user, isLoading, login, logout } = useAuth();

  if (isLoading) {
    return <div>cargando</div>;
  }

  return (
    <div>
      <div data-testid="user-state">{user ? user.username : 'sin-usuario'}</div>
      <button onClick={() => login('user@test.com', 'Demo1234!')}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}



function renderAuthConsumer() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    </MemoryRouter>,
  );
}



describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('restaurar sesion', () => {
    it('GET /auth/me -> 200 con user: el contexto tiene user despues del mount', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { user: { id: 1, username: 'demo@instant.com' } } });

      renderAuthConsumer();

      expect(await screen.findByTestId('user-state')).toHaveTextContent('demo@instant.com');
    });

    it('GET /auth/me -> 401: el contexto queda sin user', async () => {
      vi.mocked(api.get).mockRejectedValue({ response: { status: 401 } });

      renderAuthConsumer();

      expect(await screen.findByTestId('user-state')).toHaveTextContent('sin-usuario');
    });
  });

  describe('login', () => {
    it('POST /auth/login -> 200: el contexto actualiza el user', async () => {
      vi.mocked(api.get).mockRejectedValue({ response: { status: 401 } });
      vi.mocked(api.post).mockResolvedValue({ data: { user: { id: 1, username: 'demo@instant.com' } } });

      const user = userEvent.setup();
      renderAuthConsumer();

      await screen.findByTestId('user-state');
      await user.click(screen.getByRole('button', { name: 'login' }));

      await waitFor(() => {
        expect(screen.getByTestId('user-state')).toHaveTextContent('demo@instant.com');
      });
      expect(api.post).toHaveBeenCalledWith('/auth/login', { username: 'user@test.com', password: 'Demo1234!' });
    });
  });

  describe('logout', () => {
    it('POST /auth/logout -> 200: el contexto limpia el user', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: { user: { id: 1, username: 'demo@instant.com' } } });
      vi.mocked(api.post).mockResolvedValue({ data: { message: 'Logged out' } });

      const user = userEvent.setup();
      renderAuthConsumer();

      expect(await screen.findByTestId('user-state')).toHaveTextContent('demo@instant.com');

      await user.click(screen.getByRole('button', { name: 'logout' }));

      await waitFor(() => {
        expect(screen.getByTestId('user-state')).toHaveTextContent('sin-usuario');
      });
      expect(api.post).toHaveBeenCalledWith('/auth/logout');
    });
  });
});
