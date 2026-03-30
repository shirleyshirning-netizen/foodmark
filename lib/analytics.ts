declare global {
  interface Window {
    gtag?: (...args: any[]) => void
  }
}

export const GA_MEASUREMENT_ID = 'G-DWR0ZMERMS'

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params)
  }
}
