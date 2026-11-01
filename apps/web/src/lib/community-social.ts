import links from '../../../../social-links.json';
import {
  ICONS,
  SCRIPT_FONT_HREF,
  buildSocialView,
  communityForLocale,
  facebookSameAs,
} from './community-social-core.mjs';

export { ICONS, SCRIPT_FONT_HREF, communityForLocale };
export const socialLinks = links;

export type SocialNetwork = 'facebook' | 'instagram' | 'tiktok' | 'youtube';

export type SocialIcon = {
  id: SocialNetwork;
  name: string;
  href: string;
  aria: string;
};

export type SocialRow = {
  id: string;
  label: string;
  lang: string;
  dir: 'ltr' | 'rtl';
  current: boolean;
  facebook: string;
  facebookAria: string;
  others: SocialIcon[];
};

export type SocialView = {
  heading: string;
  otherLabel: string;
  communityId: string;
  primary: SocialIcon[];
  rows: SocialRow[];
};

export function socialView(
  locale: string,
  options?: { kind?: 'follow' | 'community' },
): SocialView {
  return buildSocialView(locale, socialLinks, options) as SocialView;
}

export function ayniFacebookSameAs(): string[] {
  return facebookSameAs(socialLinks);
}
