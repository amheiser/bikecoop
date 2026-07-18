import { PersonForm } from '../person-form'
import { createPersonAction } from '../actions'

export default function NewPersonPage() {
  return (
    <main>
      <h1>Add Person</h1>
      <PersonForm action={createPersonAction} submitLabel="Add Person" />
    </main>
  )
}
