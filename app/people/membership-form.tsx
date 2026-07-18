'use client'

import { useActionState } from 'react'
import { addMembershipAction } from './actions'

export function MembershipForm({
  personId,
  defaultStartDate,
  defaultEndDate,
}: {
  personId: number
  defaultStartDate: string
  defaultEndDate: string
}) {
  const [error, action, pending] = useActionState(addMembershipAction, undefined)

  return (
    <form action={action} className="stack">
      <input type="hidden" name="personId" value={personId} />
      <label>
        Start date
        <input name="startDate" type="date" defaultValue={defaultStartDate} required />
      </label>
      <label>
        End date
        <input name="endDate" type="date" defaultValue={defaultEndDate} required />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? 'Saving…' : 'Record / Renew Membership'}
      </button>
    </form>
  )
}
