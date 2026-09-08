'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BUYER_INTRO_FRAMES, BUYER_INTRO_TOTAL_MS } from './buyer-intro-film';

type SceneCopy = { kicker: string; title: string; body: string };

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function BuyerIntroFilm() {
  const t = useTranslations('forBuyers.film');
  const scenes = t.raw('scenes') as SceneCopy[];
  const labelId = useId();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [elapsedInScene, setElapsedInScene] = useState(0);
  const startedRef = useRef(false);
  const reduce = useMemo(() => prefersReducedMotion(), []);

  const scene = BUYER_INTRO_FRAMES[index] ?? BUYER_INTRO_FRAMES[0];
  const copy = scenes[index] ?? scenes[0];
  const sceneMs = scene?.ms ?? 8000;

  const goTo = useCallback((next: number) => {
    const bounded = Math.max(0, Math.min(next, BUYER_INTRO_FRAMES.length - 1));
    setIndex(bounded);
    setElapsedInScene(0);
  }, []);

  useEffect(() => {
    if (reduce || startedRef.current) return;
    startedRef.current = true;
    setPlaying(true);
  }, [reduce]);

  useEffect(() => {
    if (!playing) return;
    const started = performance.now() - elapsedInScene;
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - started;
      if (elapsed >= sceneMs) {
        if (index >= BUYER_INTRO_FRAMES.length - 1) {
          setPlaying(false);
          setElapsedInScene(sceneMs);
          return;
        }
        setIndex((i) => i + 1);
        setElapsedInScene(0);
        return;
      }
      setElapsedInScene(elapsed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // Restart the clock when scene or play state changes; elapsed is reset by goTo / scene advance.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- elapsedInScene is a start offset, not a tick dep
  }, [playing, index, sceneMs]);

  const priorMs = BUYER_INTRO_FRAMES.slice(0, index).reduce((sum, frame) => sum + frame.ms, 0);
  const totalProgress = Math.min(1, (priorMs + elapsedInScene) / BUYER_INTRO_TOTAL_MS);
  const sceneProgress = Math.min(1, elapsedInScene / sceneMs);

  return (
    <div className="fb-film">
      <div
        className="fb-film__stage"
        role="region"
        aria-labelledby={labelId}
        aria-roledescription={t('title')}
      >
        {BUYER_INTRO_FRAMES.map((frame, i) => (
          <div
            key={frame.id}
            className={`fb-film__frame${i === index ? ' is-active' : ''}`}
            style={{ backgroundImage: `url(${frame.src})` }}
            aria-hidden={i !== index}
          />
        ))}
        <div className="fb-film__shade" />
        <div className="fb-film__copy">
          <p className="fb-film__brand">easy<span>casa</span></p>
          <p className="fb-film__kicker" id={labelId}>
            {copy?.kicker}
          </p>
          <h3 className="fb-film__title">{copy?.title}</h3>
          <p className="fb-film__body">{copy?.body}</p>
        </div>
        <div className="fb-film__progress" aria-hidden>
          <span style={{ width: `${totalProgress * 100}%` }} />
        </div>
      </div>

      <div className="fb-film__bar">
        <div className="fb-film__actions">
          <button
            type="button"
            className="fb-film__btn"
            onClick={() => {
              if (index === BUYER_INTRO_FRAMES.length - 1 && elapsedInScene >= sceneMs - 20) {
                goTo(0);
                setPlaying(true);
                return;
              }
              setPlaying((p) => !p);
            }}
          >
            {playing
              ? t('pause')
              : index === BUYER_INTRO_FRAMES.length - 1 && elapsedInScene >= sceneMs - 20
                ? t('replay')
                : t('play')}
          </button>
          <a className="fb-film__skip" href="#how">
            {t('skip')}
          </a>
        </div>
        <p className="fb-film__count" aria-live="polite">
          {t('sceneOf', { n: index + 1, total: BUYER_INTRO_FRAMES.length })}
        </p>
        <ol className="fb-film__dots">
          {BUYER_INTRO_FRAMES.map((frame, i) => (
            <li key={frame.id}>
              <button
                type="button"
                className={i === index ? 'is-active' : undefined}
                aria-current={i === index ? 'true' : undefined}
                aria-label={scenes[i]?.title ?? frame.id}
                onClick={() => {
                  goTo(i);
                  setPlaying(true);
                }}
              >
                {i === index ? <span style={{ transform: `scaleX(${sceneProgress})` }} /> : null}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
