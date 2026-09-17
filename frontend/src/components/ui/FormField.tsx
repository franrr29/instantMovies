import type { InputHTMLAttributes } from 'react';
import { fieldLabel, inputClasses } from './styles';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
}

export function FormField({ id, label, error, className, ...inputProps }: FormFieldProps) {
  return (
    <div>
      <label htmlFor={id} className={fieldLabel}>
        {label}
      </label>
      <input id={id} className={className ?? inputClasses} {...inputProps} />
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  );
}
