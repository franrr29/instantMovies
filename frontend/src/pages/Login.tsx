import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage, validatePasswordRequired, validateUsername } from '../utils/authValidation';

interface FieldErrors {
  username?: string;
  password?: string;
}

export function Login() {
  const { user, isLoading: isAuthLoading, login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthLoading) {
    return <div>Cargando...</div>;
  }

  if (user) {
    return <Navigate to="/movies" replace />;
  }

  function validate(): boolean {
    const errors: FieldErrors = {
      username: validateUsername(username) ?? undefined,
      password: validatePasswordRequired(password) ?? undefined,
    };

    setFieldErrors(errors);
    return !errors.username && !errors.password;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      await login(username.trim().toLowerCase(), password);
      navigate('/movies');
    } catch (err) {
      setFormError(getAuthErrorMessage(err, 'login'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h1>Iniciar sesión</h1>

      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="login-username">Username</label>
          <input
            id="login-username"
            type="email"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          {fieldErrors.username && <p>{fieldErrors.username}</p>}
        </div>

        <div>
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {fieldErrors.password && <p>{fieldErrors.password}</p>}
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Cargando...' : 'Iniciar sesión'}
        </button>

        {formError && <p>{formError}</p>}
      </form>

      <p>
        ¿No tenés cuenta? <Link to="/register">Creá una</Link>
      </p>
    </div>
  );
}
