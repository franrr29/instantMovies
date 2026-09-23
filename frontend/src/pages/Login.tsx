import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { AuthCard } from '../components/ui/AuthCard';
import { FormField } from '../components/ui/FormField';
import { btnPrimary } from '../components/ui/styles';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/cn';
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
    return <div className="flex min-h-screen items-center justify-center bg-bg text-sm text-ink/60">Cargando...</div>;
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
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-bg px-6 py-16">
      {/* fondo decorativo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[url('/movie.jpg')] bg-cover bg-bottom opacity-25"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-bg/70 via-bg/85 to-bg"
      />

      <AuthCard
        tag="Session"
        title="Sign in"
        subtitle="Continue where you left off."
        footer={
          <>
            ¿No tenés cuenta? <Link to="/register" className="text-accent hover:underline">Creá una</Link>
          </>
        }
      >
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <FormField
            id="login-username"
            label="Username"
            type="email"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            error={fieldErrors.username}
          />

          <FormField
            id="login-password"
            label="Password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fieldErrors.password}
          />

          <button type="submit" disabled={isSubmitting} className={cn(btnPrimary, 'mt-2 w-full py-3.5')}>
            {isSubmitting ? 'Cargando...' : 'Sign in →'}
          </button>

          {formError && <p className="text-center text-xs text-red-400">{formError}</p>}
        </form>
      </AuthCard>
    </div>
  );
}
