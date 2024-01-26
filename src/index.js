import { each } from '@epok.tech/fn-lists/each';
import { reduce } from '@epok.tech/fn-lists/reduce';
import { map } from '@epok.tech/fn-lists/map';
import { range } from '@epok.tech/fn-lists/range';
import { fit } from '@thi.ng/math/fit';
import { mix } from '@thi.ng/math/mix';
import { clamp01, inOpenRange } from '@thi.ng/math/interval';
import { distSq2 } from '@thi.ng/vectors/distsq';
import { setC2 } from '@thi.ng/vectors/setc';
import throttle from 'lodash/fp/throttle';
import { Vector3, MOUSE, TOUCH } from 'three';

import { CSS2DRenderer, CSS2DObject }
  from 'three/examples/jsm/renderers/CSS2DRenderer';

import { ScenePlayer } from './scene-player';

const { min, max, abs, round, floor, ceil, random, PI: pi } = Math;
const { indexOf } = Array.prototype;
const { parse } = JSON;

const api = self.locus = {};
const cache = {};

const stopEffect = (e) => e.preventDefault();
const stopBubble = (e) => e.stopPropagation();

function stopEvent(e) {
  stopEffect(e);
  stopBubble(e);
}

// Introduction animations.

const $html = document.documentElement;
const rootClass = $html.classList;

setTimeout(() => {
    rootClass.add('info-hint');
    rootClass.remove('wait');
  },
  1e2);

setTimeout(() => rootClass.remove('info-hint'), 7e3);

// Scroll if needed.

const scroll = {
  main: { block: 'start', behaviour: 'smooth', scrollMode: 'if-needed' }
};

const empty = {};

function inView(contain, bounds, view = empty) {
  const { y: bt, right: br, bottom: bb, x: bl } = bounds;
  const { y: vt = 0, right: vr = innerWidth } = view;
  const { bottom: vb = innerHeight, x: vl = 0 } = view;

  return ((contain)? (bt >= vt) && (bb <= vb) && (bl >= vl) && (br <= vr)
    : (bt <= vb) && (bb >= vt) && (bl <= vr) && (br >= vl));
}

const scrollIntoView = ($e, s = scroll.main) =>
  ((s.scrollMode !== 'if-needed')? $e.scrollIntoView(s)
  : ((inView(true, $e.getBoundingClientRect()))? false
  : ($e.scrollIntoView(s) || true)));

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

each(($d) => $d.addEventListener('toggle', () => $d.open && scrollIntoView($d)),
  document.querySelectorAll('details'));

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

const $subscribes = each(($subscribe) => {
    const $submit = $subscribe.querySelector('[type="submit"]');
    const $optional = $subscribe.querySelector('.optional');
    let successWait;

    $subscribe.addEventListener('submit', async (e) => {
      stopEffect(e);
      $submit.disabled = true;

      const body = new FormData($subscribe);
      const r = await fetch($subscribe.action, { method: 'POST', body });
      const valid = ((r.ok)? '' : "Can't send your details, please try again");
      const cs = $subscribe.classList;

      console.log('Subscribed', r);
      $submit.setCustomValidity(valid);
      $submit.disabled = false;
      clearTimeout(successWait);
      cs.remove('success');

      cs.toggle('success', $submit.reportValidity()) &&
        (successWait = setTimeout(() => {
            cs.remove('success');
            $subscribe.reset();
          },
          1e2));
    });

    $subscribe.addEventListener('focusin', () => {
      scrollIntoView($subscribe);
      scrollIntoView($optional);
    });
  },
  document.querySelectorAll('.subscribe'));

// Concept art interactions.
/** @todo [Shrink input to fit value/placeholder](https://stackoverflow.com/a/8100949). */

const $peel = document.querySelector('.peel-art');
const $peelLayers = $peel.querySelectorAll('.peel-art-layer');
const $peelStyle = $peel.querySelector('.peel-art-style');

$peel.classList.add('peel-far', 'peel-intro');
setTimeout(() => $peel.classList.remove('peel-far'), 1e2+1e3);
setTimeout(() => $peel.classList.remove('peel-intro'), 6e3+1e3);

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

// Reward: `Peer into the Flow`.

const $peerView = document.querySelector('.peer-view');
const $peerRandom = $peerView.querySelector('.peer-random');
const $peerCamera = $peerView.querySelector('.peer-camera');
const $peerFlip = $peerView.querySelector('#peer-flip');
const $peerFill = $peerView.querySelector('.peer-fill');
const $peerDemo = $peerView.querySelector('.peer-demo');
const $peerCameraOn = document.querySelector('.peer-camera-on');
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

$peerCameraOn.addEventListener('click', (e) => {
  !$peerCamera.checked && $peerCamera.click();
  stopEvent(e);
});

$peerFlip.addEventListener('change', () =>
  (($peerFlip.checked)? $peerView.prepend($peerFill) : $peerFill.remove()));

/** @see [Infinite scroll example](https://googlechrome.github.io/samples/intersectionobserver/) */
const peerFillIntersector = new IntersectionObserver((all) =>
  ((!all.some((e) => e.isIntersecting))? $peerDemo.remove()
  : $peerFill.append($peerDemo)));

peerFillIntersector.observe($peerFill);

const peerDemoIntersector = new IntersectionObserver((all) =>
    all.some((e) => e.isIntersecting) && ($peerDemo.src = $peerDemo.src),
  { threshold: 0.5 });

peerDemoIntersector.observe($peerDemo);

// Exhibition scene.

const $exhibit = document.querySelector('.exhibit');
const $exhibitCameras = $exhibit.querySelectorAll('[data-exhibit-camera]');
const $exhibitInfoTouch = $exhibit.querySelector('.exhibit-info-touch');
let $exhibitDemo = $exhibit.querySelector('.exhibit-demo');
let exhibitOn = false;
const exhibitCameras = {};
const exhibitCameraPair = [{}, {}];
let exhibitPlayer;
let exhibitCameraDef;
let exhibitCameraTo;
let exhibitInteract = false;
const exhibitEase = 5e-2;
let exhibit2DRenderer;

function exhibitPlay() {
  exhibitPlayer?.play?.();
  $exhibit.classList.add('exhibit-play');
  $exhibit.classList.remove('exhibit-stop');
}

function exhibitStop() {
  exhibitPlayer?.stop?.();
  $exhibit.classList.add('exhibit-stop');
  $exhibit.classList.remove('exhibit-play');
}

function exhibitResize() {
  let w = innerWidth;
  let h = innerHeight;
  const $p = $exhibitDemo.offsetParent;

  $p && ({ width: w, height: h } = $p.getBoundingClientRect());
  exhibit2DRenderer.setSize(w, h);
  exhibitPlayer.setSize(w, h);
}

function exhibitScroll() {
  const wasOn = exhibitOn;

  if(!(exhibitOn = inView(false, $exhibit.getBoundingClientRect()))) {
    return wasOn && exhibitStop();
  }

  !wasOn && exhibitPlay();

  if(!exhibitPlayer) { return; }

  const vy = innerHeight*0.5;
  const [u, d] = exhibitCameraPair;

  u.y = d.y = u.$ = d.$ = undefined;

  const [{ $: u$, y: uy = 0 }, { $: d$, y: dy = 0 }] = reduce((pair, $) => {
      const { y: y0, bottom: y1 } = $.getBoundingClientRect();
      const y = mix(y0, y1, 0.5)-vy;
      const d = y > 0;
      const p = pair[+d];
      const { $: p$, y: py } = p;

      (!p$ || (py == null) || ((d)? y < py : y > py)) && (p.$ = $) && (p.y = y);

      return pair;
    },
    $exhibitCameras, exhibitCameraPair);

  const uc = u$?.dataset?.exhibitCamera;
  const dc = d$?.dataset?.exhibitCamera;
  const up = uc && exhibitCameras[uc]?.position;
  const dp = dc && exhibitCameras[dc]?.position;

  // Assumes cameras are at the root of the scene.
  ((!up)? dp && exhibitCameraTo.copy(dp)
  : (!dp)? up && exhibitCameraTo.copy(up)
  : (up === dp)? exhibitCameraTo.copy(up)
  : exhibitCameraTo.lerpVectors(up, dp, clamp01(fit(0, uy, dy, 0, 1))));
}

function exhibitAnimate() {
  const { camera, scene } = exhibitPlayer;

  if(!exhibitInteract) {
    const p = camera.position;

    ((p.distanceToSquared(exhibitCameraTo) < 2e-3)? p.copy(exhibitCameraTo)
    : p.lerp(exhibitCameraTo, exhibitEase));
  }

  exhibit2DRenderer.render(scene, camera);

  requestAnimationFrame(exhibitAnimate);
}

async function exhibitLoad() {
  const exhibit = await import('../media/exhibit.json');

  exhibitPlayer = api.exhibitPlayer = new ScenePlayer(null, {
    enablePan: false,
    minDistance: 2,
    maxDistance: 7,
    maxPolarAngle: pi*0.55,
    zoomSpeed: 2,
    mouseButtons: { LEFT: MOUSE.ROTATE, MIDDLE: false, RIGHT: MOUSE.DOLLY },
    touches: { ONE: false, TWO: TOUCH.DOLLY_ROTATE }
  });

  exhibitPlayer.load(exhibit);
  exhibitPlayer.render();

  const { dom, scene, orbit, camera } = exhibitPlayer;
  let interactWait;
  let labelWait;

  $exhibitDemo.replaceWith($exhibitDemo = dom);
  $exhibitDemo.classList.add('exhibit-demo');
  exhibit2DRenderer = new CSS2DRenderer({ element: $exhibitDemo });

  function interactStart() {
    clearTimeout(interactWait);
    exhibitInteract = true;
  }

  function interactEnd() {
    clearTimeout(interactWait);
    interactWait = setTimeout(() => exhibitInteract = false, 2e3);
  }

  orbit.addEventListener('start', interactStart);
  orbit.addEventListener('end', interactEnd);
  orbit.update();

  const infoTouch = (e) =>
    $exhibitInfoTouch.classList.toggle('show', e.targetTouches.length !== 2);

  $exhibitDemo.addEventListener('touchstart', infoTouch);
  $exhibitDemo.addEventListener('touchend', infoTouch);

  function labelOpen() {
    interactStart();
    clearTimeout(labelWait);
    orbit.enabled = false;
  }

  function labelShut() {
    interactEnd();
    clearTimeout(labelWait);
    labelWait = setTimeout(() => orbit.enabled = true, 2e3);
  }

  scene.traverse((o) => {
    const { userData: d, position: p } = o;
    const label = d?.label;

    if(!label) { return; }

    const $label = document.createElement('small');
    const to = new CSS2DObject($label);
    const focus = d?.focus;

    $label.textContent = label;
    $label.classList.add('exhibit-label');
    focus && to.position.set(...focus);
    o.add(to);
    $label.addEventListener('pointerenter', labelOpen);
    $label.addEventListener('pointerleave', labelShut);
  });

  exhibitCameraDef = exhibitCameras[camera.name] = camera.clone();

  reduce((to, { dataset: { exhibitCamera: c } }) => {
      to[c] ??= scene.getObjectByName(c);

      return to;
    },
    $exhibitCameras, exhibitCameras);

  exhibitCameraTo = exhibitCameraDef.position.clone();
  scene.getObjectByName('ScreenCircle').getWorldPosition(orbit.target);

  addEventListener('resize', throttle(1e2, exhibitResize));
  exhibitResize();

  exhibitPlayer.play();
  exhibitAnimate();
  exhibitScroll();
}

addEventListener('scroll', throttle(2e2, exhibitScroll));
exhibitScroll();

const exhibitReady = () =>
  (document.readyState === 'interactive') && setTimeout(exhibitLoad, 500);

((exhibitReady() === false) &&
  document.addEventListener('readystatechange', exhibitReady));
