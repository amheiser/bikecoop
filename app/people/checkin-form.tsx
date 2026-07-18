'use client'

import { useActionState } from 'react'
import { checkInAction } from './actions'

export function CheckInForm({ personId }: { personId: number }) {
  const [celebration, action, pending] = useActionState(checkInAction, null)

  return (
    <div>
      <form action={action} className="checkin-form">
        <input type="hidden" name="personId" value={personId} />
        <label className="checkbox-row">
          <input type="checkbox" name="isVolunteer" />
          Volunteer session
        </label>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Checking in…' : 'Check In'}
        </button>
      </form>
      {celebration && <p className="celebration">{celebration}</p>}
    </div>
  )
}
