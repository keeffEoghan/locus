import { each } from '@epok.tech/fn-lists/each';
import { reduce } from '@epok.tech/fn-lists/reduce';
import { range } from '@epok.tech/fn-lists/range';
import { fit } from '@thi.ng/math/fit';
import { clamp01 } from '@thi.ng/math/interval';
import { distSq2 } from '@thi.ng/vectors/distsq';
import { setC2 } from '@thi.ng/vectors/setc';
import { mix } from '@thi.ng/math/mix';
import throttle from 'lodash/fp/throttle';

const { min, max, abs, round, floor, ceil, random } = Math;
const { indexOf } = Array.prototype;

const cache = {};

const stopEffect = (e) => e.preventDefault();
const stopBubble = (e) => e.stopPropagation();

function stopEvent(e) {
  stopEffect(e);
  stopBubble(e);
}

// Progressively load images.

const loaded = ($l) => $l.classList.add('loaded');

each(($l) =>
    (($l.complete)? loaded($l) : $l.addEventListener('load', () => loaded($l))),
  document.querySelectorAll('.load'));

// Figures.

each(($f) => $f.addEventListener('click', () =>
    ((document.fullscreenElement)? document.exitFullscreen()
    : $f.requestFullscreen())),
  document.querySelectorAll('figure'));

each(($f) => $f.addEventListener('click', stopBubble),
  document.querySelectorAll('figcaption'));

// Details.

// const scroll = { behaviour: 'smooth' };

// each(($d) => $d.addEventListener('toggle', () =>
//     $d.open && $d.scrollIntoView(true, scroll)),
//   document.querySelectorAll('details'));

// Countdowns to deadlines.

const minute = 60*1e3;
const hour = 60*minute;
const day = 24*hour;
const etaCrypto = new Date('2024-01-29T09:00:00-08:00');
const etaCard = new Date('2024-01-27T09:00:00-08:00');

function toTil(t, s) {
  const d = floor(t/day);
  const h = floor((t -= (day*d))/hour);
  const m = floor((t -= (hour*h))/minute);

  return s.replace(/\$d/g, d).replace(/\$h/g, h).replace(/\$m/g, m);
}

function tickTime() {
  const now = new Date();

  const fillTil = (t, match) => each(($e) => {
      const { dataset: { til, title }, classList } = $e;

      $e.textContent = toTil(t, til);
      title && ($e.title = title) && classList.add('info');
    },
    document.querySelectorAll(match));

  fillTil(etaCrypto-now, '.eta-crypto');
  fillTil(etaCard-now, '.eta-card');
}

tickTime();
setInterval(tickTime, minute*0.5);

// Subscription.

const $subscribe = document.querySelector('#subscribe');
const $submit = $subscribe.querySelector('[type="submit"]');

$subscribe.addEventListener('submit', async (e) => {
  stopEffect(e);
  $submit.disabled = true;

  const body = new FormData($subscribe);
  const r = await fetch($subscribe.action, { method: 'POST', body });
  const valid = ((r.ok)? '' : "Couldn't send your details, please try again");
  const cs = $subscribe.classList;

  $submit.setCustomValidity(valid);
  $submit.disabled = false;

  cs.toggle('success', $submit.reportValidity()) &&
    setTimeout(() => {
      cs.remove('success');
      $subscribe.reset();
    });
});

// Concept art interactions.
/** @todo [Shrink input to fit value/placeholder](https://stackoverflow.com/a/8100949). */

const $peel = document.querySelector('.peel-art');
const $peelLayers = $peel.querySelectorAll('.peel-art-layer');
const $peelStyle = $peel.querySelector('.peel-art-style');

$peel.classList.add('peel-far', 'peel-intro');
setTimeout(() => $peel.classList.remove('peel-far'), 100+2e3);
setTimeout(() => $peel.classList.remove('peel-intro'), 4500+2e3);

function peelOn(e) {
  $peel.classList.remove('peel-far', 'peel-intro');
  $peel.parentElement.focus();
  $peelStyle.disabled = false;
}

function peelOff(e) {
  $peel.parentElement.blur();
  $peelStyle.disabled = true;
}

function peelMove(e) {
  const { clientX: cx, clientY: cy } = e;
  const { y: bt, right: br, bottom: bb, x: bl } = $peel.getBoundingClientRect();
  const [v0, v1] = (cache.peelMove ?? [range(2, Infinity), []]);
  const [x1, y1] = setC2(v1, fit(cx, br, bl, 1, 0), fit(cy, bb, bt, 0, 1));

  if(distSq2(v0, v1) < 5e-2) { return; }

  const x = clamp01(x1)*($peelLayers.length+1);
  const y = clamp01(y1);
  const w = mix(3e-2, 1.1, y);
  const d = $peelStyle.disabled;

  $peelStyle.textContent = reduce((to, $l, i) => {
      const n = indexOf.call($peel.children, $l)+1;
      const o = 0.5+((i-x)*w);
      const fill = $l.classList.contains('peel-art-layer-fill');
      const pl = mix(0, 1e2, 1-fill && o);
      const pr = mix(0, 1e2, +fill || (o+w));
      const p = `polygon(${pl}% 0%, ${pr}% 0%, ${pr}% 100%, ${pl}% 100%)`;

      return to+
        `.peel-art-layer:nth-child(${n}) { clip-path: ${p} !important; }\n`;
    },
    $peelLayers, '');

  // $peelStyle.disabled = ((x1 < 0) || (x1 > 1) || (y1 < 0) || (y1 > 1));
  $peelStyle.disabled = d;
  setC2(cache.peelMove, v1, v0);
}

$peel.addEventListener('pointermove', throttle(1e2, peelMove));
$peel.addEventListener('pointerdown', peelOn);
$peel.addEventListener('pointerenter', peelOn);
$peel.addEventListener('pointerout', peelOff);
$peel.addEventListener('pointerup', peelOff);
$peel.addEventListener('contextmenu', stopEvent);

// Crypto and currency conversion.

each(async ($c) => {
    try {
      const { textContent: content, title, dataset: d } = $c;
      const f = d.coinAt || 'eth';
      const t = d.coinTo || 'usd';
      const s = d.coinSum || 0.01;
      const mc = d.coinText || '(\\$)([0-9\\.]+)()';
      const mt = d.coinTitle || `()([0-9\\.]+)(${t})`;
      const p = parseInt(d.coinPlace || 0, 10);
      const u = `https://api.coinconvert.net/convert/${f}/${t}?amount=${s}`;
      let to = (await (await fetch(u)).json())[t.toUpperCase()];

      to = ((p > 0)? to.toFixed(p) : round(to));
      $c.textContent = content.replace(new RegExp(mc, 'gi'), `$1${to}$3`);
      $c.title = title.replace(new RegExp(mt, 'gi'), `$1${to}$3`);
    }
    catch(e) { console.warn(e); }
  },
  document.querySelectorAll(`[data-coin-at],[data-coin-to],[data-coin-sum],
    [data-coin-text],[data-coin-title]`));
// Copy to clipboard.

const { clipboard } = navigator;

each(($c) => $c.addEventListener('click', async () => {
    const { textContent, dataset, classList } = $c;

    try {
      await clipboard.writeText(dataset.copy ?? textContent);
      classList.add('copied');
      setTimeout(() => classList.remove('copied'), 1500);
    }
    catch(e) { console.warn("Can't copy to clipboard", $c, e); }
  }),
  document.querySelectorAll('.copy'));

// Reward: `Artifact`.

const $artifactView = document.querySelector('.artifact-view');
const $artifactVideo = $artifactView.querySelector('.artifact-video');
const $artifactStill = $artifactView.querySelector('.artifact-still');

const artifactFlip = () =>
  $artifactVideo.classList.toggle('playing', !$artifactVideo.paused);

$artifactVideo.addEventListener('play', artifactFlip);
$artifactVideo.addEventListener('pause', artifactFlip);
$artifactVideo.addEventListener('click', stopBubble);
$artifactStill.addEventListener('click', stopBubble);
$artifactVideo.addEventListener('contextmenu', stopEvent);
$artifactStill.addEventListener('contextmenu', stopEvent);

// Reward: `Peer into the Flow`.

const $peer = document.querySelector('.peer');
const $peerCamera = $peer.querySelector('.peer-camera');
const $peerRandom = $peer.querySelector('.peer-random');
const $peerDemo = $peer.querySelector('.peer-demo');
// Seeds that look good and are easy to use.
const peerSeeds = [65, 62, 33, 19, 24, 12, 13, 11, 5, 1];

const peerSeed = (to = ceil(random()*66)) =>
  $peerDemo.src = $peerDemo.src.replace(/(^.*\?)(.*$)/, (s, $1, $2) => {
    const q = new URLSearchParams($2);

    q.set('seed', to);

    return $1+q;
  });

peerSeed(peerSeeds[floor(random()*peerSeeds.length)]);
$peerRandom.addEventListener('click', () => peerSeed());

$peerCamera.addEventListener('change', () => {
  const { allow, dataset } = $peerDemo;
  const to = dataset[(($peerCamera.checked)? 'y' : 'n')];

  if(allow === to) { return; }

  $peerDemo.allow = to;
  $peerDemo.src = $peerDemo.src;
});
