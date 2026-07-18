import Link from 'next/link'
import { searchPeople } from '@/lib/people'
import { CheckInForm } from './checkin-form'

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q = '' } = await searchParams
  const people = searchPeople(q)

  return (
    <main>
      <div className="page-header">
        <h1>People</h1>
        <Link href="/people/new" className="btn-primary">
          + Add Person
        </Link>
      </div>

      <form method="GET">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name or email…"
          className="search-box"
          autoFocus
        />
      </form>

      <ul className="person-list">
        {people.map((person) => (
          <li key={person.id} className="person-row">
            <span className="name">
              <Link href={`/people/${person.id}`}>
                {person.first_name} {person.last_name}
              </Link>
            </span>
            <CheckInForm personId={person.id} />
          </li>
        ))}
        {people.length === 0 && q.trim() && <p className="muted">No matches.</p>}
        {people.length === 0 && !q.trim() && (
          <p className="muted">Search for a person by name or email to check them in.</p>
        )}
      </ul>
    </main>
  )
}
