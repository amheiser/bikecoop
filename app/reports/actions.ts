'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { seedSampleData, clearSampleData } from '@/lib/seed'
import { importFreehubPeople, type ImportResult } from '@/lib/import'

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

export type ImportActionState = { error: string } | { result: ImportResult } | null

export async function importFreehubAction(
  _prevState: ImportActionState,
  formData: FormData
): Promise<ImportActionState> {
  await requireAuth()

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose a CSV file to import.' }
  }
  if (file.size > 10 * 1024 * 1024) {
    return { error: 'That file is over 10 MB — a Freehub people export should be far smaller.' }
  }

  try {
    const result = importFreehubPeople(await file.text())
    revalidateEverything()
    return { result }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Import failed.' }
  }
}
