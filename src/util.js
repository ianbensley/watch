export function fmtValue(field, value) {
  if (value === undefined || value === null || value === '') return '—'
  if (field.type === 'boolean') return value ? 'Yes' : 'No'
  if (field.type === 'number') {
    const n = Number(value)
    const num = Number.isFinite(n) ? n.toLocaleString() : value
    if (field.unit === '£') return `£${num}`
    return field.unit ? `${num} ${field.unit}` : `${num}`
  }
  if (field.type === 'url') return value
  return String(value)
}

export const statusColor = (s) => ({
  Owned: '#4a9d6e',
  Wishlist: '#c8a24a',
  Considering: '#5b8bb0',
  Sold: '#8a8577',
}[s] || '#8a8577')

export function fieldByKey(fields) {
  const m = {}
  fields.forEach((f) => { m[f.key] = f })
  return m
}
