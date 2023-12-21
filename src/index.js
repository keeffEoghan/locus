import { each } from '@epok.tech/fn-lists';
import { fit } from '@thi.ng/math/fit';
import { mix } from '@thi.ng/math/mix';
import throttle from 'lodash/fp/throttle';

const { min, max, abs } = Math;

const $art = document.querySelector('.intro-concept-art');
const $layers = document.querySelectorAll('.intro-concept-art-layer');

const move = throttle(1e2, (e) => {
  const { clientX: cx, clientY: cy } = e;
  const { y: bt, right: br, bottom: bb, x: bl } = $art.getBoundingClientRect();
  const y = fit(cy, bb, bt, 0, 1);
  const x = fit(cx, br, bl, 0, $layers.length+1);
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
