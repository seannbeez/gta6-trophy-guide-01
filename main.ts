// LEONIDA CODEX — the entry program for gta6-trophy-guide-01 (Node 22, standard library only).
// The guide itself is plain static files in app/ (index.html + app.js + style.css + data/trophies.json),
// opened at app/index.html, fully offline: it loads nothing over the network, and every source it
// cites is listed by name in the app. This program hands the entry in: it copies app/ and
// screenshots/ from beside this file into /output and writes /output/dossier.json — the summary the
// judge reads (screenshots, the first load's files and bytes, and the source) — using the vendored
// make.fun library. Leave vendor/makefun-frontend.ts untouched: the scorer requires dossier.json to
// be byte for byte what its own copy writes, and two runs of this program must write identical bytes.
//
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Pre-flight: the trophy data must parse and name all 55 official trophies before anything is
// copied — a broken data file must fail the build loudly instead of shipping a half-empty guide.
const data = JSON.parse(readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf8'));
if (!Array.isArray(data.trophies) || data.trophies.length !== 55) {
  throw new Error(`trophies.json must hold 55 trophies, found ${data.trophies?.length ?? 0}`);
}
if (data.trophies.some((t) => !t.name || !t.guide || !t.guide.trim())) {
  throw new Error('every trophy needs a name and a non-blank guide');
}

// Copy the whole guide and its screenshots into the output directory.
mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): text_max_bytes shapes the bytes; the rest refuse an
// entry the scorer would refuse — more than 4 screenshots or one over 256 KiB; more than 993 files
// and directories in app/ or 48 MiB of app files (app/ counts beside /output's own 1000-entry cap,
// its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
