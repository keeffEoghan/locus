import * as three from 'three';

import { OrbitControls } from './orbit-controls';
import { VRButton } from './vr-button';

const { stringify } = JSON;
const { PI: pi } = Math;

const orbitDef = { enableDamping: true };

function dispatch(array, event) {
  for(let i = 0, l = array.length; i < l; i++) { array[i](event); }
}

export class ScenePlayer {
  #events;

  constructor(dom, orbitProps, target, state) {
    const { pixelRatio = devicePixelRatio ?? 1 } = state;

    this.loader = new three.ObjectLoader();

    this.#events = {
      init: [],
      start: [],
      stop: [],
      keydown: [],
      keyup: [],
      pointerdown: [],
      pointerup: [],
      pointermove: [],
      update: []
    };

    this.onKeyDown = (event) => dispatch(this.#events.keydown, event);
    this.onKeyUp = (event) => dispatch(this.#events.keyup, event);
    this.onPointerDown = (event) => dispatch(this.#events.pointerdown, event);
    this.onPointerUp = (event) => dispatch(this.#events.pointerup, event);
    this.onPointerMove = (event) => dispatch(this.#events.pointermove, event);

    this.renderer = new three.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(pixelRatio); // TODO: Use player.setPixelRatio()
    this.vrButton = VRButton.createButton(this.renderer); // eslint-disable-line no-undef

    (this.dom = dom ?? document.createElement('div'))
      .appendChild(this.renderer.domElement);

    this.scene = undefined;
    this.camera = undefined;
    this.orbit = undefined;
    this.orbitProps = { ...orbitDef, ...orbitProps };
    this.target = target ?? this.renderer.domElement;
    this.width = 500;
    this.height = 500;
  }

  load(data) {
    const { project: p, scene, camera, scripts } = this.data = data;
    const { vr, shadows, shadowType, toneMapping, toneMappingExposure: te } = p;
    const { renderer, loader } = this;
    const events = this.#events;

    (vr !== undefined) && (renderer.xr.enabled = vr);
    (shadows !== undefined) && (renderer.shadowMap.enabled = shadows);
    (shadowType !== undefined) && (renderer.shadowMap.type = shadowType);
    (toneMapping !== undefined) && (renderer.toneMapping = toneMapping);
    (te !== undefined) && (renderer.toneMappingExposure = te);

    this.setScene(loader.parse(scene)).setCamera(loader.parse(camera));

    let scriptWrapParams = 'player,renderer,scene,camera';
    const scriptWrapResultObj = {};

    for(const eventKey in events) {
      scriptWrapParams += ','+eventKey;
      scriptWrapResultObj[eventKey] = eventKey;
    }

    const scriptWrapResult = stringify(scriptWrapResultObj).replace(/\"/g, '');

    for(const uuid in scripts) {
      const object = scene.getObjectByProperty('uuid', uuid, true);

      if(object === undefined) {
        console.warn('ScenePlayer: Script without object.', uuid);
        continue;
      }

      let objectScripts = scripts[uuid];

      for(let i = 0; i < objectScripts.length; i++) {
        let script = objectScripts[i];

        const functions = (new Function(scriptWrapParams,
            script.source+'\nreturn '+scriptWrapResult+';')
          .bind(object))(this, renderer, scene, camera);

        for(const name in functions) {
          if(functions[name] === undefined) continue;

          if(events[name] === undefined) {
            console.warn(`ScenePlayer: Event type not supported (${name})`);
            continue;
          }

          events[name].push(functions[name].bind(object));
        }
      }
    }

    dispatch(events.init, arguments);

    return this;
  }

  setCamera(to) {
    const { width, height, orbit, orbitProps, target } = this;

    this.camera = to;
    to.aspect = width/height;
    to.updateProjectionMatrix();
    orbit && orbit.dispose();
    this.orbit = Object.assign(new OrbitControls(to, target), orbitProps);

    return this;
  }

  setScene(to) {
    this.scene = to;

    return this;
  }

  setPixelRatio(to) {
    this.renderer.setPixelRatio(to);

    return this;
  }

  setSize(width, height, style) {
    const { camera, renderer } = this;

    this.width = width;
    this.height = height;

    if(camera) {
      camera.aspect = width/height;
      camera.updateProjectionMatrix();
    }

    renderer.setSize(width, height, style);

    return this;
  }

  #t;
  #t0;
  #tn;

  animate() {
    const t = this.#t = performance.now();
    const { renderer, scene, camera } = this;
    const event = this.#events.update;

    try { dispatch(event, { time: t-this.#t0, delta: t-this.#tn }); }
    catch(e) { console.error((e.message || e), (e.stack || '')); }

    renderer.render(scene, camera);
    this.#tn = t;
  }

  #frame;

  orbitFrame() {
    const { orbit } = this;

    orbit.enabled && orbit.update();
    this.#frame = requestAnimationFrame(() => this.orbitFrame());
  }

  play(...etc) {
    const { renderer, dom, vrButton, target, onKeyDown, onKeyUp } = this;
    const { onPointerDown, onPointerUp, onPointerMove } = this;

    renderer.xr.enabled && dom.append(vrButton);
    this.#t0 = this.#tn = performance.now();
    target.addEventListener('keydown', onKeyDown);
    target.addEventListener('keyup', onKeyUp);
    target.addEventListener('pointerdown', onPointerDown);
    target.addEventListener('pointerup', onPointerUp);
    target.addEventListener('pointermove', onPointerMove);
    dispatch(this.#events.start, etc);
    this.orbitFrame();
    renderer.setAnimationLoop(() => this.animate());
  }

  stop(...etc) {
    const { renderer, vrButton, target, onKeyDown, onKeyUp } = this;
    const { onPointerDown, onPointerUp, onPointerMove } = this;

    renderer.xr.enabled && vrButton.remove();
    target.removeEventListener('keydown', onKeyDown);
    target.removeEventListener('keyup', onKeyUp);
    target.removeEventListener('pointerdown', onPointerDown);
    target.removeEventListener('pointerup', onPointerUp);
    target.removeEventListener('pointermove', onPointerMove);
    dispatch(this.#events.stop, etc);
    renderer.setAnimationLoop(null);
    cancelAnimationFrame(this.#frame);
  };

  render(time = performance.now()) {
    const { renderer, scene, camera } = this;

    dispatch(this.#events.update, { time: time*1e3, delta: 0 /* TODO */ });
    renderer.render(scene, camera);
  };

  dispose() {
    const { renderer, orbit } = this;

    renderer.dispose();
    orbit.dispose();

    this.scene = this.camera = this.renderer = this.orbit = this.#events =
      undefined;
  }
}

export default ScenePlayer;
