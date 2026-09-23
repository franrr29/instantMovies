import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { AuthCard } from '../components/ui/AuthCard';
import { FormField } from '../components/ui/FormField';
import { btnPrimary } from '../components/ui/styles';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/cn';
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
    return <div className="flex min-h-screen items-center justify-center bg-bg text-sm text-ink/60">Cargando...</div>;
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
        tag="Enrol"
        title="Create your account"
        subtitle="Six likes and the projector rolls."
        footer={
          <>
            ¿Ya tenés cuenta? <Link to="/login" className="text-accent hover:underline">Iniciá sesión</Link>
          </>
        }
      >
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <div>
            <FormField
              id="register-username"
              label="Username"
              type="email"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              error={fieldErrors.username}
            />
            <p className="mt-1.5 text-xs text-ink/50">Debe ser un email válido</p>
          </div>

          <div>
            <FormField
              id="register-password"
              label="Password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={fieldErrors.password}
            />
            <p className="mt-1.5 text-xs text-ink/50">
              Mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial
            </p>
          </div>

          <FormField
            id="register-confirm-password"
            label="Confirmar password"
            type="password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            error={fieldErrors.confirmPassword}
          />

          <button type="submit" disabled={isSubmitting} className={cn(btnPrimary, 'mt-2 w-full py-3.5')}>
            {isSubmitting ? 'Cargando...' : 'Create account →'}
          </button>

          {formError && <p className="text-center text-xs text-red-400">{formError}</p>}
        </form>
      </AuthCard>
    </div>
  );
}
