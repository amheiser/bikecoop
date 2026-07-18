'use client'

import { useActionState } from 'react'
import { login } from './actions'

export function LoginForm() {
  const [error, action, pending] = useActionState(login, undefined)

  return (
    <form action={action} className="stack">
      <label>
        Username
        <input name="username" type="text" required autoFocus />
      </label>
      <label>
        Password
        <input name="password" type="password" required />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  )
}
