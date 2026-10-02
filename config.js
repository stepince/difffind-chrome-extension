// Configuration boundary for future hosted, self-hosted and local modes.
export const APP = Object.freeze({
  name: 'DiffFind',
  url: 'https://app.difffind.com',
  width: 1280,
  height: 900,
});
export const WINDOW_KEY = 'difffindWindowId';
export const URL_KEY = 'difffindUrl';
/**
 * Returns a normalized http(s) URL, or undefined if invalid.
 * @param {unknown} value
 */
export function parseAppUrl(value) {
  try {
    const url = new URL(String(value).trim());
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
/** @param {Pick<typeof chrome, 'storage'>} api */
export async function getAppUrl(api) {
  const stored = await api.storage.local.get(URL_KEY);
  return parseAppUrl(stored[URL_KEY]) ?? APP.url;
}
