import { getExportRows } from '@/lib/export'

export async function GET() {
  return Response.json(getExportRows(), {
    headers: {
      'Content-Disposition': 'attachment; filename="bikecoop-export.json"',
    },
  })
}
