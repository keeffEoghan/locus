import { each } from '@epok.tech/fn-lists/each';
import { reduce } from '@epok.tech/fn-lists/reduce';
import { map } from '@epok.tech/fn-lists/map';
import { range } from '@epok.tech/fn-lists/range';
import { fit } from '@thi.ng/math/fit';
import { mix } from '@thi.ng/math/mix';
import { clamp01, inOpenRange } from '@thi.ng/math/interval';
import { distSq2 } from '@thi.ng/vectors/distsq';
import { setC2 } from '@thi.ng/vectors/setc';
import { shuffle } from '@thi.ng/arrays/shuffle';
import throttle from 'lodash/fp/throttle';
import { Vector3, VideoTexture, MOUSE, TOUCH } from 'three';

import { CSS2DRenderer, CSS2DObject }
  from 'three/examples/jsm/renderers/CSS2DRenderer';

import { ScenePlayer } from './scene-player';

const { min, max, abs, round, floor, ceil, random, PI: pi } = Math;
const { indexOf } = Array.prototype;
const { parse } = JSON;
const { clipboard } = navigator;

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
  rootClass.remove('wait');
  rootClass.add('info-hint');
  },
  3e2);

setTimeout(() => rootClass.remove('info-hint'), 7e3);

// Scroll if needed.

const scroll = { block: 'start', scrollMode: 'if-needed' };
const empty = {};

function inView(contain, bounds, view = empty) {
  const { y: bt, right: br, bottom: bb, x: bl } = bounds;
  const { y: vt = 0, right: vr = innerWidth } = view;
  const { bottom: vb = innerHeight, x: vl = 0 } = view;

  return ((contain)? (bt >= vt) && (bb <= vb) && (bl >= vl) && (br <= vr)
    : (bt <= vb) && (bb >= vt) && (bl <= vr) && (br >= vl));
}

const scrollIntoView = ($e, s = scroll) =>
  $e &&
    ((s.scrollMode !== 'if-needed')? $e.scrollIntoView(s)
    : (inView(true, $e.getBoundingClientRect())? false
    : !$e.scrollIntoView(s)));

// Progressively load images.
// @todo Also handle videos and other types of elements?

const loaded = ($l) => $l.classList.add('loaded');

each(($l) =>
    (($l.complete)? loaded($l) : $l.addEventListener('load', () => loaded($l))),
  document.querySelectorAll('img.load'));

// Figures.

each(($f) => $f.addEventListener('click', () =>
    ((document.fullscreenElement)? document.exitFullscreen()
    : $f.requestFullscreen())),
  document.querySelectorAll('figure'));

each(($f) => $f.addEventListener('click', stopBubble),
  document.querySelectorAll('figcaption'));

// Ensure anchors scroll.

each(($a) => $a.addEventListener('click', () => {
    rootClass.add('jumping');

    setTimeout(() => {
      rootClass.remove('jumping');

      const to = $a.getAttribute('href');

      if(to === '#') { return scrollIntoView(document.body, true); }

      try { scrollIntoView(document.querySelector(to)); }
      catch(e) { console.warn(e); }
    });
  }),
  document.querySelectorAll('a[href^="#"]'));

// Details.

each(($d) => $d.addEventListener('toggle', () => $d.open && scrollIntoView($d)),
  document.querySelectorAll('details'));

// Countdowns to deadlines.

const minute = 60*1e3;
const hour = 60*minute;
const day = 24*hour;
const etaCrypto = new Date('2025-07-25T15:00:00-08:00');
const etaCard = new Date('2025-07-25T15:00:00-08:00');
const $etaCrypto = document.querySelectorAll('.eta-crypto');
const $etaCard = document.querySelectorAll('.eta-card');
const $giveCrypto = document.querySelector('#contribute-crypto');
const $timedOutCrypto = $giveCrypto?.querySelectorAll?.('.times-out');
const $giveCard = document.querySelector('#contribute-card');
const $timedOutCard = $giveCard?.querySelectorAll?.('.times-out');

if($etaCrypto || $etaCard || $giveCrypto || $giveCard) {
  function toTil(t, s) {
    const d = floor(t/day);
    const h = floor((t -= (day*d))/hour);
    const m = floor((t -= (hour*h))/minute);

    return s.replace(/\$d/g, d).replace(/\$h/g, h).replace(/\$m/g, m);
  }

  const fillTil = (t, $all) => each(($e) => {
      const { dataset: { til,  title }, classList } = $e;

      $e.textContent = toTil(t, til);
      title && ($e.title = title) && classList.add('info');
    },
    $all);

  function timeOut(t, $give, $over) {
    const c = $give?.classList;

    c && $over && (c.contains('timed-out') !== c.toggle('timed-out', !t)) &&
      each(($t) => {
          $t.getAttribute('href') &&
            ($t.dataset.href = $t.href) && ($t.href = '#contact');

          $t.target && ($t.target = '');

          $t.title = 'This option timed out! '+
            'Try another or contact us to arrange an alternative';
        },
        $over);
  }

  function tickTime() {
    const now = new Date();
    const tCrypto = max(0, etaCrypto-now);
    const tCard = max(0, etaCard-now);

    fillTil(tCrypto, $etaCrypto);
    fillTil(tCard, $etaCard);
    timeOut(tCrypto, $giveCrypto, $timedOutCrypto);
    timeOut(tCard, $giveCard, $timedOutCard);
  }

  tickTime();
  setInterval(tickTime, minute*0.5);
}

// Subscription.

each(($subscribe) => {
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

each(($peel) => {
    const $peelLayers = $peel?.querySelectorAll?.('.peel-art-layer');
    const $peelStyle = $peel?.querySelector?.('.peel-art-style');

    if($peel && $peelLayers && $peelStyle) {
      const $peelDemoFill = $peel.closest('.demo-fill');
      const peelAt = [range(2, Infinity), []];

      $peel.classList.add('peel-far', 'peel-intro');
      setTimeout(() => $peel.classList.remove('peel-far'), 1e2+1e3);
      setTimeout(() => $peel.classList.remove('peel-intro'), 6e3+1e3);

      function peelOn() {
        $peel.classList.remove('peel-far', 'peel-intro');
        $peel.parentElement.focus();
        $peelStyle.disabled = false;
      }

      function peelOff() {
        $peel.parentElement.blur();
        $peelStyle.disabled = true;
      }

      function peelMove(e) {
        const { clientX: cx, clientY: cy } = e;
        const { y, right: r, bottom: b, x } = $peel.getBoundingClientRect();
        const [at0, at1] = peelAt;
        let [vx, vy] = setC2(at1, fit(cx, r, x, 1, 0), fit(cy, b, y, 0, 1));

        if(distSq2(at0, at1) < 5e-2) { return; }

        setC2(peelAt, at1, at0);
        // $peelStyle.disabled = ((vx < 0) || (vx > 1) || (vy < 0) || (vy > 1));
        vx = clamp01(vx)*($peelLayers.length+1);

        const w = mix(1.1, 3e-2, vy = clamp01(vy));

        $peelStyle.textContent = reduce((to, $l, i) => {
            const n = indexOf.call($peel.children, $l)+1;
            const o = 0.5+((i-vx)*w);
            const fill = $l.classList.contains('peel-art-layer-fill');
            const pl = mix(0, 1e2, 1-fill && o);
            const pr = mix(0, 1e2, +fill || o+w);

            return to+`.peel-art-layer:nth-child(${n}) { `+
                `clip-path: `+
                  `polygon(${pl}% 0%, ${pr}% 0%, ${pr}% 100%, ${pl}% 100%) `+
                    `!important; `+
              `}\n`;
          },
          $peelLayers, '');
      }

      $peel.addEventListener('pointermove', throttle(3e2, peelMove));
      $peel.addEventListener('pointerdown', peelOn);
      $peel.addEventListener('pointerenter', peelOn);
      $peel.addEventListener('pointerout', peelOff);
      $peel.addEventListener('pointerup', peelOff);
      $peel.addEventListener('contextmenu', stopEvent);

      $peelDemoFill &&
        (new MutationObserver((e) =>
            (e[0]?.removedNodes) && ($peelStyle.textContent = '')))
          .observe($peelDemoFill, { childList: true });
    }
  },
  document.querySelectorAll('.peel-art'));

// Crypto and currency conversion.

each(async ($c) => {
    try {
      const { textContent: content, title, dataset: d } = $c;
      const f = d.coinAt || 'eth';
      const t = d.coinTo || 'usd';
      const s = d.coinSum || 0.004;
      const mc = d.coinText || '(\\$)([0-9\\.\\,]+)()';
      const mt = d.coinTitle || `()([0-9\\.\\,]+)(${t})`;
      const p = parseInt(d.coinPlace || 0, 10);
      const u = `https://api.coinconvert.net/convert/${f}/${t}?amount=${s}`;
      let to = (await (await fetch(u)).json())[t.toUpperCase()];

      to = ((p > 0)? to.toFixed(p) : round(to)).toLocaleString();
      $c.textContent = content.replace(new RegExp(mc, 'gi'), `$1${to}$3`);
      $c.title = title.replace(new RegExp(mt, 'gi'), `$1${to}$3`);
    }
    catch(e) { console.warn(e); }
  },
  document.querySelectorAll(`[data-coin-at],[data-coin-to],[data-coin-sum],
    [data-coin-text],[data-coin-title]`));

// Copy jump shares.

each(($a) => ($a.dataset.copy = $a.href) && $a.classList.add('copy'),
  document.querySelectorAll('.jump-share'));

// Copy to clipboard.

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

// Progress and demos.

let demoFillIntersects;
let demoFillIntersector;

each(($view) => {
    const $fill = $view.querySelector('.demo-fill');
    const $live = $view.querySelector('.demo-live');
    const $video = $view.querySelector('.demo-video');
    const $flip = $view.querySelector('.demo-flip');
    const $full = $view.querySelector('.demo-fullscreen');
    const $camera = $view.querySelector('.demo-camera');
    const $cameraOn = $view.parentElement?.querySelector?.('.demo-camera-on');
    const $visit = $view.querySelector('.demo-visit');
    const liveFrame = ($live?.tagName === 'IFRAME');

    $flip && $fill && $flip.addEventListener('change', () => {
      (($flip.checked)? $view.prepend($fill) : $fill.remove());
      liveFrame && ($live.src = $live.src);
      $video.src = $video.src;
    });

    if($live && $fill) {
      (demoFillIntersects ??= new Map())
        .set($fill, { $fill, $live, time: 0, ratio: 0 });

      /** @see [Infinite scroll example](https://googlechrome.github.io/samples/intersectionobserver/) */
      demoFillIntersector ??= new IntersectionObserver((os) => {
          // Update all newer intersections.
          each((o) => {
              const { target: $fill, time, intersectionRatio: ratio } = o;
              const intersect = demoFillIntersects.get($fill);

              (time > intersect.time) &&
                (intersect.time = time) && (intersect.ratio = ratio);
            },
            os);

          // Add the demo with the greatest intersection ratio, remove others.
          let to;

          demoFillIntersects.forEach((at) => {
            const gt = (at.ratio > (to?.ratio || 0));
            const rm = ((gt)? to : at);

            rm && (rm.$fill.innerHTML = '');
            gt && (to = at);
          });

          if(!to) { return; }

          const { $fill, $live } = to;

          ($live.parentElement !== $fill) && $fill.append($live);
        },
        { threshold: map((_, i, a) => i/(a.length-1), range(10), 0) });

      demoFillIntersector.observe($fill);
    }

    liveFrame && $live && $camera?.addEventListener?.('change', () => {
      const { allow, dataset } = $live;
      const to = dataset[(($camera.checked)? 'y' : 'n')];

      if(allow === to) { return; }

      $live.allow = to;
      $live.src = $live.src;
    });

    $camera && $cameraOn?.addEventListener?.('click', (e) => {
      !$camera.checked && $camera.click();
      stopEvent(e);
    });

    $live && $full?.addEventListener?.('click',
      () => $live.requestFullscreen());

    $visit && liveFrame && $live?.addEventListener?.('load',
      () => $visit.href = $live.src);
  },
  document.querySelectorAll('.demo-view'));

// MPM progress demo.

each(($mpmView) => {
    const $mpmDemo = $mpmView.querySelector('.mpm-demo');
    const $mpmQualities = $mpmView.querySelectorAll('.mpm-quality');

    $mpmDemo && each(($mpmQuality) => $mpmQuality.addEventListener('click',
        () => $mpmDemo.src = $mpmQuality.dataset.src),
      $mpmQualities);
  },
  document.querySelectorAll('.mpm-view'));

// `Peer into the Flow`.

// Seeds that look good and are easy to use.
let peerSeeds;
// The current peer seed, so multiple demos aren't the same.
let peerSeedAt = 0;

each(($peerView) => {
    const $peerDemo = $peerView.querySelector('.peer-demo');
    const $peerRandom = $peerView.querySelector('.peer-random');

    if($peerDemo && $peerRandom) {
      peerSeeds ??= [65, 62, 33, 19, 24, 12, 13, 11, 5, 1];

      function peerSeed() {
        !peerSeedAt && shuffle(peerSeeds);

        $peerDemo.src = $peerDemo.src.replace(/(^.*\?)(.*$)/, (s, $1, $2) => {
          const q = new URLSearchParams($2);

          q.set('seed', peerSeeds[peerSeedAt]);

          return $1+q;
        });

        peerSeedAt = (peerSeedAt+1)%peerSeeds.length;
      }

      peerSeed();
      $peerRandom.addEventListener('click', () => peerSeed());
    }
  },
  document.querySelectorAll('.peer-view'));

// Reward: `Artifact`.

each(($artifactView) => {
    const $artifactVideo = $artifactView.querySelector('.artifact-video');
    const $artifactStill = $artifactView.querySelector('.artifact-still');

    if($artifactVideo && $artifactStill) {
      const artifactFlip = () =>
        $artifactVideo.classList.toggle('playing', !$artifactVideo.paused);

      $artifactVideo.addEventListener('play', artifactFlip);
      $artifactVideo.addEventListener('pause', artifactFlip);
      $artifactVideo.addEventListener('click', stopBubble);
      $artifactStill.addEventListener('click', stopBubble);
    }
  },
  document.querySelectorAll('.artifact-view'));

// Exhibition scene.

each(($exhibit) => {
    const $exhibitCameras = $exhibit.querySelectorAll('[data-exhibit-camera]');
    const $exhibitInfoTouch = $exhibit.querySelector('.exhibit-info-touch');
    let $exhibitDemo = $exhibit.querySelector('.exhibit-demo');
    let $exhibitTouring = $exhibit.querySelector('.exhibit-touring');
    let exhibitOn;
    const exhibitCameras = { all: {}, order: [] };
    const exhibitCameraPair = [{}, {}];
    let exhibitPlayer;
    let exhibitCameraDef;
    let exhibitCameraTo;
    let exhibitInteract = false;
    let exhibitTour = -1;
    const exhibitCameraNear = { scroll: 1e-3, tour: 5e-1 };
    const exhibitEase = { scroll: 3e-2, tour: 4e-3 };
    let exhibit2DRenderer;

    function exhibitResize() {
      let w = innerWidth;
      let h = innerHeight;
      const $p = $exhibitDemo.offsetParent;

      $p && ({ width: w, height: h } = $p.getBoundingClientRect());
      exhibit2DRenderer.setSize(w, h);
      exhibitPlayer.setSize(w, h);
    }

    function exhibitPlay() {
      const c = $exhibit.classList;

      c.add('exhibit-play');
      c.remove('exhibit-stop');
      exhibitPlayer?.play?.();
    }

    function exhibitStop() {
      const c = $exhibit.classList;

      c.add('exhibit-stop');
      c.remove('exhibit-play');
      exhibitPlayer?.stop?.();
    }

    function exhibitScroll() {
      const bounds = $exhibit.getBoundingClientRect();
      const changedOn = (exhibitOn !== (exhibitOn = inView(false, bounds)));

      if(!exhibitOn) { return changedOn && exhibitStop(); }
      else { changedOn && exhibitPlay(); }

      if(!exhibitPlayer || exhibitInteract) { return; }

      const vy = innerHeight*0.5;
      const [u, d] = exhibitCameraPair;

      u.y = d.y = u.$ = d.$ = undefined;

      const [{ $: u$, y: uy = 0 }, { $: d$, y: dy = 0 }] = reduce((pair, $) => {
          const { y: y0, bottom: y1 } = $.getBoundingClientRect();
          const y = mix(y0, y1, 0.5)-vy;
          const d = y > 0;
          const p = pair[+d];
          const { $: p$, y: py } = p;

          (!p$ || (py == null) || ((d)? y < py : y > py)) &&
            (p.$ = $) && (p.y = y);

          return pair;
        },
        $exhibitCameras, exhibitCameraPair);

      const uc = u$?.dataset?.exhibitCamera;
      const dc = d$?.dataset?.exhibitCamera;
      const { all } = exhibitCameras;
      const up = uc && all[uc]?.position;
      const dp = dc && all[dc]?.position;

      // Assumes cameras are at the root of the scene.
      ((!up)? dp && exhibitCameraTo.copy(dp)
      : (!dp)? up && exhibitCameraTo.copy(up)
      : (up === dp)? exhibitCameraTo.copy(up)
      : exhibitCameraTo.lerpVectors(up, dp, clamp01(fit(0, uy, dy, 0, 1))));
    }

    function exhibitFrame() {
      if(!exhibitOn) { return requestAnimationFrame(exhibitFrame); }

      const { camera, scene } = exhibitPlayer;
      const p = camera.position;
      const { order } = exhibitCameras;
      const tourTo = order[exhibitTour]?.position;
      const { tour: nearTour, scroll: nearScroll } = exhibitCameraNear;

      tourTo &&
        exhibitCameraTo.copy((p.distanceToSquared(tourTo) < nearTour)?
            order[exhibitTour = (exhibitTour+1)%order.length]?.position
          : tourTo);

      if(!exhibitInteract) {
        ((p.distanceToSquared(exhibitCameraTo) < nearScroll)?
          p.copy(exhibitCameraTo)
        : p.lerp(exhibitCameraTo, exhibitEase[(tourTo)? 'tour' : 'scroll']));
      }

      exhibit2DRenderer.render(scene, camera);

      requestAnimationFrame(exhibitFrame);
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
        },
        null, { pixelRatio: 1 });

      exhibitPlayer.load(exhibit);
      exhibitPlayer.render();

      const $exhibitVideo = $exhibitDemo.querySelector('.exhibit-video');
      const { dom, scene, orbit, camera } = exhibitPlayer;
      let interactWait;
      let labelWait;

      $exhibitDemo.replaceWith($exhibitDemo = dom);
      $exhibitVideo && $exhibitDemo.appendChild($exhibitVideo);
      $exhibitDemo.classList.add('exhibit-demo');
      exhibit2DRenderer = new CSS2DRenderer({ element: $exhibitDemo });

      function interactStart() {
        clearTimeout(interactWait);
        exhibitInteract = true;
      }

      function interactEnd() {
        clearTimeout(interactWait);

        interactWait = setTimeout(() => {
            exhibitInteract = false;
            exhibitScroll();
          },
          3e3);
      }

      orbit.addEventListener('start', interactStart);
      orbit.addEventListener('end', interactEnd);
      orbit.update();

      const infoTouch = ({ targetTouches: t }) =>
        $exhibitInfoTouch.classList.toggle('show', t.length !== 2);

      $exhibitDemo.addEventListener('touchstart', infoTouch);
      $exhibitDemo.addEventListener('touchend', infoTouch);

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
        $label.addEventListener('pointerenter', interactStart);
        $label.addEventListener('pointerleave', interactEnd);
      });

      const { all: camerasAll, order: camerasOrder } = exhibitCameras;

      exhibitCameraDef = camerasAll[camera.name] = camera.clone();

      map(({ dataset: { exhibitCamera: c } }) =>
          camerasAll[c] ??= scene.getObjectByName(c),
        $exhibitCameras, camerasOrder);

      exhibitCameraTo = exhibitCameraDef.position.clone();

      const screenCircle = scene.getObjectByName('ScreenCircle');

      screenCircle.getWorldPosition(orbit.target);

      if($exhibitVideo) {
        const animateScreen = () =>
          screenCircle.material.emissiveMap = new VideoTexture($exhibitVideo);

        (($exhibitVideo.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA)?
            animateScreen()
          : $exhibitVideo.addEventListener('canplaythrough', animateScreen));
      }

      const toExhibitTour = () =>
        exhibitTour = (($exhibitTouring?.checked)? 0 : -1);

      $exhibitTouring?.addEventListener?.('change', toExhibitTour);
      toExhibitTour();

      addEventListener('resize', throttle(3e2, exhibitResize));
      exhibitResize();

      exhibitPlayer.play();
      exhibitFrame();
      exhibitScroll();
    }

    addEventListener('scroll', throttle(3e2, exhibitScroll));
    exhibitScroll();

    const exhibitReady = () =>
      (document.readyState === 'interactive') && setTimeout(exhibitLoad, 1e3);

    ((exhibitReady() === false) &&
      document.addEventListener('readystatechange', exhibitReady));
  },
  document.querySelectorAll('.exhibit'));

addEventListener('keyup', ({ code: k, shiftKey: s }) =>
  s && (k === 'KeyF') && $html.requestFullscreen());

function scrollReady() {
  if(document.readyState !== 'complete') { return false; }

  rootClass.add('smooth-scroll');
  scroll.behaviour = 'smooth';
}

((scrollReady() === false) &&
  document.addEventListener('readystatechange', scrollReady));
