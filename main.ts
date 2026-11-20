// LEONIDA CODEX — the entry program for gta6-trophy-guide-01.
//
// The guide itself is plain static files under app/ (index.html, app.js,
// style.css, data/trophies.json). Open app/index.html in a browser and it
// works with the network off: it loads nothing from outside its own folder,
// and every source it cites is named inside the app.
//
// This program hands the entry in. It copies app/ and screenshots/ from
// beside this file into the output directory and writes dossier.json there
// with buildDossier from the vendored make.fun library — the same library
// the scorer uses, so the dossier it writes is the one the scorer expects.
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail loudly on bad trophy data instead of handing in a half-empty guide:
// the file must parse, hold all 55 official trophies, and give every one
// of them a non-blank guide of its own.
const trophyData = JSON.parse(readFileSync(join(repoRoot, 'app', 'data', 'trophies.json'), 'utf8'));
if (!Array.isArray(trophyData.trophies) || trophyData.trophies.length !== 55) {
  throw new Error(`trophies.json must hold 55 trophies, found ${trophyData.trophies?.length ?? 0}`);
}
if (trophyData.trophies.some((trophy) => !trophy.name || !trophy.guide || !trophy.guide.trim())) {
  throw new Error('every trophy needs a name and a non-blank guide');
}

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The caps are the gate's own (RULES.txt): at most 4 screenshots of 256 KiB,
// at most 993 files and 48 MiB under app/, and 160 KiB of source text in
// the dossier. buildDossier refuses an entry that breaks them.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
