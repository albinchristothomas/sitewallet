// Are we running inside the native App Store / Play Store shell (Capacitor
// WebView) rather than a browser tab or an installed PWA? Client-side only;
// returns false during SSR so markup stays identical on both sides.
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}
