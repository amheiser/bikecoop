import Link from 'next/link'
import { getLapsedPeople } from '@/lib/memberships'

export default function LapsedMembersPage() {
  const lapsed = getLapsedPeople()

  return (
    <main>
      <div className="page-header">
        <h1>Lapsed Members</h1>
      </div>

      <ul className="person-list">
        {lapsed.map((person) => (
          <li key={person.id} className="person-row">
            <span className="name">
              <Link href={`/people/${person.id}`}>
                {person.first_name} {person.last_name}
              </Link>
            </span>
            <span className="muted">Expired {person.latest_end_date}</span>
          </li>
        ))}
        {lapsed.length === 0 && <p className="muted">No lapsed members.</p>}
      </ul>
    </main>
  )
}
