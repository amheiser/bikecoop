'use client'

import { useActionState } from 'react'
import { addNoteAction } from './actions'

export function NoteForm({ personId }: { personId: number }) {
  const [error, action, pending] = useActionState(addNoteAction, undefined)

  return (
    <form action={action} className="stack">
      <input type="hidden" name="personId" value={personId} />
      <label>
        Add a note
        <input name="text" type="text" placeholder="General note about this person…" required />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" className="btn-secondary" disabled={pending}>
        {pending ? 'Adding…' : 'Add Note'}
      </button>
    </form>
  )
}
