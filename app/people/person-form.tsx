'use client'

import { useActionState } from 'react'
import type { Person } from '@/lib/people'

type PersonFormAction = (prevState: string | undefined, formData: FormData) => Promise<string | undefined>

export function PersonForm({
  action,
  person,
  submitLabel,
}: {
  action: PersonFormAction
  person?: Person
  submitLabel: string
}) {
  const [error, formAction, pending] = useActionState(action, undefined)

  return (
    <form action={formAction} className="stack">
      <label>
        First name
        <input name="firstName" type="text" defaultValue={person?.first_name} required autoFocus />
      </label>
      <label>
        Last name
        <input name="lastName" type="text" defaultValue={person?.last_name} required />
      </label>
      <label>
        Email
        <input name="email" type="email" defaultValue={person?.email ?? ''} />
      </label>
      <label>
        Phone
        <input name="phone" type="tel" defaultValue={person?.phone ?? ''} />
      </label>
      <label className="checkbox-row">
        <input type="checkbox" name="isStaff" defaultChecked={person?.is_staff === 1} />
        Site lead (staff)
      </label>
      <label className="checkbox-row">
        <input type="checkbox" name="emailOptOut" defaultChecked={person?.email_opt_out === 1} />
        Opted out of email
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}
