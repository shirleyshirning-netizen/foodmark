/**
 * Attempts to extract a Google Place ID or search query from a Google Maps URL.
 * Handles formats:
 *  - https://www.google.com/maps/place/NAME/@lat,lng,...
 *  - https://maps.google.com/?cid=NUMBER
 *  - https://maps.google.com/?q=NAME
 *  - https://maps.app.goo.gl/... (resolved server-side)
 *  - https://goo.gl/maps/...
 *  - https://share.google/... (new Google share links, resolved server-side)
 */
export interface ParsedPlaceUrl {
  type: 'place_id' | 'cid' | 'query' | 'coords' | 'short_url'
  value: string
  lat?: number
  lng?: number
}

export function parsePlaceUrl(url: string): ParsedPlaceUrl | null {
  try {
    const u = new URL(url.trim())

    // Short URLs — need server-side resolution
    if (
      u.hostname === 'maps.app.goo.gl' ||
      u.hostname === 'goo.gl' ||
      u.hostname === 'share.google' ||
      u.hostname === 'maps.google.com.my' ||
      url.includes('goo.gl')
    ) {
      return { type: 'short_url', value: url.trim() }
    }

    // CID param
    const cid = u.searchParams.get('cid')
    if (cid) return { type: 'cid', value: cid }

    // Query param
    const q = u.searchParams.get('q')
    if (q) return { type: 'query', value: q }

    // /maps/place/NAME/...
    const pathMatch = u.pathname.match(/\/maps\/place\/([^/]+)/)
    if (pathMatch) {
      const name = decodeURIComponent(pathMatch[1].replace(/\+/g, ' '))

      // Try extract coords from path for better accuracy
      const coordMatch = u.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
      if (coordMatch) {
        return {
          type: 'query',
          value: name,
          lat: parseFloat(coordMatch[1]),
          lng: parseFloat(coordMatch[2]),
        }
      }
      return { type: 'query', value: name }
    }

    // Coords in path
    const coordMatch = u.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (coordMatch) {
      return {
        type: 'coords',
        value: `${coordMatch[1]},${coordMatch[2]}`,
        lat: parseFloat(coordMatch[1]),
        lng: parseFloat(coordMatch[2]),
      }
    }

    return null
  } catch {
    return null
  }
}
