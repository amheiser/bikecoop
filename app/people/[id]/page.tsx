import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPerson, getVisitsForPerson } from '@/lib/people'
import { getVolunteerHours, getFootTraffic, getAchievedMilestones, MILESTONES } from '@/lib/hours'
import { CheckInForm } from '../checkin-form'

export default async function PersonProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const person = getPerson(Number(id))
  if (!person) notFound()

  const visits = getVisitsForPerson(person.id)
  const volunteerHours = getVolunteerHours(person.id)
  const footTraffic = getFootTraffic(person.id)
  const achieved = new Set(getAchievedMilestones(volunteerHours))

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

      <div className="stats-row">
        <div className="stat">
          <span className="value">{volunteerHours}</span>
          <span className="label">Volunteer hours</span>
        </div>
        <div className="stat">
          <span className="value">{footTraffic}</span>
          <span className="label">Foot traffic (visits)</span>
        </div>
      </div>

      <div className="badge-row">
        {MILESTONES.map((threshold) => (
          <span key={threshold} className={`badge${achieved.has(threshold) ? ' achieved' : ''}`}>
            {threshold === 500 && achieved.has(500) ? '500+' : threshold} hrs
          </span>
        ))}
      </div>

      <section style={{ marginTop: '2rem' }}>
        <h2>Check In</h2>
        <CheckInForm personId={person.id} />
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
