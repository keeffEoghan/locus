import { each } from '@epok.tech/fn-lists';
import { fit } from '@thi.ng/math/fit';
import { mix } from '@thi.ng/math/mix';
import { setC2 } from '@thi.ng/vectors/setc';
import { range } from '@epok.tech/fn-lists/range';

const { min, max, abs } = Math;
const eps = 1e-5;
const $art = document.querySelector('.intro-concept-art');
const $layers = document.querySelectorAll('.intro-concept-art-layer');
const at = range(2, Infinity);

$art.addEventListener('pointermove', ({ clientX: cx, clientY: cy }) => {
  const [x0, y0] = at;
  const { y: bt, right: br, bottom: bb, x: bl } = $art.getBoundingClientRect();
  const y = fit(cy, bb, bt, 0, 1);
  const x = fit(cx, br, bl, 0, $layers.length+1);

  if((abs(x-x0) < eps) && (abs(y-y0) < eps)) { return; }
  else { setC2(at, x, y); }

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

$art.addEventListener('pointerout', () => {
    each(($l) => $l.style.clipPath = '', $layers);
    range(at, Infinity);
});
