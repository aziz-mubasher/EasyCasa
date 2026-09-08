#!/usr/bin/env node
/**
 * Render the private-seller intro video (IT voice + 1920×1080 slides).
 *
 * Usage: node scripts/seller-intro-video/generate.mjs
 * Writes: apps/web/public/videos/vendi-da-privato-intro.it.{mp4,vtt} + poster.webp
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = join(ROOT, 'scripts/seller-intro-video');
const WORK = join(DIR, '.work');
const OUT = join(ROOT, 'apps/web/public/videos');
const ARTIFACTS = '/opt/cursor/artifacts';
const HOLD = 0.4;

const scenes = JSON.parse(readFileSync(join(DIR, 'scenes.json'), 'utf8'));
const chrome =
  process.env.CHROME_PATH ||
  ['/opt/google/chrome/chrome', '/usr/bin/google-chrome-stable', '/usr/bin/google-chrome'].find((p) =>
    existsSync(p),
  );
if (!chrome) throw new Error('Chrome not found');

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')}\n${res.stderr || res.stdout}`);
  }
  return res;
}

mkdirSync(WORK, { recursive: true });
mkdirSync(OUT, { recursive: true });
mkdirSync(ARTIFACTS, { recursive: true });

writeFileSync(
  join(WORK, 'scenes.html'),
  readFileSync(join(DIR, 'scenes.html'), 'utf8').replace('__SCENES__', JSON.stringify(scenes.scenes)),
);

if (spawnSync('python3', ['-c', 'import edge_tts'], { encoding: 'utf8' }).status !== 0) {
  run('python3', ['-m', 'pip', 'install', '--user', '--quiet', 'edge-tts']);
}

function synthScene(scene, index) {
  const mp3 = join(WORK, `${String(index).padStart(2, '0')}-${scene.id}.mp3`);
  const py = `
import asyncio, edge_tts
async def main():
    comm = edge_tts.Communicate(${JSON.stringify(scene.voice)}, ${JSON.stringify(scenes.voice)}, rate=${JSON.stringify(scenes.rate)})
    await comm.save(${JSON.stringify(mp3)})
asyncio.run(main())
`;
  writeFileSync(join(WORK, 'tts.py'), py);
  run('python3', [join(WORK, 'tts.py')]);
  const probe = run('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    mp3,
  ]);
  return { mp3, duration: Math.max(2.6, Number(probe.stdout.trim())) };
}

function renderSlide(index) {
  const png = join(WORK, `${String(index).padStart(2, '0')}.png`);
  const profile = join(WORK, `chrome-profile-${index}`);
  mkdirSync(profile, { recursive: true });
  const res = spawnSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      '--allow-file-access-from-files',
      `--user-data-dir=${profile}`,
      `--window-size=${scenes.width},${scenes.height}`,
      `--screenshot=${png}`,
      '--virtual-time-budget=8000',
      `file://${join(WORK, 'scenes.html')}?scene=${index}`,
    ],
    { encoding: 'utf8', timeout: 20_000 },
  );
  if (!existsSync(png)) {
    throw new Error(`screenshot missing for scene ${index}\n${res.stderr || res.stdout}`);
  }
  return png;
}

const built = [];
for (const [i, scene] of scenes.scenes.entries()) {
  process.stdout.write(`scene ${i + 1}/${scenes.scenes.length} ${scene.id}…\n`);
  const audio = synthScene(scene, i);
  built.push({ scene, ...audio, png: renderSlide(i) });
}

const audioInputs = [];
const audioLabels = [];
built.forEach((s, i) => {
  audioInputs.push('-i', s.mp3);
  audioLabels.push(`[${i}:a]apad=pad_dur=${HOLD}[a${i}]`);
});
run('ffmpeg', [
  '-y',
  ...audioInputs,
  '-filter_complex',
  `${audioLabels.join(';')};${built.map((_, i) => `[a${i}]`).join('')}concat=n=${built.length}:v=0:a=1[aout]`,
  '-map',
  '[aout]',
  '-c:a',
  'libmp3lame',
  '-q:a',
  '4',
  join(WORK, 'voice.mp3'),
]);

const videoInputs = ['-y'];
const videoFilters = [];
built.forEach((s, i) => {
  const t = (s.duration + HOLD).toFixed(3);
  videoInputs.push('-loop', '1', '-t', t, '-i', s.png);
  videoFilters.push(
    `[${i}:v]scale=1920:1080,fps=30,format=yuv420p,fade=t=in:st=0:d=0.22,fade=t=out:st=${Math.max(0.35, s.duration + HOLD - 0.28).toFixed(2)}:d=0.22[v${i}]`,
  );
});
const videoN = built.length;
run('ffmpeg', [
  ...videoInputs,
  '-i',
  join(WORK, 'voice.mp3'),
  '-filter_complex',
  `${videoFilters.join(';')};${built.map((_, i) => `[v${i}]`).join('')}concat=n=${videoN}:v=1:a=0[vout]`,
  '-map',
  '[vout]',
  '-map',
  `${videoN}:a`,
  '-c:v',
  'libx264',
  '-pix_fmt',
  'yuv420p',
  '-crf',
  '24',
  '-preset',
  'medium',
  '-c:a',
  'aac',
  '-b:a',
  '128k',
  '-shortest',
  '-movflags',
  '+faststart',
  join(WORK, 'intro.it.mp4'),
]);

function formatTs(sec) {
  const ms = Math.round(sec * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const milli = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(milli).padStart(3, '0')}`;
}

let cursor = 0;
const vtt = ['WEBVTT', ''];
for (const s of built) {
  vtt.push(`${formatTs(cursor)} --> ${formatTs(cursor + s.duration)}`, s.scene.voice, '');
  cursor += s.duration + HOLD;
}
writeFileSync(join(WORK, 'intro.it.vtt'), `${vtt.join('\n')}\n`);

run('ffmpeg', ['-y', '-i', built[0].png, '-frames:v', '1', '-vf', 'scale=1280:-1', join(WORK, 'poster.webp')]);

const mp4Out = join(OUT, 'vendi-da-privato-intro.it.mp4');
const vttOut = join(OUT, 'vendi-da-privato-intro.it.vtt');
const posterOut = join(OUT, 'vendi-da-privato-intro.poster.webp');
copyFileSync(join(WORK, 'intro.it.mp4'), mp4Out);
copyFileSync(join(WORK, 'intro.it.vtt'), vttOut);
copyFileSync(join(WORK, 'poster.webp'), posterOut);
copyFileSync(mp4Out, join(ARTIFACTS, 'easycasa_seller_intro.it.mp4'));
copyFileSync(vttOut, join(ARTIFACTS, 'easycasa_seller_intro.it.vtt'));
copyFileSync(posterOut, join(ARTIFACTS, 'easycasa_seller_intro.poster.webp'));

process.stdout.write(
  run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size', '-of', 'default=noprint_wrappers=1', mp4Out])
    .stdout,
);
