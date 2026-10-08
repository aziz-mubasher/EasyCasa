import type { Href } from 'expo-router';

/**
 * EC-APP-1 frame → route map.
 * Every screen on the Figma page "App v2 — schermate" has a route.
 * Edges follow the hrefs in docs/azm-deliverables/EC-APP-1/design-v2/source.
 */

export const NAV = {
  splash: '/splash',
  welcome: '/(welcome)',
  search: '/(tabs)',
  filters: '/filters',
  map: '/(search)',
  saved: '/(tabs)/favorites',
  listing: '/listing',
  write: '/write',
  sent: '/sent',
  booking: '/booking',
  seller: '/(owner)',
  inbox: '/(owner)/enquiries',
  rule: '/(owner)/rule',
  visits: '/(owner)/visits',
  visit: '/(owner)/visit',
  publish: '/(owner)/publish',
  documents: '/(owner)/documents',
  checkup: '/(owner)/checkup',
  receipt: '/(owner)/receipt',
  profileSeeker: '/(tabs)/profile',
  profileSeller: '/(owner)/profile',
  signIn: '/(auth)/sign-in',
  perimeter: '/perimeter',
  offline: '/offline',
  sessionExpired: '/session-expired',
  permLocation: '/permissions/location',
  permPhotos: '/permissions/photos',
  permNotifications: '/permissions/notifications',
} as const;

/** Dynamic paths are strings at runtime; Expo's typed routes only accept Href. */
export function toHref(path: string): Href {
  return path as Href;
}

export function listingPath(slug: string): Href {
  return toHref(`${NAV.listing}/${slug}`);
}

export function writePath(slug: string): Href {
  return toHref(`${NAV.write}/${slug}`);
}

export function sentPath(slug: string): Href {
  return toHref(`${NAV.sent}/${slug}`);
}

export function bookingPath(id: string): Href {
  return toHref(`${NAV.booking}/${id}`);
}

export function publishPath(step: string): Href {
  return toHref(`${NAV.publish}/${step}`);
}

export function visitPath(id: string): Href {
  return toHref(`${NAV.visit}/${id}`);
}

/** Frame id from the design README → app route (or native splash). */
export const FRAME_ROUTES: Record<string, string> = {
  '00a': 'native-splash',
  '00b': NAV.splash,
  '01': NAV.welcome,
  '15': NAV.welcome,
  '16': NAV.welcome,
  '02': NAV.search,
  '21': NAV.filters,
  '22': NAV.search,
  '03': NAV.map,
  '19': NAV.saved,
  '20': NAV.saved,
  '04': NAV.listing,
  '05': NAV.write,
  '23': NAV.sent,
  '06': NAV.booking,
  '07': NAV.seller,
  '08': NAV.inbox,
  '09': NAV.rule,
  '10': NAV.visits,
  '24': NAV.visit,
  '25': NAV.publish,
  '11': NAV.publish,
  '26': NAV.publish,
  '27': NAV.publish,
  '12': NAV.documents,
  '28': NAV.checkup,
  '29': NAV.receipt,
  '17': NAV.profileSeeker,
  '18': NAV.signIn,
  '13': NAV.profileSeller,
  '14': NAV.perimeter,
  '30': NAV.offline,
  '31': NAV.sessionExpired,
  '32': NAV.permLocation,
  '33': NAV.permPhotos,
  '34': NAV.permNotifications,
};

/**
 * Directed edges between frames. Targets must exist in FRAME_ROUTES.
 * 00a is the native splash and has no in-app link.
 */
export const FRAME_LINKS: Record<string, readonly string[]> = {
  '00a': [],
  '00b': ['01'],
  '01': ['15', '16', '02', '07', '18'],
  '15': ['01', '16', '02', '07', '18'],
  '16': ['01', '15', '02', '07', '18'],
  '02': ['21', '03', '19', '04', '17', '22'],
  '21': ['02'],
  '22': ['21', '19', '02', '17'],
  '03': ['02', '04', '19', '17', '32'],
  '19': ['20', '04', '02', '17', '18'],
  '20': ['19', '02', '17'],
  '04': ['02', '05', '06', '14', '30'],
  '05': ['04', '14', '23', '31', '34'],
  '23': ['04', '06'],
  '06': ['04'],
  '07': ['08', '10', '12', '09', '14', '13', '25'],
  '08': ['09', '10', '07', '12', '13'],
  '09': ['08'],
  '10': ['07', '08', '12', '13', '24'],
  '24': ['10'],
  '25': ['07', '11'],
  '11': ['07', '25', '26'],
  '26': ['07', '33', '11', '27'],
  '27': ['07', '11', '14'],
  '12': ['07', '08', '10', '13', '28'],
  '28': ['12', '29'],
  '29': ['12'],
  '17': ['18', '14', '02', '19'],
  '18': ['17', '13', '14'],
  '13': ['01', '07', '08', '10', '12', '14', '17'],
  '14': ['13', '17'],
  '30': ['02', '19', '17'],
  '31': ['18', '05', '04'],
  '32': ['03'],
  '33': ['26'],
  '34': ['23'],
};
