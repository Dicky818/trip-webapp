/**
 * Public browser key for Google Maps JavaScript API.
 *
 * The Maps JavaScript API necessarily receives this key in the browser. Its
 * security boundary is maintained in Google Cloud: website referrers are
 * limited to https://dicky818.github.io/* and API access remains restricted.
 */
const RESTRICTED_BROWSER_MAPS_KEY = 'AIzaSyC2nGsemTui7QefizMxTujzDMS4TBup_2c';

export const GOOGLE_MAPS_API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ||
  RESTRICTED_BROWSER_MAPS_KEY;
