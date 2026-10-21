'use client'

import { useId, type InputHTMLAttributes } from 'react'

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
}

export function TextField({ label, hint, error, id, className = '', 'aria-describedby': describedBy, ...props }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id || generatedId
  const description = [describedBy, hint && `${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(' ') || undefined
  return (
    <div className="ui-field">
      <label htmlFor={inputId} className="ui-label">{label}{props.required && <span className="text-muted"> (required)</span>}</label>
      {hint && <p id={`${inputId}-hint`} className="ui-help">{hint}</p>}
      <input {...props} id={inputId} aria-describedby={description} aria-invalid={error ? true : props['aria-invalid']}
        className={`ui-input ${className}`} />
      {error && <p id={`${inputId}-error`} className="ui-field-error" role="alert">{error}</p>}
    </div>
  )
}
