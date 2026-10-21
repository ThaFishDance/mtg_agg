import type { ButtonHTMLAttributes } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  pending?: boolean
}

const variants = {
  primary: 'ui-button-primary',
  secondary: 'ui-button-secondary',
  danger: 'ui-button-danger',
}

export function Button({ variant = 'primary', pending = false, disabled, type = 'button', className = '', children, ...props }: ButtonProps) {
  return (
    <button {...props} type={type} disabled={disabled || pending} aria-busy={pending || undefined}
      className={`ui-button ${variants[variant]} ${className}`}>
      {pending && <span aria-hidden="true" className="ui-spinner" />}
      {children}
    </button>
  )
}
