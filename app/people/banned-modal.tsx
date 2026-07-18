'use client'

import { useState } from 'react'
import type { Flag } from '@/lib/flags'

export function BannedModal({ personName, flags }: { personName: string; flags: Flag[] }) {
  const [dismissed, setDismissed] = useState(false)

  if (flags.length === 0 || dismissed) return null

  return (
    <div className="modal-overlay" role="alertdialog" aria-modal="true">
      <div className="modal-card">
        <h2>⛔ {personName} is banned</h2>
        <ul className="visit-list">
          {flags.map((flag) => (
            <li key={flag.id}>
              {flag.note}
              {flag.logged_by && <span className="muted"> · flagged by {flag.logged_by}</span>}
            </li>
          ))}
        </ul>
        <button type="button" className="btn-primary" onClick={() => setDismissed(true)}>
          I Acknowledge
        </button>
      </div>
    </div>
  )
}
