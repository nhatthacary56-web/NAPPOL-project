/** Build a public carrier tracking URL when possible. */
export function trackingUrl(carrier?: string | null, trackingNumber?: string | null): string | null {
  const track = String(trackingNumber || '').trim()
  if (!track) return null
  const name = String(carrier || '').toLowerCase()
  const q = encodeURIComponent(track)

  if (name.includes('kerry')) {
    return `https://th.kerryexpress.com/th/track/?track=${q}`
  }
  if (name.includes('flash')) {
    return `https://www.flashexpress.com/fle/tracking?se=${q}`
  }
  if (name.includes('j&t') || name.includes('jnt') || name.includes('jt')) {
    return `https://jtexpress.co.th/service/track?billcode=${q}`
  }
  if (name.includes('thai post') || name.includes('thailand post') || name.includes('ไปรษณีย์')) {
    return `https://track.thailandpost.co.th/?trackNumber=${q}`
  }
  if (name.includes('spx')) {
    return `https://spx.co.th/track?${q}`
  }
  return `https://www.google.com/search?q=${encodeURIComponent(`${carrier || ''} ${track} track`)}`
}
