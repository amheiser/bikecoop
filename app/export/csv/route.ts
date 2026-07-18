import { getExportRows, rowsToCSV } from '@/lib/export'

export async function GET() {
  const csv = rowsToCSV(getExportRows())

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="bikecoop-export.csv"',
    },
  })
}
