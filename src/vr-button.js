export class VRButton {
  static createButton(renderer) {
    const button = document.createElement('button');

    function showEnterVR(/*device*/) {
      let currentSession = null;

      async function onSessionStarted(session) {
        session.addEventListener('end', onSessionEnded);
        await renderer.xr.setSession(session);
        button.textContent = 'EXIT VR';
        currentSession = session;
      }

      function onSessionEnded(/*event*/) {
        currentSession.removeEventListener('end', onSessionEnded);
        button.textContent = 'Enter VR';
        currentSession = null;
      }

      button.classList.add('vr-button', 'vr-ui');
      button.textContent = 'Enter VR';

      // `WebXR`'s requestReferenceSpace only works if the corresponding feature
      // was requested at session creation time. For simplicity, just ask for
      // the interesting ones as optional features, but be aware that the
      // requestReferenceSpace call will fail if it turns out to be unavailable.
      // ('local' is always available for immersive sessions and doesn't need to
      // be requested separately.)

      const sessionInit = {
        optionalFeatures:
          ['local-floor', 'bounded-floor', 'hand-tracking', 'layers']
      };

      button.onclick = function() {
        if(currentSession === null) {
          navigator.xr.requestSession('immersive-vr', sessionInit)
            .then(onSessionStarted);
        }
        else {
          currentSession.end();

          if(navigator.xr.offerSession !== undefined) {
            navigator.xr.offerSession('immersive-vr', sessionInit)
              .then(onSessionStarted);
          }
        }
      };

      if(navigator.xr.offerSession !== undefined) {
        navigator.xr.offerSession('immersive-vr', sessionInit)
          .then(onSessionStarted);
      }
    }

    const disableButton = () => button.classList.add('disabled');

    function showWebXRNotFound() {
      disableButton();
      button.textContent = 'VR not supported';
    }

    function showVRNotAllowed(e) {
      disableButton();
      button.textContent = 'VR not allowed';
      console.warn('Exception when trying to call xr.isSessionSupported', e);
    }

    if('xr' in navigator) {
      button.id = 'VRButton';
      button.style.display = 'none';

      navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
          ((supported)? showEnterVR() : showWebXRNotFound());
          supported && VRButton.xrSessionIsGranted && button.click();
        })
        .catch(showVRNotAllowed);

      return button;
    }
    else {
      const message = document.createElement('a');

      if(window.isSecureContext === false) {
        message.href = document.location.href.replace(/^http:/, 'https:');
        message.innerHTML = 'WebXR requires "https://"';
      }
      else {
        message.href = 'https://immersiveweb.dev/';
        message.innerHTML = 'WebXR not available';
      }

      message.classList.add('vr-message', 'vr-ui');
      stylizeElement(message);

      return message;
    }
  }

  static registerSessionGrantedListener() {
    if((typeof navigator !== 'undefined') && ('xr' in navigator)) {
      // WebXRViewer (based on Firefox) has a bug where addEventListener
      // throws a silent exception and aborts execution entirely.
      if(/WebXRViewer\//i.test(navigator.userAgent)) { return; }

      navigator.xr.addEventListener('sessiongranted',
        () => VRButton.xrSessionIsGranted = true);
    }
  }
}

VRButton.xrSessionIsGranted = false;
VRButton.registerSessionGrantedListener();

export default VRButton;
