import type { SelectHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-navy-400">{hint}</span>
      ) : null}
    </label>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function Input({ error, className = "", ...rest }: InputProps) {
  return (
    <input
      className={`input ${error ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""} ${className}`}
      {...rest}
    />
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export function Select({ error, className = "", children, ...rest }: SelectProps) {
  return (
    <select
      className={`input ${error ? "border-red-400" : ""} cursor-pointer ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}