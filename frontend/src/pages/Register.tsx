import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAuthErrorMessage, validatePasswordComplexity, validateUsername } from '../utils/authValidation';

interface FieldErrors {
  username?: string;
  password?: string;
  confirmPassword?: string;
}

export function Register() {
  const { user, isLoading: isAuthLoading, register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      password: validatePasswordComplexity(password) ?? undefined,
      confirmPassword: confirmPassword !== password ? 'Las contraseñas no coinciden' : undefined,
    };

    setFieldErrors(errors);
    return !errors.username && !errors.password && !errors.confirmPassword;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      await register(username.trim().toLowerCase(), password);
      navigate('/movies');
    } catch (err) {
      setFormError(getAuthErrorMessage(err, 'register'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h1>Crear cuenta</h1>

      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="register-username">Username</label>
          <input
            id="register-username"
            type="email"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          {fieldErrors.username && <p>{fieldErrors.username}</p>}
        </div>

        <div>
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {fieldErrors.password && <p>{fieldErrors.password}</p>}
        </div>

        <div>
          <label htmlFor="register-confirm-password">Confirmar password</label>
          <input
            id="register-confirm-password"
            type="password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          {fieldErrors.confirmPassword && <p>{fieldErrors.confirmPassword}</p>}
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Cargando...' : 'Crear cuenta'}
        </button>

        {formError && <p>{formError}</p>}
      </form>

      <p>
        ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
      </p>
    </div>
  );
}
