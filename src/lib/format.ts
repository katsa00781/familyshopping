const huFormatter = new Intl.NumberFormat('hu-HU')

export function formatHuf(amount: number): string {
  return huFormatter.format(Math.round(amount)) + ' Ft'
}

export function formatHuNumber(amount: number): string {
  return huFormatter.format(Math.round(amount))
}

export function formatHuDate(dateStr: string): string {
  const base = dateStr.split('T')[0] ?? dateStr
  const [yyyy, mm, dd] = base.split('-')
  return `${yyyy}.${mm}.${dd}.`
}
