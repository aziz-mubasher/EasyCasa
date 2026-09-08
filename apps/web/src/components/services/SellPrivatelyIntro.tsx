'use client';

import { useTranslations } from 'next-intl';

const VIDEO_SRC = '/videos/vendi-da-privato-intro.it.mp4';
const CAPTIONS_SRC = '/videos/vendi-da-privato-intro.it.vtt';
const POSTER_SRC = '/videos/vendi-da-privato-intro.poster.webp';

export function SellPrivatelyIntro() {
  const t = useTranslations('sellPrivately.intro');
  const lines = t.raw('transcript') as string[];

  return (
    <section id="intro" className="sp-section sp-intro" aria-labelledby="sp-intro-title">
      <div className="sp-wrap">
        <p className="sp-kicker">{t('kicker')}</p>
        <h2 id="sp-intro-title" className="sp-display">
          {t('title')}
        </h2>
        <p className="sp-body">{t('body')}</p>
        <figure className="sp-intro-player">
          <video
            className="sp-intro-video"
            controls
            playsInline
            preload="metadata"
            poster={POSTER_SRC}
            aria-label={t('videoAria')}
          >
            <source src={VIDEO_SRC} type="video/mp4" />
            <track kind="captions" srcLang="it" label={t('captionsLabel')} src={CAPTIONS_SRC} default />
          </video>
          <figcaption className="sp-intro-caption">{t('caption')}</figcaption>
        </figure>
        <details className="sp-intro-transcript">
          <summary>{t('transcriptToggle')}</summary>
          <ol>
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </details>
      </div>
    </section>
  );
}
