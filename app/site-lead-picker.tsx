'use client'

import { useRef } from 'react'
import { setSiteLead } from './actions'
import type { Person } from '@/lib/people'

export function SiteLeadPicker({
  staff,
  currentId,
}: {
  staff: Person[]
  currentId: number | null
}) {
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form ref={formRef} action={setSiteLead}>
      <label className="site-lead-label">
        Working today:
        <select
          name="personId"
          defaultValue={currentId ?? ''}
          onChange={() => formRef.current?.requestSubmit()}
        >
          <option value="">— Select site lead —</option>
          {staff.map((person) => (
            <option key={person.id} value={person.id}>
              {person.first_name} {person.last_name}
            </option>
          ))}
        </select>
      </label>
    </form>
  )
}
