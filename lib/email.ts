// The app's single point of email sending. Provider: Resend, called with a
// plain fetch — no SDK dependency. Until RESEND_API_KEY is set, every send is
// a dry run: logged to the server console and reported as dryRun so the rest
// of the feature (queue, dedup, log) works end-to-end without a provider.

export type SendEmailResult = { ok: true; dryRun: boolean } | { ok: false; error: string }

export async function sendEmail(input: {
  to: string
  subject: string
  text: string
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM

  if (!apiKey) {
    console.log(`[email dry run] to: ${input.to} | subject: ${input.subject}\n${input.text}`)
    return { ok: true, dryRun: true }
  }
  if (!from) {
    return { ok: false, error: 'EMAIL_FROM is not set' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: input.to, subject: input.subject, text: input.text }),
    })
    if (!response.ok) {
      const body = await response.text()
      return { ok: false, error: `Resend responded ${response.status}: ${body.slice(0, 200)}` }
    }
    return { ok: true, dryRun: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'network error' }
  }
}
