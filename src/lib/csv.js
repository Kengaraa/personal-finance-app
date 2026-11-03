function escapeCell(value) {
  if (value === null || value === undefined) return ''
  let s = String(value)
  // Neutralise spreadsheet formula injection.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCSV(rows, columns) {
  const header = columns.map((c) => escapeCell(c.label)).join(',')
  const body = rows.map((row) =>
    columns.map((c) => escapeCell(typeof c.get === 'function' ? c.get(row) : row[c.key])).join(','),
  )
  return [header, ...body].join('\r\n')
}

export function downloadFile(filename, content, type = 'text/csv;charset=utf-8') {
  const blob = new Blob(['\ufeff' + content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
