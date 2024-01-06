import * as three from 'three';

import { VRButton } from './vr-button';

const { stringify } = JSON;

export function ScenePlayer() {
  let renderer = new three.WebGLRenderer({ antialias: true });

  renderer.setPixelRatio(window.devicePixelRatio); // TODO: Use player.setPixelRatio()

  let loader = new three.ObjectLoader();
  let camera, scene;
  let vrButton = VRButton.createButton(renderer); // eslint-disable-line no-undef
  let events = {};
  let dom = document.createElement('div');

  dom.appendChild(renderer.domElement);

  this.dom = dom;
  this.width = 500;
  this.height = 500;

  this.load = (json) => {
    let project = json.project;

    (project.vr !== undefined) &&
      (renderer.xr.enabled = project.vr);

    (project.shadows !== undefined) &&
      (renderer.shadowMap.enabled = project.shadows);

    (project.shadowType !== undefined) &&
      (renderer.shadowMap.type = project.shadowType);

    (project.toneMapping !== undefined) &&
      (renderer.toneMapping = project.toneMapping);

    (project.toneMappingExposure !== undefined) &&
      (renderer.toneMappingExposure = project.toneMappingExposure);

    this.setScene(loader.parse(json.scene));
    this.setCamera(loader.parse(json.camera));

    events = {
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

    let scriptWrapParams = 'player,renderer,scene,camera';
    let scriptWrapResultObj = {};

    for(let eventKey in events) {
      scriptWrapParams += ','+eventKey;
      scriptWrapResultObj[eventKey] = eventKey;
    }

    let scriptWrapResult = stringify(scriptWrapResultObj).replace(/\"/g, '');

    for(let uuid in json.scripts) {
      let object = scene.getObjectByProperty('uuid', uuid, true);

      if(object === undefined) {
        console.warn('ScenePlayer: Script without object.', uuid);
        continue;
      }

      let scripts = json.scripts[uuid];

      for(let i = 0; i < scripts.length; i++) {
        let script = scripts[i];

        let functions = (new Function(scriptWrapParams,
            script.source+'\nreturn '+scriptWrapResult+';')
          .bind(object))(this, renderer, scene, camera);

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

  this.setCamera = (value) => {
    camera = value;
    camera.aspect = this.width/this.height;
    camera.updateProjectionMatrix();
  };

  this.setScene = (value) => scene = value;

  this.setPixelRatio = (pixelRatio) => renderer.setPixelRatio(pixelRatio);

  this.setSize = (width, height) => {
    this.width = width;
    this.height = height;

    if(camera) {
      camera.aspect = this.width/this.height;
      camera.updateProjectionMatrix();
    }

    renderer.setSize(width, height);
  };

  function dispatch(array, event) {
    for(let i = 0, l = array.length; i < l; i++) { array[i](event); }
  }

  let time, startTime, prevTime;

  function animate() {
    t = performance.now();

    try { dispatch(events.update, { time: t-startTime, delta: t-prevTime }); }
    catch(e) { console.error((e.message || e), (e.stack || '')); }

    renderer.render(scene, camera);
    prevTime = t;
  }

  this.play = () => {
    renderer.xr.enabled && dom.append(vrButton);
    startTime = prevTime = performance.now();
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointermove', onPointerMove);
    dispatch(events.start, arguments);
    renderer.setAnimationLoop(animate);
  };

  this.stop = () => {
    renderer.xr.enabled && vrButton.remove();
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('pointerdown', onPointerDown);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointermove', onPointerMove);
    dispatch(events.stop, arguments);
    renderer.setAnimationLoop(null);
  };

  this.render = (time) => {
    dispatch(events.update, { time: time * 1000, delta: 0 /* TODO */ });
    renderer.render(scene, camera);
  };

  this.dispose = () => {
    renderer.dispose();
    camera = undefined;
    scene = undefined;
  };

  function onKeyDown(event) { dispatch(events.keydown, event); }
  function onKeyUp(event) { dispatch(events.keyup, event); }
  function onPointerDown(event) { dispatch(events.pointerdown, event); }
  function onPointerUp(event) { dispatch(events.pointerup, event); }
  function onPointerMove(event) { dispatch(events.pointermove, event); }
}

export default ScenePlayer;
