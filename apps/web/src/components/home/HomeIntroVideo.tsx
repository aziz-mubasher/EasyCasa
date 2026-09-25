'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  HOME_INTRO_CATALOG_PATH,
  HOME_INTRO_LANGS,
  HOME_INTRO_LANG_LABELS,
  type HomeIntroCatalog,
  type HomeIntroLang,
  defaultHomeIntroLang,
  homeIntroEmbedSrc,
  pickHomeIntroVideo,
} from '@/lib/home-intro-video';

type Props = {
  locale: string;
  title: string;
  langLabel: string;
  catalog: HomeIntroCatalog;
};

export function HomeIntroVideo({ locale, title, langLabel, catalog: initialCatalog }: Props) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const initial = useMemo(() => {
    const preferred = defaultHomeIntroLang(locale);
    return pickHomeIntroVideo(catalog.videos, preferred);
  }, [catalog.videos, locale]);
  const [lang, setLang] = useState<HomeIntroLang | null>(initial);
  const videoId = lang ? catalog.videos[lang] : undefined;
  const available = HOME_INTRO_LANGS.filter((l) => catalog.videos[l]);

  useEffect(() => {
    let cancelled = false;
    fetch(HOME_INTRO_CATALOG_PATH)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: HomeIntroCatalog | null) => {
        if (cancelled || !data?.libraryId) return;
        setCatalog(data);
      })
      .catch(() => {
        /* keep the server catalog */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setLang(initial);
  }, [initial]);

  return (
    <aside className="hm-video" aria-label={title}>
      <div className="hm-video-frame">
        {catalog.libraryId && videoId ? (
          <iframe
            key={videoId}
            src={homeIntroEmbedSrc(catalog.libraryId, videoId)}
            title={title}
            allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;fullscreen"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <div className="hm-video-slot" role="presentation" />
        )}
      </div>
      {available.length > 0 ? (
        <div className="hm-video-langs">
          <p className="hm-video-langs-label" id="hm-video-langs-label">
            {langLabel}
          </p>
          <div className="hm-video-langs-list" role="group" aria-labelledby="hm-video-langs-label">
            {available.map((l) => (
              <button
                key={l}
                type="button"
                className={l === lang ? 'is-active' : undefined}
                aria-pressed={l === lang}
                onClick={() => setLang(l)}
              >
                {HOME_INTRO_LANG_LABELS[l]}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
