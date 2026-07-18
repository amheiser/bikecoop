import { db } from '@/lib/db'

export type Note = {
  id: number
  person_id: number
  text: string
  logged_by: string | null
  created_at: string
}

export function getNotesForPerson(personId: number): Note[] {
  return db
    .prepare('SELECT * FROM notes WHERE person_id = ? ORDER BY created_at DESC')
    .all(personId) as Note[]
}

export function createNote(input: { personId: number; text: string; loggedBy: string | null }): void {
  db.prepare('INSERT INTO notes (person_id, text, logged_by) VALUES (?, ?, ?)').run(
    input.personId,
    input.text,
    input.loggedBy
  )
}
