export type DeviceClass = 'mobile' | 'tablet' | 'desktop';

export type ParsedUa = {
  device: DeviceClass;
  browser: string;
  os: string;
  /** Family + major. Hash input only — never stored. */
  familyMajor: string;
};

function major(ua: string, token: RegExp): string {
  const m = ua.match(token);
  return m?.[1] ?? '0';
}

export function parseUa(ua: string): ParsedUa {
  const raw = ua.slice(0, 400);
  let browser = 'Other';
  let maj = '0';
  if (/Edg\//.test(raw)) {
    browser = 'Edge';
    maj = major(raw, /Edg\/(\d+)/);
  } else if (/OPR\/|Opera/.test(raw)) {
    browser = 'Opera';
    maj = major(raw, /OPR\/(\d+)/);
  } else if (/SamsungBrowser\//.test(raw)) {
    browser = 'Samsung';
    maj = major(raw, /SamsungBrowser\/(\d+)/);
  } else if (/Chrome\//.test(raw) && !/Chromium/.test(raw)) {
    browser = 'Chrome';
    maj = major(raw, /Chrome\/(\d+)/);
  } else if (/Firefox\//.test(raw)) {
    browser = 'Firefox';
    maj = major(raw, /Firefox\/(\d+)/);
  } else if (/Safari\//.test(raw)) {
    browser = 'Safari';
    maj = major(raw, /Version\/(\d+)/);
  }

  let os = 'Other';
  if (/iPhone|iPad|iOS/.test(raw)) os = 'iOS';
  else if (/Android/.test(raw)) os = 'Android';
  else if (/Windows/.test(raw)) os = 'Windows';
  else if (/Mac OS X|Macintosh/.test(raw)) os = 'macOS';
  else if (/Linux/.test(raw)) os = 'Linux';

  let device: DeviceClass = 'desktop';
  if (/iPad|Tablet/.test(raw)) device = 'tablet';
  else if (/Mobile|iPhone|Android/.test(raw)) device = 'mobile';

  return { device, browser, os, familyMajor: `${browser} ${maj}` };
}

export function primaryLanguage(header: string | undefined): string {
  if (!header) return '';
  const first = header.split(',')[0]?.split(';')[0]?.trim().toLowerCase() ?? '';
  return first.replace(/[^\w.-]/g, '').slice(0, 16);
}
