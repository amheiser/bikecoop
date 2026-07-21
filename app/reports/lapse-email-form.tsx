'use client'

import { useActionState } from 'react'
import { sendLapseEmailsAction } from './actions'

export function LapseEmailForm({ queueCount }: { queueCount: number }) {
  const [state, action, pending] = useActionState(sendLapseEmailsAction, null)

  return (
    <div>
      {queueCount > 0 && (
        <form action={action}>
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending
              ? 'Sending…'
              : `Send ${queueCount} renewal email${queueCount === 1 ? '' : 's'}`}
          </button>
        </form>
      )}

      {state && (
        <div style={{ marginTop: '1rem' }}>
          <p>
            {state.dryRun ? '📝 Dry run (no email provider configured yet): ' : '✅ '}
            <strong>{state.sent}</strong> email{state.sent === 1 ? '' : 's'}{' '}
            {state.dryRun ? 'would have been sent — logged below.' : 'sent.'}
          </p>
          {state.failures.length > 0 && (
            <>
              <p className="error">{state.failures.length} failed (still queued for retry):</p>
              <ul className="visit-list">
                {state.failures.map(({ name, error }) => (
                  <li key={name}>
                    {name}: {error}
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
