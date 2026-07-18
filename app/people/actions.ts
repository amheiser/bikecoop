'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { getSiteLead } from '@/lib/site-lead'
import { createPerson, updatePerson, checkIn, getPerson } from '@/lib/people'
import { getVolunteerHours, getCrossedMilestone } from '@/lib/hours'
import { createFlag, resolveFlag, type FlagLevel } from '@/lib/flags'
import { createMembership, oneYearFrom, todayISO } from '@/lib/memberships'
import { createNote } from '@/lib/notes'
import { REWARD_TIERS, getRedemptionsForPerson, redeemReward, type RewardTierId } from '@/lib/rewards'

function readPersonForm(formData: FormData) {
  const yearOfBirthRaw = String(formData.get('yearOfBirth') ?? '').trim()
  return {
    firstName: String(formData.get('firstName') ?? '').trim(),
    lastName: String(formData.get('lastName') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim() || null,
    phone: String(formData.get('phone') ?? '').trim() || null,
    isStaff: formData.get('isStaff') === 'on',
    isSiteLead: formData.get('isSiteLead') === 'on',
    emailOptOut: formData.get('emailOptOut') === 'on',
    street1: String(formData.get('street1') ?? '').trim() || null,
    street2: String(formData.get('street2') ?? '').trim() || null,
    city: String(formData.get('city') ?? '').trim() || null,
    state: String(formData.get('state') ?? '').trim() || null,
    postalCode: String(formData.get('postalCode') ?? '').trim() || null,
    country: String(formData.get('country') ?? '').trim() || null,
    yearOfBirth: yearOfBirthRaw ? Number(yearOfBirthRaw) : null,
    tags: String(formData.get('tags') ?? '').trim() || null,
  }
}

export async function createPersonAction(_prevState: string | undefined, formData: FormData) {
  await requireAuth()
  const input = readPersonForm(formData)
  if (!input.firstName || !input.lastName) {
    return 'First and last name are required.'
  }
  const id = createPerson(input)

  const siteLead = await getSiteLead()
  const loggedByName = siteLead ? `${siteLead.first_name} ${siteLead.last_name}` : null

  if (formData.get('startMembership') === 'on') {
    const start = todayISO()
    createMembership({ personId: id, startDate: start, endDate: oneYearFrom(start), loggedBy: loggedByName })
  }

  revalidatePath('/people')
  revalidatePath('/reports')
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

const FLAG_LEVELS: FlagLevel[] = ['banned', 'watch']

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
  revalidatePath('/reports')
}

export async function addNoteAction(_prevState: string | undefined, formData: FormData) {
  await requireAuth()
  const personId = Number(formData.get('personId'))
  const text = String(formData.get('text') ?? '').trim()

  if (!text) {
    return 'Note text is required.'
  }

  const siteLead = await getSiteLead()
  createNote({
    personId,
    text,
    loggedBy: siteLead ? `${siteLead.first_name} ${siteLead.last_name}` : null,
  })

  revalidatePath(`/people/${personId}`)
}

export async function redeemRewardAction(formData: FormData) {
  await requireAuth()
  const personId = Number(formData.get('personId'))
  const tierId = String(formData.get('tierId') ?? '') as RewardTierId

  const tier = REWARD_TIERS.find((t) => t.id === tierId)
  if (!tier) return

  const hours = getVolunteerHours(personId)
  if (hours < tier.hours) return

  const alreadyRedeemed = getRedemptionsForPerson(personId).some((r) => r.tier_id === tierId)
  if (alreadyRedeemed) return

  const siteLead = await getSiteLead()
  const loggedByName = siteLead ? `${siteLead.first_name} ${siteLead.last_name}` : null

  redeemReward({ personId, tierId, loggedBy: loggedByName })

  if (tier.id === 'free_membership') {
    const start = todayISO()
    createMembership({
      personId,
      startDate: start,
      endDate: oneYearFrom(start),
      loggedBy: loggedByName ? `${loggedByName} (redeemed reward)` : 'Redeemed reward',
    })
  }

  revalidatePath(`/people/${personId}`)
  revalidatePath('/reports')
}
