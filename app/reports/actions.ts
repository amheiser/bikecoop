'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { seedSampleData, clearSampleData } from '@/lib/seed'

function revalidateEverything() {
  revalidatePath('/people')
  revalidatePath('/reports')
}

export async function seedSampleDataAction() {
  await requireAuth()
  seedSampleData()
  revalidateEverything()
}

export async function clearSampleDataAction() {
  await requireAuth()
  clearSampleData()
  revalidateEverything()
}
