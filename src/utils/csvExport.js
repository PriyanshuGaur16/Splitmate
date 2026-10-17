// Shared CSV helpers used by the per-group and Reports exports.

// Neutralise spreadsheet formula injection in text cells: values starting with
// = + - @ (or a tab / carriage return, which some apps skip before a formula)
// get a leading apostrophe.
export function neutraliseFormula(value) {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}

// RFC 4180 field escaping.
export function escapeCsvField(value) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

// Builds CSV text (UTF-8 BOM, \r\n line endings) from an array of row objects
// keyed by `columns`. Columns listed in `rawColumns` (e.g. amounts generated
// from integer cents) skip formula neutralising; all others are neutralised.
export function buildCsv(columns, rows, rawColumns = []) {
  const lines = [columns.map(escapeCsvField).join(',')]
  for (const row of rows) {
    lines.push(
      columns
        .map((col) => {
          const raw = String(row[col] ?? '')
          return escapeCsvField(rawColumns.includes(col) ? raw : neutraliseFormula(raw))
        })
        .join(',')
    )
  }
  return '﻿' + lines.join('\r\n') + '\r\n'
}

// Triggers a browser download of `csv` as `filename`.
export function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
