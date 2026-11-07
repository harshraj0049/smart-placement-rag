export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now()
  const abs = Math.abs(ms)
  const h = Math.floor(abs / 3600000)
  const d = Math.floor(h / 24)
  const text = d >= 1 ? `${d}d ${h % 24}h` : h >= 1 ? `${h}h` : `${Math.max(1, Math.floor(abs / 60000))}m`
  return { text, overdue: ms < 0, hours: ms / 3600000 }
}
export function ago(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  const d = Math.floor(s / 86400)
  return d === 1 ? 'Yesterday' : `${d} days ago`
}
export const shortDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
export const dateTime = (iso) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
export const initials = (n = '') => n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
