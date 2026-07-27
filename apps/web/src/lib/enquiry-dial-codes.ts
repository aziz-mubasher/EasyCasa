/**
 * Dial codes for enquiry phone — Italy (+39) first, then the rest by code.
 * Kept as a static list (no i18n dependency) for the country-code select.
 */

export type DialCodeOption = {
  /** E.164 country calling code including leading +, e.g. "+39" */
  code: string;
  /** ISO 3166-1 alpha-2 when unique; empty for shared codes */
  iso: string;
  /** Short English label for the select option */
  label: string;
};

const DIAL_CODES_REST: DialCodeOption[] = [
  { code: '+1', iso: 'US', label: 'United States / Canada' },
  { code: '+7', iso: 'RU', label: 'Russia / Kazakhstan' },
  { code: '+20', iso: 'EG', label: 'Egypt' },
  { code: '+27', iso: 'ZA', label: 'South Africa' },
  { code: '+30', iso: 'GR', label: 'Greece' },
  { code: '+31', iso: 'NL', label: 'Netherlands' },
  { code: '+32', iso: 'BE', label: 'Belgium' },
  { code: '+33', iso: 'FR', label: 'France' },
  { code: '+34', iso: 'ES', label: 'Spain' },
  { code: '+36', iso: 'HU', label: 'Hungary' },
  { code: '+40', iso: 'RO', label: 'Romania' },
  { code: '+41', iso: 'CH', label: 'Switzerland' },
  { code: '+43', iso: 'AT', label: 'Austria' },
  { code: '+44', iso: 'GB', label: 'United Kingdom' },
  { code: '+45', iso: 'DK', label: 'Denmark' },
  { code: '+46', iso: 'SE', label: 'Sweden' },
  { code: '+47', iso: 'NO', label: 'Norway' },
  { code: '+48', iso: 'PL', label: 'Poland' },
  { code: '+49', iso: 'DE', label: 'Germany' },
  { code: '+51', iso: 'PE', label: 'Peru' },
  { code: '+52', iso: 'MX', label: 'Mexico' },
  { code: '+54', iso: 'AR', label: 'Argentina' },
  { code: '+55', iso: 'BR', label: 'Brazil' },
  { code: '+56', iso: 'CL', label: 'Chile' },
  { code: '+57', iso: 'CO', label: 'Colombia' },
  { code: '+58', iso: 'VE', label: 'Venezuela' },
  { code: '+60', iso: 'MY', label: 'Malaysia' },
  { code: '+61', iso: 'AU', label: 'Australia' },
  { code: '+62', iso: 'ID', label: 'Indonesia' },
  { code: '+63', iso: 'PH', label: 'Philippines' },
  { code: '+64', iso: 'NZ', label: 'New Zealand' },
  { code: '+65', iso: 'SG', label: 'Singapore' },
  { code: '+66', iso: 'TH', label: 'Thailand' },
  { code: '+81', iso: 'JP', label: 'Japan' },
  { code: '+82', iso: 'KR', label: 'South Korea' },
  { code: '+84', iso: 'VN', label: 'Vietnam' },
  { code: '+86', iso: 'CN', label: 'China' },
  { code: '+90', iso: 'TR', label: 'Türkiye' },
  { code: '+91', iso: 'IN', label: 'India' },
  { code: '+92', iso: 'PK', label: 'Pakistan' },
  { code: '+93', iso: 'AF', label: 'Afghanistan' },
  { code: '+94', iso: 'LK', label: 'Sri Lanka' },
  { code: '+95', iso: 'MM', label: 'Myanmar' },
  { code: '+98', iso: 'IR', label: 'Iran' },
  { code: '+212', iso: 'MA', label: 'Morocco' },
  { code: '+213', iso: 'DZ', label: 'Algeria' },
  { code: '+216', iso: 'TN', label: 'Tunisia' },
  { code: '+218', iso: 'LY', label: 'Libya' },
  { code: '+220', iso: 'GM', label: 'Gambia' },
  { code: '+221', iso: 'SN', label: 'Senegal' },
  { code: '+234', iso: 'NG', label: 'Nigeria' },
  { code: '+254', iso: 'KE', label: 'Kenya' },
  { code: '+351', iso: 'PT', label: 'Portugal' },
  { code: '+352', iso: 'LU', label: 'Luxembourg' },
  { code: '+353', iso: 'IE', label: 'Ireland' },
  { code: '+354', iso: 'IS', label: 'Iceland' },
  { code: '+355', iso: 'AL', label: 'Albania' },
  { code: '+356', iso: 'MT', label: 'Malta' },
  { code: '+357', iso: 'CY', label: 'Cyprus' },
  { code: '+358', iso: 'FI', label: 'Finland' },
  { code: '+359', iso: 'BG', label: 'Bulgaria' },
  { code: '+370', iso: 'LT', label: 'Lithuania' },
  { code: '+371', iso: 'LV', label: 'Latvia' },
  { code: '+372', iso: 'EE', label: 'Estonia' },
  { code: '+380', iso: 'UA', label: 'Ukraine' },
  { code: '+381', iso: 'RS', label: 'Serbia' },
  { code: '+382', iso: 'ME', label: 'Montenegro' },
  { code: '+385', iso: 'HR', label: 'Croatia' },
  { code: '+386', iso: 'SI', label: 'Slovenia' },
  { code: '+387', iso: 'BA', label: 'Bosnia and Herzegovina' },
  { code: '+389', iso: 'MK', label: 'North Macedonia' },
  { code: '+420', iso: 'CZ', label: 'Czechia' },
  { code: '+421', iso: 'SK', label: 'Slovakia' },
  { code: '+961', iso: 'LB', label: 'Lebanon' },
  { code: '+962', iso: 'JO', label: 'Jordan' },
  { code: '+964', iso: 'IQ', label: 'Iraq' },
  { code: '+965', iso: 'KW', label: 'Kuwait' },
  { code: '+966', iso: 'SA', label: 'Saudi Arabia' },
  { code: '+971', iso: 'AE', label: 'United Arab Emirates' },
  { code: '+972', iso: 'IL', label: 'Israel' },
  { code: '+973', iso: 'BH', label: 'Bahrain' },
  { code: '+974', iso: 'QA', label: 'Qatar' },
  { code: '+977', iso: 'NP', label: 'Nepal' },
  { code: '+992', iso: 'TJ', label: 'Tajikistan' },
  { code: '+993', iso: 'TM', label: 'Turkmenistan' },
  { code: '+994', iso: 'AZ', label: 'Azerbaijan' },
  { code: '+995', iso: 'GE', label: 'Georgia' },
  { code: '+996', iso: 'KG', label: 'Kyrgyzstan' },
  { code: '+998', iso: 'UZ', label: 'Uzbekistan' },
];

export const DEFAULT_DIAL_CODE = '+39';

export const ENQUIRY_DIAL_CODES: DialCodeOption[] = [
  { code: '+39', iso: 'IT', label: 'Italy' },
  ...DIAL_CODES_REST.sort((a, b) => {
    const na = Number(a.code.slice(1));
    const nb = Number(b.code.slice(1));
    return na - nb;
  }),
];

export function isKnownDialCode(code: string): boolean {
  return ENQUIRY_DIAL_CODES.some((d) => d.code === code);
}
