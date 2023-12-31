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

const now = new Date();
const minute = 60*1e3;
const hour = 60*minute;
const day = 24*hour;

function toTil(t, d, h, m) {
  t -= now;
  d ??= floor(t/day);
  h ??= floor((t -= (day*d))/hour);
  m ??= floor((t -= (hour*h))/minute);

  return `${d && `${d}d`}${h && `:${h}h`}${m && `:${m}m`}`;
}

const etaCrypto = new Date('2024-01-29T09:00:00-08:00');
const etaCard = new Date('2024-01-27T09:00:00-08:00');

const fillTil = (til, match) => each(($e) => {
    const { til: tilTo, title } = $e.dataset;

    $e.textContent = tilTo.replace('$', til);
    title && ($e.title = title) && $e.classList.add('info');
  },
  document.querySelectorAll(match));

fillTil(toTil(etaCrypto), '.eta-crypto');
fillTil(toTil(etaCard), '.eta-card');
fillTil(toTil(etaCrypto, null, '', ''), '.eta-crypto-s');
fillTil(toTil(etaCard, null, '', ''), '.eta-card-s');

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

const $art = document.querySelector('.intro-concept-art');
const $layers = document.querySelectorAll('.intro-concept-art-layer');

const move = throttle(1e2, (e) => {
  const { clientX: cx, clientY: cy } = e;
  const { y: bt, right: br, bottom: bb, x: bl } = $art.getBoundingClientRect();
  const y = fit(cy, bb, bt, 0, 1);
  const x = fit(cx, br, bl, $layers.length+1, 0);
  const w = mix(3e-2, 1.1, y);

  each(($l, i) => {
      const o = 0.5+((i-x)*w);
      const fill = $l.classList.contains('intro-concept-art-layer-fill');
      const pl = mix(0, 1e2, 1-fill && o);
      const pr = mix(0, 1e2, +fill || (o+w));

      $l.style.clipPath = `polygon(
        ${pl}% 0%, ${pr}% 0%, ${pr}% 100%, ${pl}% 100%
      )`;
    },
    $layers);
});

$art.addEventListener('pointermove', move);

$art.addEventListener('pointerout', () => {
  move.cancel();
  each(($l) => $l.style.clipPath = '', $layers);
});

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
