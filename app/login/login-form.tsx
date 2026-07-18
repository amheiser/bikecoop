'use client'

import { useActionState, useState } from 'react'
import { login } from './actions'

export function LoginForm() {
  const [error, action, pending] = useActionState(login, undefined)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form action={action} className="stack">
      <label>
        Username
        <input name="username" type="text" required autoFocus />
      </label>
      <label>
        Password
        <div className="password-field">
          <input name="password" type={showPassword ? 'text' : 'password'} required />
          <button
            type="button"
            className="btn-secondary password-toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  )
}
