import * as three from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import { VRButton } from './vr-button';

const { stringify } = JSON;
const { PI: pi } = Math;

const orbitOptions = {
  enableDamping: true,
  enablePan: false,
  enableZoom: false,
  minDistance: 2,
  maxDistance: 7,
  maxPolarAngle: pi*0.58
};

export function ScenePlayer(dom = document.createElement('div'), target) {
  const loader = new three.ObjectLoader();

  const events = {
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

  this.renderer = new three.WebGLRenderer({ antialias: true });
  this.renderer.setPixelRatio(devicePixelRatio); // TODO: Use player.setPixelRatio()
  this.vrButton = VRButton.createButton(this.renderer); // eslint-disable-line no-undef
  dom.appendChild(this.renderer.domElement);

  this.scene = undefined;
  this.camera = undefined;
  this.orbit = undefined;
  this.dom = dom;
  this.target = target ??= this.renderer.domElement;
  this.width = 500;
  this.height = 500;

  this.load = (json) => {
    let project = json.project;

    (project.vr !== undefined) &&
      (this.renderer.xr.enabled = project.vr);

    (project.shadows !== undefined) &&
      (this.renderer.shadowMap.enabled = project.shadows);

    (project.shadowType !== undefined) &&
      (this.renderer.shadowMap.type = project.shadowType);

    (project.toneMapping !== undefined) &&
      (this.renderer.toneMapping = project.toneMapping);

    (project.toneMappingExposure !== undefined) &&
      (this.renderer.toneMappingExposure = project.toneMappingExposure);

    this.setScene(loader.parse(json.scene));
    this.setCamera(loader.parse(json.camera).clone());

    let scriptWrapParams = 'player,renderer,scene,camera';
    let scriptWrapResultObj = {};

    for(let eventKey in events) {
      scriptWrapParams += ','+eventKey;
      scriptWrapResultObj[eventKey] = eventKey;
    }

    let scriptWrapResult = stringify(scriptWrapResultObj).replace(/\"/g, '');

    for(let uuid in json.scripts) {
      let object = this.scene.getObjectByProperty('uuid', uuid, true);

      if(object === undefined) {
        console.warn('ScenePlayer: Script without object.', uuid);
        continue;
      }

      let scripts = json.scripts[uuid];

      for(let i = 0; i < scripts.length; i++) {
        let script = scripts[i];

        let functions = (new Function(scriptWrapParams,
            script.source+'\nreturn '+scriptWrapResult+';')
          .bind(object))(this, this.renderer, this.scene, this.camera);

        for(let name in functions) {
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
  };

  this.setCamera = (to) => {
    const c = this.camera = to;

    c.aspect = this.width/this.height;
    c.updateProjectionMatrix();
    this.orbit && this.orbit.dispose();
    this.orbit = Object.assign(new OrbitControls(c, this.target), orbitOptions);
  };

  this.setScene = (to) => this.scene = to;

  this.setPixelRatio = (to) => this.renderer.setPixelRatio(to);

  this.setSize = (width, height, style) => {
    this.width = width;
    this.height = height;

    if(this.camera) {
      this.camera.aspect = this.width/this.height;
      this.camera.updateProjectionMatrix();
    }

    this.renderer.setSize(width, height, style);
  };

  function dispatch(array, event) {
    for(let i = 0, l = array.length; i < l; i++) { array[i](event); }
  }

  let t, t0, tn;

  const animate = () => {
    t = performance.now();

    try { dispatch(events.update, { time: t-t0, delta: t-tn }); }
    catch(e) { console.error((e.message || e), (e.stack || '')); }

    this.renderer.render(this.scene, this.camera);
    tn = t;
  };

  let frame;

  this.orbitFrame = () => {
    this.orbit.enabled && this.orbit.update();
    frame = requestAnimationFrame(this.orbitFrame);
  };

  this.play = () => {
    this.renderer.xr.enabled && this.dom.append(this.vrButton);
    t0 = tn = performance.now();
    this.target.addEventListener('keydown', onKeyDown);
    this.target.addEventListener('keyup', onKeyUp);
    this.target.addEventListener('pointerdown', onPointerDown);
    this.target.addEventListener('pointerup', onPointerUp);
    this.target.addEventListener('pointermove', onPointerMove);
    dispatch(events.start, arguments);
    this.orbitFrame();
    this.renderer.setAnimationLoop(animate);
  };

  this.stop = () => {
    this.renderer.xr.enabled && this.vrButton.remove();
    this.target.removeEventListener('keydown', onKeyDown);
    this.target.removeEventListener('keyup', onKeyUp);
    this.target.removeEventListener('pointerdown', onPointerDown);
    this.target.removeEventListener('pointerup', onPointerUp);
    this.target.removeEventListener('pointermove', onPointerMove);
    dispatch(events.stop, arguments);
    this.renderer.setAnimationLoop(null);
    cancelAnimationFrame(frame);
  };

  this.render = (time) => {
    dispatch(events.update, { time: time*1000, delta: 0 /* TODO */ });
    this.renderer.render(this.scene, this.camera);
  };

  this.dispose = () => {
    this.renderer.dispose();
    this.orbit && this.orbit.dispose();
    this.scene = this.camera = this.orbit = undefined;
  };

  function onKeyDown(event) { dispatch(events.keydown, event); }
  function onKeyUp(event) { dispatch(events.keyup, event); }
  function onPointerDown(event) { dispatch(events.pointerdown, event); }
  function onPointerUp(event) { dispatch(events.pointerup, event); }
  function onPointerMove(event) { dispatch(events.pointermove, event); }
}

export default ScenePlayer;
