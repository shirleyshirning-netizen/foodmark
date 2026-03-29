import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_MAPS_PATTERN = /https:\/\/(www\.)?google\.[a-z.]+\/maps/i

async function resolveToMapsUrl(shortUrl: string): Promise<{ resolved: string | null; log: string[] }> {
  const log: string[] = []

  log.push(`[resolve-url] Input: ${shortUrl}`)

  const res = await fetch(shortUrl, {
    method: 'GET',
    redirect: 'follow',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  })

  log.push(`[resolve-url] HTTP status: ${res.status}, final URL after redirect: ${res.url}`)

  if (GOOGLE_MAPS_PATTERN.test(res.url)) {
    log.push(`[resolve-url] ✓ Resolved via HTTP redirect chain`)
    return { resolved: res.url, log }
  }

  const html = await res.text()
  log.push(`[resolve-url] HTML body length: ${html.length} chars`)

  // 1. og:url
  const ogUrl = html.match(/<meta[^>]+property="og:url"[^>]+content="([^"]+)"/i)
    ?? html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:url"/i)
  log.push(`[resolve-url] og:url: ${ogUrl?.[1] ?? 'not found'}`)
  if (ogUrl?.[1] && GOOGLE_MAPS_PATTERN.test(ogUrl[1])) {
    log.push(`[resolve-url] ✓ Resolved via og:url`)
    return { resolved: ogUrl[1], log }
  }

  // 2. canonical
  const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)
  log.push(`[resolve-url] canonical: ${canonical?.[1] ?? 'not found'}`)
  if (canonical?.[1] && GOOGLE_MAPS_PATTERN.test(canonical[1])) {
    log.push(`[resolve-url] ✓ Resolved via canonical`)
    return { resolved: canonical[1], log }
  }

  // 3. window.location redirect in JS
  const locationRedirect = html.match(/window\.location(?:\.href)?\s*=\s*["']([^"']+google\.[^"']*\/maps[^"']*)["']/i)
  log.push(`[resolve-url] window.location redirect: ${locationRedirect?.[1] ?? 'not found'}`)
  if (locationRedirect?.[1]) {
    log.push(`[resolve-url] ✓ Resolved via window.location`)
    return { resolved: decodeURIComponent(locationRedirect[1]), log }
  }

  // 4. Any Google Maps URL in the page
  const embedded = html.match(/https:\/\/(?:www\.)?google\.[a-z.]+\/maps\/[^\s"'\\<>]+/i)
  log.push(`[resolve-url] Embedded maps URL: ${embedded?.[0] ?? 'not found'}`)
  if (embedded?.[0]) {
    log.push(`[resolve-url] ✓ Resolved via embedded URL`)
    return { resolved: embedded[0], log }
  }

  // Dump first 500 chars of body for diagnosis
  log.push(`[resolve-url] ✗ Could not find Maps URL. Body preview: ${html.slice(0, 500)}`)
  return { resolved: null, log }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 })
    }

    const { resolved, log } = await resolveToMapsUrl(url.trim())

    // Always print log to server console
    log.forEach((line) => console.log(line))

    if (!resolved) {
      return NextResponse.json(
        {
          error: 'Could not resolve to a Google Maps URL.',
          debugLog: log,
        },
        { status: 422 }
      )
    }

    return NextResponse.json({ resolvedUrl: resolved, debugLog: log })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[resolve-url] Exception:', msg)
    return NextResponse.json({ error: `Exception: ${msg}` }, { status: 500 })
  }
}
