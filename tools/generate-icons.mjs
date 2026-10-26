// Generates Tidelora's app icon and splash mark from SVG with @resvg/resvg-js.
// Placeholder art in the same spirit as the scene: a reed float settling on a misty dawn marsh.
// Original geometry only. Re-run with `pnpm icons`.
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'assets', 'images');
fs.mkdirSync(OUT, { recursive: true });

const C = {
  deep: '#102E35',
  river: '#385B4F',
  mist: '#DCE4DC',
  ivory: '#F3EBDD',
  wood: '#79634F',
  brass: '#B99B63',
  warn: '#C9755E',
  ink: '#0B1A1D',
};

function render(svg, file, width, background) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width }, background }).render().asPng();
  fs.writeFileSync(path.join(OUT, file), png);
  console.log('wrote', path.join('assets/images', file), `${(png.length / 1024).toFixed(0)} KB`);
}

/** Float and its rings, centred on (0,0) at the waterline. */
function float() {
  const rings = [
    { rx: 330, ry: 62, o: 0.16, w: 5 },
    { rx: 235, ry: 44, o: 0.26, w: 6 },
    { rx: 150, ry: 28, o: 0.42, w: 7 },
  ]
    .map((r) => `<ellipse cx="0" cy="8" rx="${r.rx}" ry="${r.ry}" fill="none" stroke="${C.ivory}" stroke-opacity="${r.o}" stroke-width="${r.w}"/>`)
    .join('');
  return `
    ${rings}
    <ellipse cx="0" cy="10" rx="74" ry="14" fill="${C.ink}" opacity="0.45"/>
    <g>
      <path d="M -26 0 C -26 -60 -16 -96 0 -104 C 16 -96 26 -60 26 0 Z" fill="url(#body)"/>
      <path d="M -16 -88 C -10 -112 -4 -150 0 -168 C 4 -150 10 -112 16 -88 C 8 -94 -8 -94 -16 -88 Z" fill="url(#tip)"/>
      <rect x="-3" y="-222" width="6" height="64" rx="3" fill="${C.ivory}" opacity="0.9"/>
      <path d="M -26 0 C -26 -14 26 -14 26 0 Z" fill="${C.ink}" opacity="0.35"/>
      <path d="M -14 -78 C -14 -50 -12 -24 -10 -6" stroke="#fff" stroke-opacity="0.35" stroke-width="5" fill="none" stroke-linecap="round"/>
    </g>
    <path d="M -24 6 C -24 40 -14 62 0 66 C 14 62 24 40 24 6 Z" fill="${C.warn}" opacity="0.28"/>`;
}

function iconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5E7468"/>
      <stop offset="0.6" stop-color="#C9CBB7"/>
      <stop offset="1" stop-color="#E9DCC2"/>
    </linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#53685C"/>
      <stop offset="0.35" stop-color="${C.river}"/>
      <stop offset="1" stop-color="${C.deep}"/>
    </linearGradient>
    <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#FFF4DA"/>
      <stop offset="0.35" stop-color="#F3DDB0" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#E9DCC2" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="glint" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F6E4BE" stop-opacity="0.75"/>
      <stop offset="1" stop-color="#F6E4BE" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#E7D9BF"/>
      <stop offset="0.45" stop-color="${C.ivory}"/>
      <stop offset="1" stop-color="#B8A88C"/>
    </linearGradient>
    <linearGradient id="tip" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#B05F49"/>
      <stop offset="0.45" stop-color="#D98A6E"/>
      <stop offset="1" stop-color="#9C5340"/>
    </linearGradient>
    <filter id="haze" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
    <filter id="soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
  </defs>
  <rect width="1024" height="1024" fill="url(#sky)"/>
  <circle cx="330" cy="430" r="230" fill="url(#sun)"/>
  <!-- far treeline, softened by mist -->
  <path d="M0 470 C 60 440 90 452 130 430 C 170 410 200 436 250 424 C 300 412 340 440 400 436 C 470 432 500 404 560 414 C 620 424 650 396 720 404 C 780 410 820 386 880 398 C 940 410 980 392 1024 402 L1024 520 L0 520 Z" fill="#6E8073" opacity="0.55" filter="url(#haze)"/>
  <path d="M0 500 C 80 478 120 492 190 480 C 260 468 300 494 380 488 C 460 482 520 462 600 472 C 680 482 740 458 820 466 C 900 474 960 462 1024 470 L1024 540 L0 540 Z" fill="#4C6357" opacity="0.8" filter="url(#soft)"/>
  <rect y="520" width="1024" height="504" fill="url(#water)"/>
  <!-- sun path on the water -->
  <rect x="270" y="522" width="120" height="420" fill="url(#glint)" opacity="0.5" filter="url(#haze)"/>
  ${[560, 600, 648, 704]
    .map((y, i) => `<rect x="${250 - i * 8}" y="${y}" width="${160 + i * 16}" height="${5 - i}" rx="2" fill="#F6E4BE" opacity="${0.5 - i * 0.1}"/>`)
    .join('')}
  <rect y="520" width="1024" height="16" fill="${C.mist}" opacity="0.35" filter="url(#soft)"/>
  <!-- lotus pads -->
  <g opacity="0.92">
    <path d="M 690 800 m -150 0 a 150 34 0 1 0 300 0 a 150 34 0 1 0 -300 0 Z M 690 800 L 830 790 L 836 800 Z" fill="#2C4A3F"/>
    <ellipse cx="690" cy="796" rx="150" ry="30" fill="#3F6250"/>
    <path d="M 690 796 L 836 786" stroke="#2C4A3F" stroke-width="10"/>
    <ellipse cx="160" cy="900" rx="210" ry="44" fill="#2A463C"/>
    <ellipse cx="160" cy="894" rx="210" ry="40" fill="#375845"/>
  </g>
  <g transform="translate(560 690) scale(1.25)">${float()}</g>
</svg>`;
}

function splashSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="-200 -260 400 400">
  <defs>
    <linearGradient id="body" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#E7D9BF"/><stop offset="0.45" stop-color="${C.ivory}"/><stop offset="1" stop-color="#B8A88C"/>
    </linearGradient>
    <linearGradient id="tip" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#B05F49"/><stop offset="0.45" stop-color="#D98A6E"/><stop offset="1" stop-color="#9C5340"/>
    </linearGradient>
  </defs>
  <g transform="scale(0.55)">${float()}</g>
</svg>`;
}

render(iconSvg(), 'icon.png', 1024, C.deep);
render(splashSvg(), 'splash-icon.png', 400, 'rgba(0,0,0,0)');
