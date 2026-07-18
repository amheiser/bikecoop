import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPerson, getVisitsForPerson } from '@/lib/people'
import { checkInAction } from '../actions'

export default async function PersonProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const person = getPerson(Number(id))
  if (!person) notFound()

  const visits = getVisitsForPerson(person.id)

  return (
    <main>
      <div className="page-header">
        <h1>
          {person.first_name} {person.last_name}
        </h1>
        <Link href={`/people/${person.id}/edit`} className="btn-secondary">
          Edit
        </Link>
      </div>

      <p className="muted">
        {person.email || 'No email'} · {person.phone || 'No phone'}
        {person.is_staff === 1 && ' · Site lead'}
        {person.email_opt_out === 1 && ' · Opted out of email'}
      </p>

      <section style={{ marginTop: '2rem' }}>
        <h2>Check In</h2>
        <form action={checkInAction} className="checkin-form">
          <input type="hidden" name="personId" value={person.id} />
          <label className="checkbox-row">
            <input type="checkbox" name="isVolunteer" />
            Volunteer session
          </label>
          <button type="submit" className="btn-primary">
            Check In
          </button>
        </form>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Visit History</h2>
        <ul className="visit-list">
          {visits.map((visit) => (
            <li key={visit.id}>
              {visit.visit_date}
              {visit.is_volunteer === 1 && ' · Volunteer'}
              {visit.logged_by && <span className="muted"> · logged by {visit.logged_by}</span>}
            </li>
          ))}
          {visits.length === 0 && <p className="muted">No visits yet.</p>}
        </ul>
      </section>
    </main>
  )
}
