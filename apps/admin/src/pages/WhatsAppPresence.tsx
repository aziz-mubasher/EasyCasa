import React, { useEffect, useRef, useState } from 'react';

import { useApi } from '../api';

function beep(): void {
  const Ctx = window.AudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 880;
  gain.gain.value = 0.04;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.12);
  osc.onended = () => void ctx.close();
}

/** Heartbeat while #whatsapp is the visible tab. Desktop permission is requested only from the button. */
export function WhatsAppPresence({ onCount }: { onCount: (count: number) => void }) {
  const api = useApi();
  const [available, setAvailable] = useState(() => window.localStorage.getItem('wa-available') !== '0');
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification === 'undefined' ? 'denied' : Notification.permission,
  );
  const seen = useRef(new Set<string>());
  const ready = useRef(false);

  useEffect(() => {
    window.localStorage.setItem('wa-available', available ? '1' : '0');
  }, [available]);

  useEffect(() => {
    let timer = 0;
    const beat = () => {
      const onWhatsApp = window.location.hash.replace(/^#/, '').startsWith('whatsapp');
      if (!onWhatsApp || document.visibilityState !== 'visible') return;
      void api.beatWhatsAppPresence(available).catch(() => undefined);
      void api
        .listWhatsAppAlerts()
        .then((res) => {
          onCount(res.items.length);
          if (!ready.current) {
            for (const item of res.items) seen.current.add(`${item.leadId}:${item.step}`);
            ready.current = true;
            return;
          }
          for (const item of res.items) {
            const key = `${item.leadId}:${item.step}`;
            if (seen.current.has(key)) continue;
            seen.current.add(key);
            beep();
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification(item.subject);
            }
          }
        })
        .catch(() => undefined);
    };
    const arm = () => {
      window.clearInterval(timer);
      beat();
      timer = window.setInterval(beat, 60_000);
    };
    arm();
    window.addEventListener('hashchange', arm);
    document.addEventListener('visibilitychange', arm);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('hashchange', arm);
      document.removeEventListener('visibilitychange', arm);
    };
  }, [api, available, onCount]);

  return (
    <div>
      <button type="button" className="btn btn--sm" onClick={() => setAvailable((value) => !value)}>
        {available ? 'Available' : 'Away'}
      </button>
      {permission === 'default' ? (
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => {
            if (typeof Notification === 'undefined') return;
            void Notification.requestPermission().then((next) => setPermission(next));
          }}
        >
          Enable desktop alerts
        </button>
      ) : null}
    </div>
  );
}
