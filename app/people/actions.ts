'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { getSiteLead } from '@/lib/site-lead'
import { createPerson, updatePerson, checkIn, getPerson } from '@/lib/people'
import { getVolunteerHours, getCrossedMilestone } from '@/lib/hours'
import { createFlag, resolveFlag, type FlagLevel } from '@/lib/flags'
import { createMembership } from '@/lib/memberships'

function readPersonForm(formData: FormData) {
  return {
    firstName: String(formData.get('firstName') ?? '').trim(),
    lastName: String(formData.get('lastName') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim() || null,
    phone: String(formData.get('phone') ?? '').trim() || null,
    isStaff: formData.get('isStaff') === 'on',
    emailOptOut: formData.get('emailOptOut') === 'on',
  }
}

export async function createPersonAction(_prevState: string | undefined, formData: FormData) {
  await requireAuth()
  const input = readPersonForm(formData)
  if (!input.firstName || !input.lastName) {
    return 'First and last name are required.'
  }
  const id = createPerson(input)
  revalidatePath('/people')
  redirect(`/people/${id}`)
}

export async function updatePersonAction(
  id: number,
  _prevState: string | undefined,
  formData: FormData
) {
  await requireAuth()
  const input = readPersonForm(formData)
  if (!input.firstName || !input.lastName) {
    return 'First and last name are required.'
  }
  updatePerson(id, input)
  revalidatePath('/people')
  revalidatePath(`/people/${id}`)
  redirect(`/people/${id}`)
}

export async function checkInAction(
  _prevState: string | null | undefined,
  formData: FormData
): Promise<string | null> {
  await requireAuth()
  const personId = Number(formData.get('personId'))
  const isVolunteer = formData.get('isVolunteer') === 'on'
  const siteLead = await getSiteLead()

  const hoursBefore = isVolunteer ? getVolunteerHours(personId) : 0

  checkIn({ personId, isVolunteer, loggedBy: siteLead ? `${siteLead.first_name} ${siteLead.last_name}` : null })

  revalidatePath('/people')
  revalidatePath(`/people/${personId}`)

  if (!isVolunteer) return null

  const crossed = getCrossedMilestone(hoursBefore, getVolunteerHours(personId))
  if (!crossed) return null

  const person = getPerson(personId)
  return person ? `🎉 ${person.first_name} just passed ${crossed} hours!` : null
}

const FLAG_LEVELS: FlagLevel[] = ['banned', 'watch', 'heads_up']

export async function addFlagAction(_prevState: string | undefined, formData: FormData) {
  await requireAuth()
  const personId = Number(formData.get('personId'))
  const level = String(formData.get('level') ?? '') as FlagLevel
  const note = String(formData.get('note') ?? '').trim()

  if (!FLAG_LEVELS.includes(level)) {
    return 'Choose a flag level.'
  }
  if (!note) {
    return 'A note explaining the flag is required.'
  }

  const siteLead = await getSiteLead()
  createFlag({
    personId,
    level,
    note,
    loggedBy: siteLead ? `${siteLead.first_name} ${siteLead.last_name}` : null,
  })

  revalidatePath(`/people/${personId}`)
}

export async function resolveFlagAction(formData: FormData) {
  await requireAuth()
  const flagId = Number(formData.get('flagId'))
  const personId = Number(formData.get('personId'))

  resolveFlag(flagId)
  revalidatePath(`/people/${personId}`)
}

export async function addMembershipAction(_prevState: string | undefined, formData: FormData) {
  await requireAuth()
  const personId = Number(formData.get('personId'))
  const startDate = String(formData.get('startDate') ?? '')
  const endDate = String(formData.get('endDate') ?? '')

  if (!startDate || !endDate) {
    return 'Start and end date are required.'
  }
  if (endDate < startDate) {
    return 'End date must be on or after the start date.'
  }

  const siteLead = await getSiteLead()
  createMembership({
    personId,
    startDate,
    endDate,
    loggedBy: siteLead ? `${siteLead.first_name} ${siteLead.last_name}` : null,
  })

  revalidatePath(`/people/${personId}`)
  revalidatePath('/memberships/lapsed')
}
