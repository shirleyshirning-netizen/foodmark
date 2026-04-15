import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import { detectStateAndCity } from '@/lib/malaysia'

const API_KEY =
  process.env.GOOGLE_PLACES_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ||
  ''

const SCRAPINGBEE_KEY = process.env.SCRAPINGBEE_API_KEY || ''

const GOOGLE_MAPS_PATTERN = /https:\/\/(www\.)?google\.[a-z.]+\/maps\//i
const GOOGLE_SEARCH_PATTERN = /https:\/\/(?:www\.)?google\.[a-z.]+\/search\?/i

// ─── ScrapingBee: follow redirect and return final URL ───────────────────────
async function tryScrapingBee(url: string): Promise<string | null> {
  if (!SCRAPINGBEE_KEY) {
    console.log('[share-google] ScrapingBee key not set, skipping')
    return null
  }
  try {
    const params = new URLSearchParams({
      api_key: SCRAPINGBEE_KEY,
      url,
      render_js: 'false',   // no JS rendering needed, just follow redirects
      premium_proxy: 'true', // bypass Google bot detection
      return_page_content: 'true',
    })
    const endpoint = `https://app.scrapingbee.com/api/v1/?${params}`
    console.log(`[share-google] ScrapingBee → ${url}`)
    const res = await fetch(endpoint, { method: 'GET' })
    // ScrapingBee returns the final URL in this header
    const resolvedUrl = res.headers.get('Spb-Resolved-Url') || ''
    console.log(`[share-google] ScrapingBee resolved URL: ${resolvedUrl || '(none)'}`)

    if (resolvedUrl && (resolvedUrl.includes('/sorry') || GOOGLE_MAPS_PATTERN.test(resolvedUrl))) {
      return resolvedUrl
    }

    // Fallback: scan the response body for a Maps URL or /sorry
    const body = await res.text()
    const mapMatch = body.match(/https:\/\/(?:www\.)?google\.[a-z.]+\/maps\/[^\s"'<>]+/i)
    if (mapMatch) {
      console.log(`[share-google] ScrapingBee found Maps URL in body: ${mapMatch[0]}`)
      return mapMatch[0]
    }

    // Extract /sorry URL from body if present
    const sorryMatch = body.match(/https:\/\/www\.google\.com\/sorry[^\s"'<>]+/i)
    if (sorryMatch) {
      console.log(`[share-google] ScrapingBee found /sorry URL in body: ${sorryMatch[0]}`)
      return sorryMatch[0]
    }

    console.log(`[share-google] ScrapingBee: no useful URL found`)
    return null
  } catch (e) {
    console.log(`[share-google] ScrapingBee error: ${e}`)
    return null
  }
}

// ─── Parse the decoded `continue` URL for name, kgmid, coords ────────────────
interface ContinueInfo {
  rawDecoded: string
  restaurantName: string | null
  kgmid: string | null          // e.g. "/g/11g9qbpd44"
  coords: { lat: number; lng: number } | null
}

function parseContinueParam(sorryUrl: string): ContinueInfo | null {
  try {
    const sorryParsed = new URL(sorryUrl)
    const continueRaw = sorryParsed.searchParams.get('continue')
    if (!continueRaw) {
      console.log('[share-google] No "continue" param found in /sorry URL')
      return null
    }

    // Decode once (query strings are encoded once by the browser)
    let decoded = decodeURIComponent(continueRaw)
    // Some clients double-encode; try a second decode if still has %2F etc.
    if (decoded.includes('%2F') || decoded.includes('%3D')) {
      try { decoded = decodeURIComponent(decoded) } catch {}
    }
    console.log(`[share-google] continue decoded: ${decoded}`)

    let continueUrl: URL
    try {
      continueUrl = new URL(decoded)
    } catch {
      console.log('[share-google] continue is not a valid URL, will regex-parse')
      const nameFromRaw = decoded.match(/[?&]q=([^&]+)/)?.[1]
      const kgmidFromRaw = decoded.match(/kgmid=([^&]+)/)?.[1]
      return {
        rawDecoded: decoded,
        restaurantName: nameFromRaw ? decodeURIComponent(nameFromRaw.replace(/\+/g, ' ')) : null,
        kgmid: kgmidFromRaw ? decodeURIComponent(kgmidFromRaw) : null,
        coords: null,
      }
    }

    // Priority: q > query > path segment
    const qRaw =
      continueUrl.searchParams.get('q') ||
      continueUrl.searchParams.get('query') ||
      null

    let restaurantName: string | null = null
    if (qRaw) {
      restaurantName = decodeURIComponent(qRaw.replace(/\+/g, ' '))
    } else {
      // Extract from /maps/place/NAME or /maps/search/NAME
      const pathMatch = continueUrl.pathname.match(/\/maps\/(?:place|search)\/([^/@?]+)/)
      if (pathMatch?.[1]) {
        restaurantName = decodeURIComponent(pathMatch[1].replace(/\+/g, ' '))
      }
    }

    // kgmid: format is "/g/xxxxxxxxx"
    const kgmidRaw =
      continueUrl.searchParams.get('kgmid') ||
      decoded.match(/kgmid[=%]+([/a-z0-9_-]+)/i)?.[1] ||
      null
    const kgmid = kgmidRaw ? decodeURIComponent(kgmidRaw) : null

    // Coords from @lat,lng in URL
    const coordMatch = decoded.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    const coords = coordMatch
      ? { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]) }
      : null

    console.log(`[share-google] Parsed → name="${restaurantName}" kgmid="${kgmid}" coords=${JSON.stringify(coords)}`)
    return { rawDecoded: decoded, restaurantName, kgmid, coords }
  } catch (e) {
    console.log(`[share-google] parseContinueParam error: ${e}`)
    return null
  }
}

// ─── Try to resolve via simple HTTP fetch ─────────────────────────────────────
async function trySimpleFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        Accept: 'text/html',
      },
    })
    console.log(`[share-google] simple fetch → status=${res.status} finalUrl=${res.url}`)
    return res.url || null
  } catch (e) {
    console.log(`[share-google] simple fetch failed: ${e}`)
    return null
  }
}

// ─── Google Places Text Search ────────────────────────────────────────────────
async function placesTextSearch(name: string, lat?: number, lng?: number): Promise<any> {
  const locationBias = lat && lng ? `&location=${lat},${lng}&radius=2000` : ''
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(name)}${locationBias}&key=${API_KEY}`

  console.log(`[share-google] Places Text Search → query="${name}"${lat ? ` near ${lat},${lng}` : ''}`)
  const res = await fetch(url)
  const data = await res.json()
  console.log(`[share-google] Places response → status=${data.status} results=${data.results?.length ?? 0}${data.error_message ? ` error="${data.error_message}"` : ''}`)

  if (data.status !== 'OK') return { _apiError: `${data.status}${data.error_message ? ': ' + data.error_message : ''}` }
  return data.results?.[0] ?? null
}

// ─── Google Places Details ────────────────────────────────────────────────────
async function placesDetails(placeId: string): Promise<any> {
  const fields = 'name,formatted_address,rating,user_ratings_total,photos,geometry,types,place_id,opening_hours,formatted_phone_number'
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${API_KEY}`
  const res = await fetch(url)
  const data = await res.json()
  console.log(`[share-google] Places Details → status=${data.status}`)
  if (data.status !== 'OK') return null
  return data.result ?? null
}

function buildPhotoUrl(ref: string) {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${ref}&key=${API_KEY}`
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  if (!API_KEY) {
    return NextResponse.json({ error: 'Server config error: Google Places API key is not set.' }, { status: 500 })
  }

  console.log(`\n[share-google] ══ Input: ${url}`)

  // ── Step 1: Follow redirect (simple fetch → ScrapingBee → Puppeteer) ────────
  let finalUrl = await trySimpleFetch(url)

  // ── Step 1b: If simple fetch returned a Google Search URL, extract name directly ──
  if (finalUrl && GOOGLE_SEARCH_PATTERN.test(finalUrl)) {
    console.log(`[share-google] Simple fetch landed on Google Search URL — extracting directly`)
    try {
      const searchUrl = new URL(finalUrl)
      const q = searchUrl.searchParams.get('q')
      const kgmid = searchUrl.searchParams.get('kgmid')
      if (q) {
        const name = decodeURIComponent(q.replace(/\+/g, ' '))
        console.log(`[share-google] Extracted from Search URL → name="${name}" kgmid="${kgmid}"`)
        const searchResult = await placesTextSearch(name)
        if (searchResult?._apiError) {
          return NextResponse.json({ error: `Google Places API error: ${searchResult._apiError}` }, { status: 502 })
        }
        if (!searchResult) {
          return NextResponse.json({ error: `No results found for "${name}"` }, { status: 404 })
        }
        let placeData = searchResult
        if (searchResult.place_id) {
          const details = await placesDetails(searchResult.place_id)
          if (details) placeData = details
        }
        const address = placeData.formatted_address || placeData.vicinity || ''
        const lat2 = placeData.geometry?.location?.lat
        const lng2 = placeData.geometry?.location?.lng
        const photoUrls = placeData.photos?.length > 0 ? placeData.photos.slice(0, 5).map((p: any) => buildPhotoUrl(p.photo_reference)) : undefined
        const photoUrl = photoUrls?.[0]
        const placeId = placeData.place_id
        const { state, city } = detectStateAndCity(address)
        const openingHours = placeData.opening_hours
          ? { open_now: placeData.opening_hours.open_now, weekday_text: placeData.opening_hours.weekday_text || [] }
          : undefined
        console.log(`[share-google] ✓ Done (via Search URL): "${placeData.name}" | ${state}, ${city}`)
        return NextResponse.json({
          name: placeData.name, address, rating: placeData.rating || 0,
          totalRatings: placeData.user_ratings_total || 0, photoUrl, photoUrls, placeId, state, city,
          lat: lat2, lng: lng2,
          googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
          wazeUrl: lat2 && lng2 ? `https://waze.com/ul?ll=${lat2},${lng2}&navigate=yes` : `https://waze.com/ul?q=${encodeURIComponent(placeData.name)}`,
          types: placeData.types || [], openingHours, phone: placeData.formatted_phone_number || undefined,
        })
      }
    } catch (e) {
      console.log(`[share-google] Failed to extract from Search URL: ${e}`)
    }
  }

  if (!finalUrl || (!finalUrl.includes('/sorry') && !GOOGLE_MAPS_PATTERN.test(finalUrl))) {
    console.log('[share-google] Simple fetch did not land on /sorry or Maps — trying ScrapingBee…')
    finalUrl = await tryScrapingBee(url)
  }

  if (!finalUrl || (!finalUrl.includes('/sorry') && !GOOGLE_MAPS_PATTERN.test(finalUrl))) {
    console.log('[share-google] ScrapingBee did not resolve — trying Puppeteer…')
    finalUrl = await tryWithPuppeteer(url)
  }

  if (!finalUrl) {
    return NextResponse.json({ error: 'Could not follow the share.google redirect.' }, { status: 502 })
  }

  console.log(`[share-google] Final URL: ${finalUrl}`)

  // ── Step 2: Parse the continue param from /sorry ────────────────────────────
  let restaurantName: string | null = null
  let coords: { lat: number; lng: number } | null = null

  if (finalUrl.includes('/sorry')) {
    const info = parseContinueParam(finalUrl)
    if (!info) {
      return NextResponse.json(
        { error: `Blocked by Google (/sorry page). Could not parse continue param from: ${finalUrl}` },
        { status: 422 }
      )
    }
    restaurantName = info.restaurantName
    coords = info.coords
  } else if (GOOGLE_MAPS_PATTERN.test(finalUrl)) {
    // Lucky — no /sorry, got Maps URL directly
    const u = new URL(finalUrl)
    const q = u.searchParams.get('q') || u.searchParams.get('query')
    if (q) {
      restaurantName = decodeURIComponent(q.replace(/\+/g, ' '))
    } else {
      const m = u.pathname.match(/\/maps\/(?:place|search)\/([^/@?]+)/)
      if (m?.[1]) restaurantName = decodeURIComponent(m[1].replace(/\+/g, ' '))
    }
    const cm = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (cm) coords = { lat: parseFloat(cm[1]), lng: parseFloat(cm[2]) }
  } else {
    return NextResponse.json(
      { error: `Unexpected final URL (not /sorry and not Maps): ${finalUrl}` },
      { status: 422 }
    )
  }

  if (!restaurantName) {
    return NextResponse.json(
      { error: `Could not extract restaurant name. Final URL: ${finalUrl}` },
      { status: 422 }
    )
  }

  // ── Step 3: Places Text Search ──────────────────────────────────────────────
  const searchResult = await placesTextSearch(restaurantName, coords?.lat, coords?.lng)

  if (searchResult?._apiError) {
    return NextResponse.json({ error: `Google Places API error: ${searchResult._apiError}` }, { status: 502 })
  }
  if (!searchResult) {
    return NextResponse.json({ error: `No results found for "${restaurantName}"` }, { status: 404 })
  }

  // ── Step 4: Get full place details ──────────────────────────────────────────
  let placeData = searchResult
  if (searchResult.place_id) {
    const details = await placesDetails(searchResult.place_id)
    if (details) placeData = details
  }

  const address = placeData.formatted_address || placeData.vicinity || ''
  const lat2 = placeData.geometry?.location?.lat
  const lng2 = placeData.geometry?.location?.lng
  const photoUrls = placeData.photos?.length > 0
    ? placeData.photos.slice(0, 5).map((p: any) => buildPhotoUrl(p.photo_reference))
    : undefined
  const photoUrl = photoUrls?.[0]
  const placeId = placeData.place_id
  const { state, city } = detectStateAndCity(address)

  const openingHours = placeData.opening_hours
    ? {
        open_now: placeData.opening_hours.open_now,
        weekday_text: placeData.opening_hours.weekday_text || [],
      }
    : undefined

  console.log(`[share-google] ✓ Done: "${placeData.name}" | ${state}, ${city}`)

  return NextResponse.json({
    name: placeData.name,
    address,
    rating: placeData.rating || 0,
    totalRatings: placeData.user_ratings_total || 0,
    photoUrl,
    photoUrls,
    placeId,
    state,
    city,
    lat: lat2,
    lng: lng2,
    googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
    wazeUrl: lat2 && lng2
      ? `https://waze.com/ul?ll=${lat2},${lng2}&navigate=yes`
      : `https://waze.com/ul?q=${encodeURIComponent(placeData.name)}`,
    types: placeData.types || [],
    openingHours,
    phone: placeData.formatted_phone_number || undefined,
  })
}

// ─── Puppeteer fallback ───────────────────────────────────────────────────────
async function tryWithPuppeteer(url: string): Promise<string | null> {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    })
    const page = await browser.newPage()
    await page.setRequestInterception(true)
    page.on('request', (r) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(r.resourceType())) r.abort()
      else r.continue()
    })

    const visited: string[] = []
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        visited.push(frame.url())
        console.log(`[share-google][puppeteer] → ${frame.url()}`)
      }
    })

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {})
    const finalUrl = page.url()

    return (
      [...visited, finalUrl].find(
        (u) => u.includes('/sorry') || GOOGLE_MAPS_PATTERN.test(u)
      ) ?? finalUrl
    )
  } catch (e) {
    console.error(`[share-google][puppeteer] error: ${e}`)
    return null
  } finally {
    if (browser) await browser.close()
  }
}
