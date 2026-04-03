import { NextRequest, NextResponse } from 'next/server'

const API_KEY =
  process.env.GOOGLE_PLACES_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ||
  ''

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('input') || ''

  if (input.length < 2) {
    return NextResponse.json({ suggestions: [] })
  }

  if (!API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=establishment&location=4.2105,101.9758&radius=500000&key=${API_KEY}`
    const res = await fetch(url)
    const data = await res.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return NextResponse.json(
        { error: `${data.status}${data.error_message ? ': ' + data.error_message : ''}` },
        { status: 502 }
      )
    }

    const suggestions = (data.predictions || []).slice(0, 5).map((p: any) => ({
      placeId: p.place_id,
      name: p.structured_formatting?.main_text || p.description,
      address: p.structured_formatting?.secondary_text || '',
    }))

    return NextResponse.json({ suggestions })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
