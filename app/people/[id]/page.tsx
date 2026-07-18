import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPerson, getVisitsForPerson } from '@/lib/people'
import { getVolunteerHours, getFootTraffic, getAchievedMilestones, MILESTONES } from '@/lib/hours'
import { getActiveFlags } from '@/lib/flags'
import { getMembershipStatus, getMembershipsForPerson, todayISO } from '@/lib/memberships'
import { CheckInForm } from '../checkin-form'
import { BannedModal } from '../banned-modal'
import { FlagAddForm } from '../flag-add-form'
import { MembershipForm } from '../membership-form'
import { resolveFlagAction } from '../actions'

function oneYearFrom(dateISO: string): string {
  const date = new Date(dateISO)
  date.setFullYear(date.getFullYear() + 1)
  return date.toISOString().slice(0, 10)
}

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
  const activeFlags = getActiveFlags(person.id)
  const bannedFlags = activeFlags.filter((f) => f.level === 'banned')
  const warningFlags = activeFlags.filter((f) => f.level !== 'banned')
  const { status: membershipStatus, latest: latestMembership } = getMembershipStatus(person.id)
  const membershipHistory = getMembershipsForPerson(person.id)
  const today = todayISO()
  const defaultStartDate = today
  const defaultEndDate = oneYearFrom(today)

  return (
    <main>
      <BannedModal personName={`${person.first_name} ${person.last_name}`} flags={bannedFlags} />

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

      {[...bannedFlags, ...warningFlags].map((flag) => (
        <div key={flag.id} className={`flag-banner ${flag.level}`}>
          <span>
            {flag.level === 'banned' ? '⛔ Banned' : flag.level === 'watch' ? '⚠️ Watch' : 'ℹ️ Heads up'}
            {' — '}
            {flag.note}
            {flag.logged_by && <span className="muted"> · flagged by {flag.logged_by}</span>}
          </span>
          <form action={resolveFlagAction}>
            <input type="hidden" name="flagId" value={flag.id} />
            <input type="hidden" name="personId" value={person.id} />
            <button type="submit" className="btn-secondary">
              Clear
            </button>
          </form>
        </div>
      ))}

      <div className={`membership-status ${membershipStatus}`}>
        {membershipStatus === 'active' && `Current member — through ${latestMembership!.end_date}`}
        {membershipStatus === 'lapsed' && `Lapsed — expired ${latestMembership!.end_date}`}
        {membershipStatus === 'none' && 'No membership on file'}
      </div>

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
        <h2>Flags</h2>
        <FlagAddForm personId={person.id} />
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Membership</h2>
        <MembershipForm
          personId={person.id}
          defaultStartDate={defaultStartDate}
          defaultEndDate={defaultEndDate}
        />
        <ul className="visit-list" style={{ marginTop: '1rem' }}>
          {membershipHistory.map((m) => (
            <li key={m.id}>
              {m.start_date} → {m.end_date}
              {m.logged_by && <span className="muted"> · logged by {m.logged_by}</span>}
            </li>
          ))}
          {membershipHistory.length === 0 && <p className="muted">No membership history.</p>}
        </ul>
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
