'use client'

import { useActionState } from 'react'
import { importFreehubAction } from './actions'

export function ImportForm() {
  const [state, action, pending] = useActionState(importFreehubAction, null)

  return (
    <div>
      <form action={action} className="stack" style={{ maxWidth: 400 }}>
        <label>
          Freehub People report CSV
          <input name="file" type="file" accept=".csv,text/csv" required />
        </label>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Importing…' : 'Import'}
        </button>
      </form>

      {state && 'error' in state && <p className="error">{state.error}</p>}

      {state && 'result' in state && (
        <div style={{ marginTop: '1rem' }}>
          <p>
            ✅ Import finished: <strong>{state.result.peopleCreated}</strong> people created,{' '}
            <strong>{state.result.peopleAlreadyPresent}</strong> already present (left unchanged),{' '}
            <strong>{state.result.membershipsCreated}</strong> memberships added.
          </p>
          {state.result.skipped.length > 0 && (
            <>
              <p className="error">{state.result.skipped.length} row(s) need attention:</p>
              <ul className="visit-list">
                {state.result.skipped.map(({ row, reason }) => (
                  <li key={`${row}-${reason}`}>
                    Row {row}: {reason}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
