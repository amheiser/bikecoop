'use client'

import { useActionState } from 'react'
import { addFlagAction } from './actions'

export function FlagAddForm({ personId }: { personId: number }) {
  const [error, action, pending] = useActionState(addFlagAction, undefined)

  return (
    <form action={action} className="stack">
      <input type="hidden" name="personId" value={personId} />
      <label>
        Flag level
        <select name="level" defaultValue="watch">
          <option value="watch">Watch</option>
          <option value="banned">Banned</option>
        </select>
      </label>
      <label>
        Note
        <input name="note" type="text" placeholder="Why is this flag being added?" required />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" className="btn-secondary" disabled={pending}>
        {pending ? 'Adding…' : 'Add Flag'}
      </button>
    </form>
  )
}
