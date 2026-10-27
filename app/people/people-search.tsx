'use client'

import { useRouter } from 'next/navigation'
import type { KeyboardEvent } from 'react'

export function PeopleSearch({ query, path }: { query: string; path: string }) {
  const router = useRouter()

  function searchOnKeyUp(event: KeyboardEvent<HTMLInputElement>) {
    const value = event.currentTarget.value
    const search = new URLSearchParams()
    if (value) search.set('q', value)
    router.replace(`${path}${search.size ? `?${search}` : ''}`, { scroll: false })
  }

  return (
    <form method="GET">
      <input
        type="search"
        name="q"
        defaultValue={query}
        placeholder="Search by name or email…"
        className="search-box"
        autoFocus
        onKeyUp={searchOnKeyUp}
      />
    </form>
  )
}
