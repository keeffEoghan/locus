import { each } from '@epok.tech/fn-lists';
import { fit } from '@thi.ng/math/fit';
import { mix } from '@thi.ng/math/mix';
import throttle from 'lodash/fp/throttle';

const { min, max, abs, round, floor, ceil, random } = Math;

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
  e.preventDefault();
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

const $art = document.querySelector('.peel-art');
const $layers = document.querySelectorAll('.peel-art-layer');

const peelMove = throttle(1e2, (e) => {
  const { clientX: cx, clientY: cy } = e;
  const { y: bt, right: br, bottom: bb, x: bl } = $art.getBoundingClientRect();
  const y = fit(cy, bb, bt, 0, 1);
  const x = fit(cx, br, bl, $layers.length+1, 0);
  const w = mix(3e-2, 1.1, y);

  each(($l, i) => {
      const o = 0.5+((i-x)*w);
      const fill = $l.classList.contains('peel-art-layer-fill');
      const pl = mix(0, 1e2, 1-fill && o);
      const pr = mix(0, 1e2, +fill || (o+w));

      $l.style.clipPath = `polygon(
        ${pl}% 0%, ${pr}% 0%, ${pr}% 100%, ${pl}% 100%
      )`;
    },
    $layers);

  e.preventDefault();
});

function peelStop() {
  peelMove.cancel();
  each(($l) => $l.style.clipPath = '', $layers);
}

$art.addEventListener('pointermove', peelMove);
$art.addEventListener('pointerout', peelStop);
$art.addEventListener('contextmenu', (e) => e.preventDefault());

$art.classList.add('peel-far', 'peel-intro');
setTimeout(() => $art.classList.remove('peel-far'), 100+2e3);
setTimeout(() => $art.classList.remove('peel-intro'), 4500+2e3);

// Crypto currency conversion.

(async () => {
  try {
    let c = fetch('https://api.coinconvert.net/convert/eth/usd?amount=0.01');

    c = round((await (await c).json()).USD);

    each(($c) => {
        const { textContent, title } = $c;

        $c.textContent = textContent.replace(/(\$)[0-9\.]+/gi, '$1'+c);
        $c.title = title.replace(/[0-9\.]+( USD)/gi, c+' $1');
      },
      document.querySelectorAll('.crypto-convert'));
  }
  catch(e) { console.warn(e); }
})();

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

// Reward: `Peer into the Flow`.

const $peer = document.querySelector('.peer');
const $peerCamera = $peer.querySelector('.peer-camera');
const $peerRandom = $peer.querySelector('.peer-random');
const $peerDemo = $peer.querySelector('.peer-demo');

$peerCamera.addEventListener('change', () => {
  const { allow, dataset } = $peerDemo;
  const to = dataset[(($peerCamera.checked)? 'y' : 'n')];

  if(allow === to) { return; }

  $peerDemo.allow = to;
  $peerDemo.src = $peerDemo.src;
});

$peerRandom.addEventListener('click', () =>
  $peerDemo.src = $peerDemo.src.replace(/(^.*\?)(.*$)/, (s, $1, $2) => {
    const q = new URLSearchParams($2);

    q.set('seed', ceil(random()*66));

    return $1+q;
  }));
