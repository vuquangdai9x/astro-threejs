/******/ (function(modules) { // webpackBootstrap
/******/  // The module cache
/******/  var installedModules = {};

/******/  // The require function
/******/  function __webpack_require__(moduleId) {

/******/    // Check if module is in cache
/******/    if(installedModules[moduleId])
/******/      return installedModules[moduleId].exports;

/******/    // Create a new module (and put it into the cache)
/******/    var module = installedModules[moduleId] = {
/******/      exports: {},
/******/      id: moduleId,
/******/      loaded: false
/******/    };

/******/    // Execute the module function
/******/    modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/    // Flag the module as loaded
/******/    module.loaded = true;

/******/    // Return the exports of the module
/******/    return module.exports;
/******/  }


/******/  // expose the modules object (__webpack_modules__)
/******/  __webpack_require__.m = modules;

/******/  // expose the module cache
/******/  __webpack_require__.c = installedModules;

/******/  // __webpack_public_path__
/******/  __webpack_require__.p = "";

/******/  // Load entry module and return exports
/******/  return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([

/* 0 */
/***/ function(module, exports, __webpack_require__) {

  
  // Browser distrubution of the A-Frame component.
  (function (AFRAME) {
    if (!AFRAME) {
      console.error('Component attempted to register before AFRAME was available.');
      return;
    }

    (AFRAME.aframeCore || AFRAME).registerComponent('look-controls-with-magnifier', __webpack_require__(1));

  }(window.AFRAME));


/***/ },

/* 1 */
/***/ function(module, exports, __webpack_require__) {

  __webpack_require__(2);

  var PI_2 = Math.PI / 2;

  module.exports = {
    dependencies: ['position', 'rotation'],

    schema: {
      enabled: {default: true},
      magicWindowTrackingEnabled: {default: true},
      pointerLockEnabled: {default: false},
      reverseMouseDrag: {default: false},
      reverseTouchDrag: {default: false},
      touchEnabled: {default: true},
      mobileSlideSpeed: {type: "number", default: 1},
      mobileRotateSpeed: {type: "number", default: 1}
    },

    init: function () {
      this.deltaYaw = 0;
      this.previousHMDPosition = new THREE.Vector3();
      this.hmdQuaternion = new THREE.Quaternion();
      this.magicWindowAbsoluteEuler = new THREE.Euler();
      this.magicWindowDeltaEuler = new THREE.Euler();
      this.position = new THREE.Vector3();
      this.magicWindowObject = new THREE.Object3D();
      this.rotation = {};
      this.deltaRotation = {};
      this.savedPose = null;
      this.pointerLocked = false;
      this.setupMouseControls();
      this.bindMethods();
      this.previousMouseEvent = {};

      this.setupMagicWindowControls();

      // To save / restore camera pose
      this.savedPose = {
        position: new THREE.Vector3(),
        rotation: new THREE.Euler()
      };

      // Call enter VR handler if the scene has entered VR before the event listeners attached.
      if (this.el.sceneEl.is('vr-mode')) { this.onEnterVR(); }
    },

    setupMagicWindowControls: function () {
      var magicWindowControls;
      var data = this.data;

      // Only on mobile devices and only enabled if DeviceOrientation permission has been granted.
      if (utils.device.isMobile()) {
        magicWindowControls = this.magicWindowControls = new THREE.DeviceOrientationControls(this.magicWindowObject);
        if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
          magicWindowControls.enabled = false;
          if (this.el.sceneEl.components['device-orientation-permission-ui'].permissionGranted) {
            magicWindowControls.enabled = data.magicWindowTrackingEnabled;
          } else {
            this.el.sceneEl.addEventListener('deviceorientationpermissiongranted', function () {
              magicWindowControls.enabled = data.magicWindowTrackingEnabled;
            });
          }
        }
      }
    },

    update: function (oldData) {
      var data = this.data;

      // Disable grab cursor classes if no longer enabled.
      if (data.enabled !== oldData.enabled) {
        this.updateGrabCursor(data.enabled);
      }

      // Reset magic window eulers if tracking is disabled.
      if (oldData && !data.magicWindowTrackingEnabled && oldData.magicWindowTrackingEnabled) {
        this.magicWindowAbsoluteEuler.set(0, 0, 0);
        this.magicWindowDeltaEuler.set(0, 0, 0);
      }

      // Pass on magic window tracking setting to magicWindowControls.
      if (this.magicWindowControls) {
        this.magicWindowControls.enabled = data.magicWindowTrackingEnabled;
      }

      if (oldData && !data.pointerLockEnabled !== oldData.pointerLockEnabled) {
        this.removeEventListeners();
        this.addEventListeners();
        if (this.pointerLocked) { this.exitPointerLock(); }
      }
    },

    tick: function (t) {
      var data = this.data;
      if (!data.enabled) { return; }
      this.updateOrientation();
    },

    play: function () {
      this.addEventListeners();
    },

    pause: function () {
      this.removeEventListeners();
      if (this.pointerLocked) { this.exitPointerLock(); }
    },

    remove: function () {
      this.removeEventListeners();
      if (this.pointerLocked) { this.exitPointerLock(); }
    },

    bindMethods: function () {
      this.onMouseDown = bind(this.onMouseDown, this);
      this.onMouseMove = bind(this.onMouseMove, this);
      this.onMouseUp = bind(this.onMouseUp, this);
      this.onTouchStart = bind(this.onTouchStart, this);
      this.onTouchMove = bind(this.onTouchMove, this);
      this.onTouchEnd = bind(this.onTouchEnd, this);
      this.onEnterVR = bind(this.onEnterVR, this);
      this.onExitVR = bind(this.onExitVR, this);
      this.onPointerLockChange = bind(this.onPointerLockChange, this);
      this.onPointerLockError = bind(this.onPointerLockError, this);
    },

   /**
    * Set up states and Object3Ds needed to store rotation data.
    */
    setupMouseControls: function () {
      this.mouseDown = false;
      this.pitchObject = new THREE.Object3D();
      this.yawObject = new THREE.Object3D();
      this.yawObject.position.y = 10;
      this.yawObject.add(this.pitchObject);
    },

    /**
     * Add mouse and touch event listeners to canvas.
     */
    addEventListeners: function () {
      var sceneEl = this.el.sceneEl;
      var canvasEl = sceneEl.canvas;

      // Wait for canvas to load.
      if (!canvasEl) {
        sceneEl.addEventListener('render-target-loaded', bind(this.addEventListeners, this));
        return;
      }

      // Mouse events.
      canvasEl.addEventListener('mousedown', this.onMouseDown, false);
      window.addEventListener('mousemove', this.onMouseMove, false);
      window.addEventListener('mouseup', this.onMouseUp, false);

      // Touch events.
      canvasEl.addEventListener('touchstart', this.onTouchStart);
      window.addEventListener('touchmove', this.onTouchMove);
      window.addEventListener('touchend', this.onTouchEnd);

      // sceneEl events.
      sceneEl.addEventListener('enter-vr', this.onEnterVR);
      sceneEl.addEventListener('exit-vr', this.onExitVR);

      // Pointer Lock events.
      if (this.data.pointerLockEnabled) {
        document.addEventListener('pointerlockchange', this.onPointerLockChange, false);
        document.addEventListener('mozpointerlockchange', this.onPointerLockChange, false);
        document.addEventListener('pointerlockerror', this.onPointerLockError, false);
      }
    },

    /**
     * Remove mouse and touch event listeners from canvas.
     */
    removeEventListeners: function () {
      var sceneEl = this.el.sceneEl;
      var canvasEl = sceneEl && sceneEl.canvas;

      if (!canvasEl) { return; }

      // Mouse events.
      canvasEl.removeEventListener('mousedown', this.onMouseDown);
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('mouseup', this.onMouseUp);

      // Touch events.
      canvasEl.removeEventListener('touchstart', this.onTouchStart);
      window.removeEventListener('touchmove', this.onTouchMove);
      window.removeEventListener('touchend', this.onTouchEnd);

      // sceneEl events.
      sceneEl.removeEventListener('enter-vr', this.onEnterVR);
      sceneEl.removeEventListener('exit-vr', this.onExitVR);

      // Pointer Lock events.
      document.removeEventListener('pointerlockchange', this.onPointerLockChange, false);
      document.removeEventListener('mozpointerlockchange', this.onPointerLockChange, false);
      document.removeEventListener('pointerlockerror', this.onPointerLockError, false);
    },

    /**
     * Update orientation for mobile, mouse drag, and headset.
     * Mouse-drag only enabled if HMD is not active.
     */
    updateOrientation: (function () {
      var poseMatrix = new THREE.Matrix4();

      return function () {
        var object3D = this.el.object3D;
        var pitchObject = this.pitchObject;
        var yawObject = this.yawObject;
        var pose;
        var sceneEl = this.el.sceneEl;

        // In VR mode, THREE is in charge of updating the camera pose.
        if (sceneEl.is('vr-mode') && sceneEl.checkHeadsetConnected()) {
          // With WebXR THREE applies headset pose to the object3D matrixWorld internally.
          // Reflect values back on position, rotation, scale for getAttribute to return the expected values.
          if (sceneEl.hasWebXR) {
            pose = sceneEl.renderer.xr.getCameraPose();
            if (pose) {
              poseMatrix.elements = pose.transform.matrix;
              poseMatrix.decompose(object3D.position, object3D.rotation, object3D.scale);
            }
          }
          return;
        }

        this.updateMagicWindowOrientation();

        // On mobile, do camera rotation with touch events and sensors.
        object3D.rotation.x = this.magicWindowDeltaEuler.x * this.data.mobileSlideSpeed+ pitchObject.rotation.x * this.data.mobileRotateSpeed;
        object3D.rotation.y = this.magicWindowDeltaEuler.y * this.data.mobileSlideSpeed + yawObject.rotation.y * this.data.mobileRotateSpeed;
        object3D.rotation.z = this.magicWindowDeltaEuler.z;
      };
    })(),

    updateMagicWindowOrientation: function () {
      var magicWindowAbsoluteEuler = this.magicWindowAbsoluteEuler;
      var magicWindowDeltaEuler = this.magicWindowDeltaEuler;
      // Calculate magic window HMD quaternion.
      if (this.magicWindowControls && this.magicWindowControls.enabled) {
        this.magicWindowControls.update();
        magicWindowAbsoluteEuler.setFromQuaternion(this.magicWindowObject.quaternion, 'YXZ');
        if (!this.previousMagicWindowYaw && magicWindowAbsoluteEuler.y !== 0) {
          this.previousMagicWindowYaw = magicWindowAbsoluteEuler.y;
        }
        if (this.previousMagicWindowYaw) {
          magicWindowDeltaEuler.x = magicWindowAbsoluteEuler.x;
          magicWindowDeltaEuler.y += magicWindowAbsoluteEuler.y - this.previousMagicWindowYaw;
          magicWindowDeltaEuler.z = magicWindowAbsoluteEuler.z;
          this.previousMagicWindowYaw = magicWindowAbsoluteEuler.y;
        }
      }
    },

    /**
     * Translate mouse drag into rotation.
     *
     * Dragging up and down rotates the camera around the X-axis (yaw).
     * Dragging left and right rotates the camera around the Y-axis (pitch).
     */
    onMouseMove: function (evt) {
      var direction;
      var movementX;
      var movementY;
      var pitchObject = this.pitchObject;
      var previousMouseEvent = this.previousMouseEvent;
      var yawObject = this.yawObject;

      // Not dragging or not enabled.
      if (!this.data.enabled || (!this.mouseDown && !this.pointerLocked)) { return; }

      // Calculate delta.
      if (this.pointerLocked) {
        movementX = evt.movementX || evt.mozMovementX || 0;
        movementY = evt.movementY || evt.mozMovementY || 0;
      } else {
        movementX = evt.screenX - previousMouseEvent.screenX;
        movementY = evt.screenY - previousMouseEvent.screenY;
      }
      this.previousMouseEvent.screenX = evt.screenX;
      this.previousMouseEvent.screenY = evt.screenY;

      // Calculate rotation.
      direction = this.data.reverseMouseDrag ? 1 : -1;
      yawObject.rotation.y += movementX * 0.002 * direction;
      pitchObject.rotation.x += movementY * 0.002 * direction;
      pitchObject.rotation.x = Math.max(-PI_2, Math.min(PI_2, pitchObject.rotation.x));
    },

    /**
     * Register mouse down to detect mouse drag.
     */
    onMouseDown: function (evt) {
      var sceneEl = this.el.sceneEl;
      if (!this.data.enabled || (sceneEl.is('vr-mode') && sceneEl.checkHeadsetConnected())) { return; }
      // Handle only primary button.
      if (evt.button !== 0) { return; }

      var canvasEl = sceneEl && sceneEl.canvas;

      this.mouseDown = true;
      this.previousMouseEvent.screenX = evt.screenX;
      this.previousMouseEvent.screenY = evt.screenY;
      this.showGrabbingCursor();

      if (this.data.pointerLockEnabled && !this.pointerLocked) {
        if (canvasEl.requestPointerLock) {
          canvasEl.requestPointerLock();
        } else if (canvasEl.mozRequestPointerLock) {
          canvasEl.mozRequestPointerLock();
        }
      }
    },

    /**
     * Shows grabbing cursor on scene
     */
    showGrabbingCursor: function () {
      this.el.sceneEl.canvas.style.cursor = 'grabbing';
    },

    /**
     * Hides grabbing cursor on scene
     */
    hideGrabbingCursor: function () {
      this.el.sceneEl.canvas.style.cursor = '';
    },

    /**
     * Register mouse up to detect release of mouse drag.
     */
    onMouseUp: function () {
      this.mouseDown = false;
      this.hideGrabbingCursor();
    },

    /**
     * Register touch down to detect touch drag.
     */
    onTouchStart: function (evt) {
      if (evt.touches.length !== 1 ||
          !this.data.touchEnabled ||
          this.el.sceneEl.is('vr-mode')) { return; }
      this.touchStart = {
        x: evt.touches[0].pageX,
        y: evt.touches[0].pageY
      };
      this.touchStarted = true;
    },

    /**
     * Translate touch move to Y-axis rotation.
     */
    onTouchMove: function (evt) {
      var direction;
      var canvas = this.el.sceneEl.canvas;
      var deltaY;
      var yawObject = this.yawObject;

      if (!this.touchStarted || !this.data.touchEnabled) { return; }

      deltaY = 2 * Math.PI * (evt.touches[0].pageX - this.touchStart.x) / canvas.clientWidth;

      direction = this.data.reverseTouchDrag ? 1 : -1;
      // Limit touch orientaion to to yaw (y axis).
      yawObject.rotation.y -= deltaY * 0.5 * direction;
      this.touchStart = {
        x: evt.touches[0].pageX,
        y: evt.touches[0].pageY
      };
    },

    /**
     * Register touch end to detect release of touch drag.
     */
    onTouchEnd: function () {
      this.touchStarted = false;
    },

    /**
     * Save pose.
     */
    onEnterVR: function () {
      var sceneEl = this.el.sceneEl;
      if (!sceneEl.checkHeadsetConnected()) { return; }
      this.saveCameraPose();
      this.el.object3D.position.set(0, 0, 0);
      this.el.object3D.rotation.set(0, 0, 0);
      if (sceneEl.hasWebXR) {
        this.el.object3D.matrixAutoUpdate = false;
        this.el.object3D.updateMatrix();
      }
    },

    /**
     * Restore the pose.
     */
    onExitVR: function () {
      if (!this.el.sceneEl.checkHeadsetConnected()) { return; }
      this.restoreCameraPose();
      this.previousHMDPosition.set(0, 0, 0);
      this.el.object3D.matrixAutoUpdate = true;
    },

    /**
     * Update Pointer Lock state.
     */
    onPointerLockChange: function () {
      this.pointerLocked = !!(document.pointerLockElement || document.mozPointerLockElement);
    },

    /**
     * Recover from Pointer Lock error.
     */
    onPointerLockError: function () {
      this.pointerLocked = false;
    },

    // Exits pointer-locked mode.
    exitPointerLock: function () {
      document.exitPointerLock();
      this.pointerLocked = false;
    },

    /**
     * Toggle the feature of showing/hiding the grab cursor.
     */
    updateGrabCursor: function (enabled) {
      var sceneEl = this.el.sceneEl;

      function enableGrabCursor () { sceneEl.canvas.classList.add('a-grab-cursor'); }
      function disableGrabCursor () { sceneEl.canvas.classList.remove('a-grab-cursor'); }

      if (!sceneEl.canvas) {
        if (enabled) {
          sceneEl.addEventListener('render-target-loaded', enableGrabCursor);
        } else {
          sceneEl.addEventListener('render-target-loaded', disableGrabCursor);
        }
        return;
      }

      if (enabled) {
        enableGrabCursor();
        return;
      }
      disableGrabCursor();
    },

    /**
     * Save camera pose before entering VR to restore later if exiting.
     */
    saveCameraPose: function () {
      var el = this.el;

      this.savedPose.position.copy(el.object3D.position);
      this.savedPose.rotation.copy(el.object3D.rotation);
      this.hasSavedPose = true;
    },

    /**
     * Reset camera pose to before entering VR.
     */
    restoreCameraPose: function () {
      var el = this.el;
      var savedPose = this.savedPose;

      if (!this.hasSavedPose) { return; }

      // Reset camera orientation.
      el.object3D.position.copy(savedPose.position);
      el.object3D.rotation.copy(savedPose.rotation);
      this.hasSavedPose = false;
    }

  };


/***/ },
/* 2 */

// function(module, exports) {

//   /**
//    * Polyfill for the additional KeyboardEvent properties defined in the D3E and
//    * D4E draft specifications, by @inexorabletash.
//    *
//    * See: https://github.com/inexorabletash/polyfill
//    */
//   (function(global) {
//     var nativeKeyboardEvent = ('KeyboardEvent' in global);
//     if (!nativeKeyboardEvent)
//       global.KeyboardEvent = function KeyboardEvent() { throw TypeError('Illegal constructor'); };

//     global.KeyboardEvent.DOM_KEY_LOCATION_STANDARD = 0x00; // Default or unknown location
//     global.KeyboardEvent.DOM_KEY_LOCATION_LEFT          = 0x01; // e.g. Left Alt key
//     global.KeyboardEvent.DOM_KEY_LOCATION_RIGHT         = 0x02; // e.g. Right Alt key
//     global.KeyboardEvent.DOM_KEY_LOCATION_NUMPAD        = 0x03; // e.g. Numpad 0 or +

//     var STANDARD = window.KeyboardEvent.DOM_KEY_LOCATION_STANDARD,
//         LEFT = window.KeyboardEvent.DOM_KEY_LOCATION_LEFT,
//         RIGHT = window.KeyboardEvent.DOM_KEY_LOCATION_RIGHT,
//         NUMPAD = window.KeyboardEvent.DOM_KEY_LOCATION_NUMPAD;

//     //--------------------------------------------------------------------
//     //
//     // Utilities
//     //
//     //--------------------------------------------------------------------

//     function contains(s, ss) { return String(s).indexOf(ss) !== -1; }

//     var os = (function() {
//       if (contains(navigator.platform, 'Win')) { return 'win'; }
//       if (contains(navigator.platform, 'Mac')) { return 'mac'; }
//       if (contains(navigator.platform, 'CrOS')) { return 'cros'; }
//       if (contains(navigator.platform, 'Linux')) { return 'linux'; }
//       if (contains(navigator.userAgent, 'iPad') || contains(navigator.platform, 'iPod') || contains(navigator.platform, 'iPhone')) { return 'ios'; }
//       return '';
//     } ());

//     var browser = (function() {
//       if (contains(navigator.userAgent, 'Chrome/')) { return 'chrome'; }
//       if (contains(navigator.vendor, 'Apple')) { return 'safari'; }
//       if (contains(navigator.userAgent, 'MSIE')) { return 'ie'; }
//       if (contains(navigator.userAgent, 'Gecko/')) { return 'moz'; }
//       if (contains(navigator.userAgent, 'Opera/')) { return 'opera'; }
//       return '';
//     } ());

//     var browser_os = browser + '-' + os;

//     function mergeIf(baseTable, select, table) {
//       if (browser_os === select || browser === select || os === select) {
//         Object.keys(table).forEach(function(keyCode) {
//           baseTable[keyCode] = table[keyCode];
//         });
//       }
//     }

//     function remap(o, key) {
//       var r = {};
//       Object.keys(o).forEach(function(k) {
//         var item = o[k];
//         if (key in item) {
//           r[item[key]] = item;
//         }
//       });
//       return r;
//     }

//     function invert(o) {
//       var r = {};
//       Object.keys(o).forEach(function(k) {
//         r[o[k]] = k;
//       });
//       return r;
//     }

//     //--------------------------------------------------------------------
//     //
//     // Generic Mappings
//     //
//     //--------------------------------------------------------------------

//     // "keyInfo" is a dictionary:
//     //   code: string - name from DOM Level 3 KeyboardEvent code Values
//     //     https://dvcs.w3.org/hg/dom3events/raw-file/tip/html/DOM3Events-code.html
//     //   location (optional): number - one of the DOM_KEY_LOCATION values
//     //   keyCap (optional): string - keyboard label in en-US locale
//     // USB code Usage ID from page 0x07 unless otherwise noted (Informative)

//     // Map of keyCode to keyInfo
//     var keyCodeToInfoTable = {
//       // 0x01 - VK_LBUTTON
//       // 0x02 - VK_RBUTTON
//       0x03: { code: 'Cancel' }, // [USB: 0x9b] char \x0018 ??? (Not in D3E)
//       // 0x04 - VK_MBUTTON
//       // 0x05 - VK_XBUTTON1
//       // 0x06 - VK_XBUTTON2
//       0x06: { code: 'Help' }, // [USB: 0x75] ???
//       // 0x07 - undefined
//       0x08: { code: 'Backspace' }, // [USB: 0x2a] Labelled Delete on Macintosh keyboards.
//       0x09: { code: 'Tab' }, // [USB: 0x2b]
//       // 0x0A-0x0B - reserved
//       0X0C: { code: 'Clear' }, // [USB: 0x9c] NumPad Center (Not in D3E)
//       0X0D: { code: 'Enter' }, // [USB: 0x28]
//       // 0x0E-0x0F - undefined

//       0x10: { code: 'Shift' },
//       0x11: { code: 'Control' },
//       0x12: { code: 'Alt' },
//       0x13: { code: 'Pause' }, // [USB: 0x48]
//       0x14: { code: 'CapsLock' }, // [USB: 0x39]
//       0x15: { code: 'KanaMode' }, // [USB: 0x88] - "HangulMode" for Korean layout
//       0x16: { code: 'HangulMode' }, // [USB: 0x90] 0x15 as well in MSDN VK table ???
//       0x17: { code: 'JunjaMode' }, // (Not in D3E)
//       0x18: { code: 'FinalMode' }, // (Not in D3E)
//       0x19: { code: 'KanjiMode' }, // [USB: 0x91] - "HanjaMode" for Korean layout
//       // 0x1A - undefined
//       0x1B: { code: 'Escape' }, // [USB: 0x29]
//       0x1C: { code: 'Convert' }, // [USB: 0x8a]
//       0x1D: { code: 'NonConvert' }, // [USB: 0x8b]
//       0x1E: { code: 'Accept' }, // (Not in D3E)
//       0x1F: { code: 'ModeChange' }, // (Not in D3E)

//       0x20: { code: 'Space' }, // [USB: 0x2c]
//       0x21: { code: 'PageUp' }, // [USB: 0x4b]
//       0x22: { code: 'PageDown' }, // [USB: 0x4e]
//       0x23: { code: 'End' }, // [USB: 0x4d]
//       0x24: { code: 'Home' }, // [USB: 0x4a]
//       0x25: { code: 'ArrowLeft' }, // [USB: 0x50]
//       0x26: { code: 'ArrowUp' }, // [USB: 0x52]
//       0x27: { code: 'ArrowRight' }, // [USB: 0x4f]
//       0x28: { code: 'ArrowDown' }, // [USB: 0x51]
//       0x29: { code: 'Select' }, // (Not in D3E)
//       0x2A: { code: 'Print' }, // (Not in D3E)
//       0x2B: { code: 'Execute' }, // [USB: 0x74] (Not in D3E)
//       0x2C: { code: 'PrintScreen' }, // [USB: 0x46]
//       0x2D: { code: 'Insert' }, // [USB: 0x49]
//       0x2E: { code: 'Delete' }, // [USB: 0x4c]
//       0x2F: { code: 'Help' }, // [USB: 0x75] ???

//       0x30: { code: 'Digit0', keyCap: '0' }, // [USB: 0x27] 0)
//       0x31: { code: 'Digit1', keyCap: '1' }, // [USB: 0x1e] 1!
//       0x32: { code: 'Digit2', keyCap: '2' }, // [USB: 0x1f] 2@
//       0x33: { code: 'Digit3', keyCap: '3' }, // [USB: 0x20] 3#
//       0x34: { code: 'Digit4', keyCap: '4' }, // [USB: 0x21] 4$
//       0x35: { code: 'Digit5', keyCap: '5' }, // [USB: 0x22] 5%
//       0x36: { code: 'Digit6', keyCap: '6' }, // [USB: 0x23] 6^
//       0x37: { code: 'Digit7', keyCap: '7' }, // [USB: 0x24] 7&
//       0x38: { code: 'Digit8', keyCap: '8' }, // [USB: 0x25] 8*
//       0x39: { code: 'Digit9', keyCap: '9' }, // [USB: 0x26] 9(
//       // 0x3A-0x40 - undefined

//       0x41: { code: 'KeyA', keyCap: 'a' }, // [USB: 0x04]
//       0x42: { code: 'KeyB', keyCap: 'b' }, // [USB: 0x05]
//       0x43: { code: 'KeyC', keyCap: 'c' }, // [USB: 0x06]
//       0x44: { code: 'KeyD', keyCap: 'd' }, // [USB: 0x07]
//       0x45: { code: 'KeyE', keyCap: 'e' }, // [USB: 0x08]
//       0x46: { code: 'KeyF', keyCap: 'f' }, // [USB: 0x09]
//       0x47: { code: 'KeyG', keyCap: 'g' }, // [USB: 0x0a]
//       0x48: { code: 'KeyH', keyCap: 'h' }, // [USB: 0x0b]
//       0x49: { code: 'KeyI', keyCap: 'i' }, // [USB: 0x0c]
//       0x4A: { code: 'KeyJ', keyCap: 'j' }, // [USB: 0x0d]
//       0x4B: { code: 'KeyK', keyCap: 'k' }, // [USB: 0x0e]
//       0x4C: { code: 'KeyL', keyCap: 'l' }, // [USB: 0x0f]
//       0x4D: { code: 'KeyM', keyCap: 'm' }, // [USB: 0x10]
//       0x4E: { code: 'KeyN', keyCap: 'n' }, // [USB: 0x11]
//       0x4F: { code: 'KeyO', keyCap: 'o' }, // [USB: 0x12]

//       0x50: { code: 'KeyP', keyCap: 'p' }, // [USB: 0x13]
//       0x51: { code: 'KeyQ', keyCap: 'q' }, // [USB: 0x14]
//       0x52: { code: 'KeyR', keyCap: 'r' }, // [USB: 0x15]
//       0x53: { code: 'KeyS', keyCap: 's' }, // [USB: 0x16]
//       0x54: { code: 'KeyT', keyCap: 't' }, // [USB: 0x17]
//       0x55: { code: 'KeyU', keyCap: 'u' }, // [USB: 0x18]
//       0x56: { code: 'KeyV', keyCap: 'v' }, // [USB: 0x19]
//       0x57: { code: 'KeyW', keyCap: 'w' }, // [USB: 0x1a]
//       0x58: { code: 'KeyX', keyCap: 'x' }, // [USB: 0x1b]
//       0x59: { code: 'KeyY', keyCap: 'y' }, // [USB: 0x1c]
//       0x5A: { code: 'KeyZ', keyCap: 'z' }, // [USB: 0x1d]
//       0x5B: { code: 'OSLeft', location: LEFT }, // [USB: 0xe3]
//       0x5C: { code: 'OSRight', location: RIGHT }, // [USB: 0xe7]
//       0x5D: { code: 'ContextMenu' }, // [USB: 0x65] Context Menu
//       // 0x5E - reserved
//       0x5F: { code: 'Standby' }, // [USB: 0x82] Sleep

//       0x60: { code: 'Numpad0', keyCap: '0', location: NUMPAD }, // [USB: 0x62]
//       0x61: { code: 'Numpad1', keyCap: '1', location: NUMPAD }, // [USB: 0x59]
//       0x62: { code: 'Numpad2', keyCap: '2', location: NUMPAD }, // [USB: 0x5a]
//       0x63: { code: 'Numpad3', keyCap: '3', location: NUMPAD }, // [USB: 0x5b]
//       0x64: { code: 'Numpad4', keyCap: '4', location: NUMPAD }, // [USB: 0x5c]
//       0x65: { code: 'Numpad5', keyCap: '5', location: NUMPAD }, // [USB: 0x5d]
//       0x66: { code: 'Numpad6', keyCap: '6', location: NUMPAD }, // [USB: 0x5e]
//       0x67: { code: 'Numpad7', keyCap: '7', location: NUMPAD }, // [USB: 0x5f]
//       0x68: { code: 'Numpad8', keyCap: '8', location: NUMPAD }, // [USB: 0x60]
//       0x69: { code: 'Numpad9', keyCap: '9', location: NUMPAD }, // [USB: 0x61]
//       0x6A: { code: 'NumpadMultiply', keyCap: '*', location: NUMPAD }, // [USB: 0x55]
//       0x6B: { code: 'NumpadAdd', keyCap: '+', location: NUMPAD }, // [USB: 0x57]
//       0x6C: { code: 'NumpadComma', keyCap: ',', location: NUMPAD }, // [USB: 0x85]
//       0x6D: { code: 'NumpadSubtract', keyCap: '-', location: NUMPAD }, // [USB: 0x56]
//       0x6E: { code: 'NumpadDecimal', keyCap: '.', location: NUMPAD }, // [USB: 0x63]
//       0x6F: { code: 'NumpadDivide', keyCap: '/', location: NUMPAD }, // [USB: 0x54]

//       0x70: { code: 'F1' }, // [USB: 0x3a]
//       0x71: { code: 'F2' }, // [USB: 0x3b]
//       0x72: { code: 'F3' }, // [USB: 0x3c]
//       0x73: { code: 'F4' }, // [USB: 0x3d]
//       0x74: { code: 'F5' }, // [USB: 0x3e]
//       0x75: { code: 'F6' }, // [USB: 0x3f]
//       0x76: { code: 'F7' }, // [USB: 0x40]
//       0x77: { code: 'F8' }, // [USB: 0x41]
//       0x78: { code: 'F9' }, // [USB: 0x42]
//       0x79: { code: 'F10' }, // [USB: 0x43]
//       0x7A: { code: 'F11' }, // [USB: 0x44]
//       0x7B: { code: 'F12' }, // [USB: 0x45]
//       0x7C: { code: 'F13' }, // [USB: 0x68]
//       0x7D: { code: 'F14' }, // [USB: 0x69]
//       0x7E: { code: 'F15' }, // [USB: 0x6a]
//       0x7F: { code: 'F16' }, // [USB: 0x6b]

//       0x80: { code: 'F17' }, // [USB: 0x6c]
//       0x81: { code: 'F18' }, // [USB: 0x6d]
//       0x82: { code: 'F19' }, // [USB: 0x6e]
//       0x83: { code: 'F20' }, // [USB: 0x6f]
//       0x84: { code: 'F21' }, // [USB: 0x70]
//       0x85: { code: 'F22' }, // [USB: 0x71]
//       0x86: { code: 'F23' }, // [USB: 0x72]
//       0x87: { code: 'F24' }, // [USB: 0x73]
//       // 0x88-0x8F - unassigned

//       0x90: { code: 'NumLock', location: NUMPAD }, // [USB: 0x53]
//       0x91: { code: 'ScrollLock' }, // [USB: 0x47]
//       // 0x92-0x96 - OEM specific
//       // 0x97-0x9F - unassigned

//       // NOTE: 0xA0-0xA5 usually mapped to 0x10-0x12 in browsers
//       0xA0: { code: 'ShiftLeft', location: LEFT }, // [USB: 0xe1]
//       0xA1: { code: 'ShiftRight', location: RIGHT }, // [USB: 0xe5]
//       0xA2: { code: 'ControlLeft', location: LEFT }, // [USB: 0xe0]
//       0xA3: { code: 'ControlRight', location: RIGHT }, // [USB: 0xe4]
//       0xA4: { code: 'AltLeft', location: LEFT }, // [USB: 0xe2]
//       0xA5: { code: 'AltRight', location: RIGHT }, // [USB: 0xe6]

//       0xA6: { code: 'BrowserBack' }, // [USB: 0x0c/0x0224]
//       0xA7: { code: 'BrowserForward' }, // [USB: 0x0c/0x0225]
//       0xA8: { code: 'BrowserRefresh' }, // [USB: 0x0c/0x0227]
//       0xA9: { code: 'BrowserStop' }, // [USB: 0x0c/0x0226]
//       0xAA: { code: 'BrowserSearch' }, // [USB: 0x0c/0x0221]
//       0xAB: { code: 'BrowserFavorites' }, // [USB: 0x0c/0x0228]
//       0xAC: { code: 'BrowserHome' }, // [USB: 0x0c/0x0222]
//       0xAD: { code: 'VolumeMute' }, // [USB: 0x7f]
//       0xAE: { code: 'VolumeDown' }, // [USB: 0x81]
//       0xAF: { code: 'VolumeUp' }, // [USB: 0x80]

//       0xB0: { code: 'MediaTrackNext' }, // [USB: 0x0c/0x00b5]
//       0xB1: { code: 'MediaTrackPrevious' }, // [USB: 0x0c/0x00b6]
//       0xB2: { code: 'MediaStop' }, // [USB: 0x0c/0x00b7]
//       0xB3: { code: 'MediaPlayPause' }, // [USB: 0x0c/0x00cd]
//       0xB4: { code: 'LaunchMail' }, // [USB: 0x0c/0x018a]
//       0xB5: { code: 'MediaSelect' },
//       0xB6: { code: 'LaunchApp1' },
//       0xB7: { code: 'LaunchApp2' },
//       // 0xB8-0xB9 - reserved
//       0xBA: { code: 'Semicolon',  keyCap: ';' }, // [USB: 0x33] ;: (US Standard 101)
//       0xBB: { code: 'Equal', keyCap: '=' }, // [USB: 0x2e] =+
//       0xBC: { code: 'Comma', keyCap: ',' }, // [USB: 0x36] ,<
//       0xBD: { code: 'Minus', keyCap: '-' }, // [USB: 0x2d] -_
//       0xBE: { code: 'Period', keyCap: '.' }, // [USB: 0x37] .>
//       0xBF: { code: 'Slash', keyCap: '/' }, // [USB: 0x38] /? (US Standard 101)

//       0xC0: { code: 'Backquote', keyCap: '`' }, // [USB: 0x35] `~ (US Standard 101)
//       // 0xC1-0xCF - reserved

//       // 0xD0-0xD7 - reserved
//       // 0xD8-0xDA - unassigned
//       0xDB: { code: 'BracketLeft', keyCap: '[' }, // [USB: 0x2f] [{ (US Standard 101)
//       0xDC: { code: 'Backslash',  keyCap: '\\' }, // [USB: 0x31] \| (US Standard 101)
//       0xDD: { code: 'BracketRight', keyCap: ']' }, // [USB: 0x30] ]} (US Standard 101)
//       0xDE: { code: 'Quote', keyCap: '\'' }, // [USB: 0x34] '" (US Standard 101)
//       // 0xDF - miscellaneous/varies

//       // 0xE0 - reserved
//       // 0xE1 - OEM specific
//       0xE2: { code: 'IntlBackslash',  keyCap: '\\' }, // [USB: 0x64] \| (UK Standard 102)
//       // 0xE3-0xE4 - OEM specific
//       0xE5: { code: 'Process' }, // (Not in D3E)
//       // 0xE6 - OEM specific
//       // 0xE7 - VK_PACKET
//       // 0xE8 - unassigned
//       // 0xE9-0xEF - OEM specific

//       // 0xF0-0xF5 - OEM specific
//       0xF6: { code: 'Attn' }, // [USB: 0x9a] (Not in D3E)
//       0xF7: { code: 'CrSel' }, // [USB: 0xa3] (Not in D3E)
//       0xF8: { code: 'ExSel' }, // [USB: 0xa4] (Not in D3E)
//       0xF9: { code: 'EraseEof' }, // (Not in D3E)
//       0xFA: { code: 'Play' }, // (Not in D3E)
//       0xFB: { code: 'ZoomToggle' }, // (Not in D3E)
//       // 0xFC - VK_NONAME - reserved
//       // 0xFD - VK_PA1
//       0xFE: { code: 'Clear' } // [USB: 0x9c] (Not in D3E)
//     };

//     // No legacy keyCode, but listed in D3E:

//     // code: usb
//     // 'IntlHash': 0x070032,
//     // 'IntlRo': 0x070087,
//     // 'IntlYen': 0x070089,
//     // 'NumpadBackspace': 0x0700bb,
//     // 'NumpadClear': 0x0700d8,
//     // 'NumpadClearEntry': 0x0700d9,
//     // 'NumpadMemoryAdd': 0x0700d3,
//     // 'NumpadMemoryClear': 0x0700d2,
//     // 'NumpadMemoryRecall': 0x0700d1,
//     // 'NumpadMemoryStore': 0x0700d0,
//     // 'NumpadMemorySubtract': 0x0700d4,
//     // 'NumpadParenLeft': 0x0700b6,
//     // 'NumpadParenRight': 0x0700b7,

//     //--------------------------------------------------------------------
//     //
//     // Browser/OS Specific Mappings
//     //
//     //--------------------------------------------------------------------

//     mergeIf(keyCodeToInfoTable,
//             'moz', {
//               0x3B: { code: 'Semicolon', keyCap: ';' }, // [USB: 0x33] ;: (US Standard 101)
//               0x3D: { code: 'Equal', keyCap: '=' }, // [USB: 0x2e] =+
//               0x6B: { code: 'Equal', keyCap: '=' }, // [USB: 0x2e] =+
//               0x6D: { code: 'Minus', keyCap: '-' }, // [USB: 0x2d] -_
//               0xBB: { code: 'NumpadAdd', keyCap: '+', location: NUMPAD }, // [USB: 0x57]
//               0xBD: { code: 'NumpadSubtract', keyCap: '-', location: NUMPAD } // [USB: 0x56]
//             });

//     mergeIf(keyCodeToInfoTable,
//             'moz-mac', {
//               0x0C: { code: 'NumLock', location: NUMPAD }, // [USB: 0x53]
//               0xAD: { code: 'Minus', keyCap: '-' } // [USB: 0x2d] -_
//             });

//     mergeIf(keyCodeToInfoTable,
//             'moz-win', {
//               0xAD: { code: 'Minus', keyCap: '-' } // [USB: 0x2d] -_
//             });

//     mergeIf(keyCodeToInfoTable,
//             'chrome-mac', {
//               0x5D: { code: 'OSRight', location: RIGHT } // [USB: 0xe7]
//             });

//     // Windows via Bootcamp (!)
//     if (0) {
//       mergeIf(keyCodeToInfoTable,
//               'chrome-win', {
//                 0xC0: { code: 'Quote', keyCap: '\'' }, // [USB: 0x34] '" (US Standard 101)
//                 0xDE: { code: 'Backslash',  keyCap: '\\' }, // [USB: 0x31] \| (US Standard 101)
//                 0xDF: { code: 'Backquote', keyCap: '`' } // [USB: 0x35] `~ (US Standard 101)
//               });

//       mergeIf(keyCodeToInfoTable,
//               'ie', {
//                 0xC0: { code: 'Quote', keyCap: '\'' }, // [USB: 0x34] '" (US Standard 101)
//                 0xDE: { code: 'Backslash',  keyCap: '\\' }, // [USB: 0x31] \| (US Standard 101)
//                 0xDF: { code: 'Backquote', keyCap: '`' } // [USB: 0x35] `~ (US Standard 101)
//               });
//     }

//     mergeIf(keyCodeToInfoTable,
//             'safari', {
//               0x03: { code: 'Enter' }, // [USB: 0x28] old Safari
//               0x19: { code: 'Tab' } // [USB: 0x2b] old Safari for Shift+Tab
//             });

//     mergeIf(keyCodeToInfoTable,
//             'ios', {
//               0x0A: { code: 'Enter', location: STANDARD } // [USB: 0x28]
//             });

//     mergeIf(keyCodeToInfoTable,
//             'safari-mac', {
//               0x5B: { code: 'OSLeft', location: LEFT }, // [USB: 0xe3]
//               0x5D: { code: 'OSRight', location: RIGHT }, // [USB: 0xe7]
//               0xE5: { code: 'KeyQ', keyCap: 'Q' } // [USB: 0x14] On alternate presses, Ctrl+Q sends this
//             });

//     //--------------------------------------------------------------------
//     //
//     // Identifier Mappings
//     //
//     //--------------------------------------------------------------------

//     // Cases where newer-ish browsers send keyIdentifier which can be
//     // used to disambiguate keys.

//     // keyIdentifierTable[keyIdentifier] -> keyInfo

//     var keyIdentifierTable = {};
//     if ('cros' === os) {
//       keyIdentifierTable['U+00A0'] = { code: 'ShiftLeft', location: LEFT };
//       keyIdentifierTable['U+00A1'] = { code: 'ShiftRight', location: RIGHT };
//       keyIdentifierTable['U+00A2'] = { code: 'ControlLeft', location: LEFT };
//       keyIdentifierTable['U+00A3'] = { code: 'ControlRight', location: RIGHT };
//       keyIdentifierTable['U+00A4'] = { code: 'AltLeft', location: LEFT };
//       keyIdentifierTable['U+00A5'] = { code: 'AltRight', location: RIGHT };
//     }
//     if ('chrome-mac' === browser_os) {
//       keyIdentifierTable['U+0010'] = { code: 'ContextMenu' };
//     }
//     if ('safari-mac' === browser_os) {
//       keyIdentifierTable['U+0010'] = { code: 'ContextMenu' };
//     }
//     if ('ios' === os) {
//       // These only generate keyup events
//       keyIdentifierTable['U+0010'] = { code: 'Function' };

//       keyIdentifierTable['U+001C'] = { code: 'ArrowLeft' };
//       keyIdentifierTable['U+001D'] = { code: 'ArrowRight' };
//       keyIdentifierTable['U+001E'] = { code: 'ArrowUp' };
//       keyIdentifierTable['U+001F'] = { code: 'ArrowDown' };

//       keyIdentifierTable['U+0001'] = { code: 'Home' }; // [USB: 0x4a] Fn + ArrowLeft
//       keyIdentifierTable['U+0004'] = { code: 'End' }; // [USB: 0x4d] Fn + ArrowRight
//       keyIdentifierTable['U+000B'] = { code: 'PageUp' }; // [USB: 0x4b] Fn + ArrowUp
//       keyIdentifierTable['U+000C'] = { code: 'PageDown' }; // [USB: 0x4e] Fn + ArrowDown
//     }

//     //--------------------------------------------------------------------
//     //
//     // Location Mappings
//     //
//     //--------------------------------------------------------------------

//     // Cases where newer-ish browsers send location/keyLocation which
//     // can be used to disambiguate keys.

//     // locationTable[location][keyCode] -> keyInfo
//     var locationTable = [];
//     locationTable[LEFT] = {
//       0x10: { code: 'ShiftLeft', location: LEFT }, // [USB: 0xe1]
//       0x11: { code: 'ControlLeft', location: LEFT }, // [USB: 0xe0]
//       0x12: { code: 'AltLeft', location: LEFT } // [USB: 0xe2]
//     };
//     locationTable[RIGHT] = {
//       0x10: { code: 'ShiftRight', location: RIGHT }, // [USB: 0xe5]
//       0x11: { code: 'ControlRight', location: RIGHT }, // [USB: 0xe4]
//       0x12: { code: 'AltRight', location: RIGHT } // [USB: 0xe6]
//     };
//     locationTable[NUMPAD] = {
//       0x0D: { code: 'NumpadEnter', location: NUMPAD } // [USB: 0x58]
//     };

//     mergeIf(locationTable[NUMPAD], 'moz', {
//       0x6D: { code: 'NumpadSubtract', location: NUMPAD }, // [USB: 0x56]
//       0x6B: { code: 'NumpadAdd', location: NUMPAD } // [USB: 0x57]
//     });
//     mergeIf(locationTable[LEFT], 'moz-mac', {
//       0xE0: { code: 'OSLeft', location: LEFT } // [USB: 0xe3]
//     });
//     mergeIf(locationTable[RIGHT], 'moz-mac', {
//       0xE0: { code: 'OSRight', location: RIGHT } // [USB: 0xe7]
//     });
//     mergeIf(locationTable[RIGHT], 'moz-win', {
//       0x5B: { code: 'OSRight', location: RIGHT } // [USB: 0xe7]
//     });


//     mergeIf(locationTable[RIGHT], 'mac', {
//       0x5D: { code: 'OSRight', location: RIGHT } // [USB: 0xe7]
//     });

//     mergeIf(locationTable[NUMPAD], 'chrome-mac', {
//       0x0C: { code: 'NumLock', location: NUMPAD } // [USB: 0x53]
//     });

//     mergeIf(locationTable[NUMPAD], 'safari-mac', {
//       0x0C: { code: 'NumLock', location: NUMPAD }, // [USB: 0x53]
//       0xBB: { code: 'NumpadAdd', location: NUMPAD }, // [USB: 0x57]
//       0xBD: { code: 'NumpadSubtract', location: NUMPAD }, // [USB: 0x56]
//       0xBE: { code: 'NumpadDecimal', location: NUMPAD }, // [USB: 0x63]
//       0xBF: { code: 'NumpadDivide', location: NUMPAD } // [USB: 0x54]
//     });


//     //--------------------------------------------------------------------
//     //
//     // Key Values
//     //
//     //--------------------------------------------------------------------

//     // Mapping from `code` values to `key` values. Values defined at:
//     // https://dvcs.w3.org/hg/dom3events/raw-file/tip/html/DOM3Events-key.html
//     // Entries are only provided when `key` differs from `code`. If
//     // printable, `shiftKey` has the shifted printable character. This
//     // assumes US Standard 101 layout

//     var codeToKeyTable = {
//       // Modifier Keys
//       ShiftLeft: { key: 'Shift' },
//       ShiftRight: { key: 'Shift' },
//       ControlLeft: { key: 'Control' },
//       ControlRight: { key: 'Control' },
//       AltLeft: { key: 'Alt' },
//       AltRight: { key: 'Alt' },
//       OSLeft: { key: 'OS' },
//       OSRight: { key: 'OS' },

//       // Whitespace Keys
//       NumpadEnter: { key: 'Enter' },
//       Space: { key: ' ' },

//       // Printable Keys
//       Digit0: { key: '0', shiftKey: ')' },
//       Digit1: { key: '1', shiftKey: '!' },
//       Digit2: { key: '2', shiftKey: '@' },
//       Digit3: { key: '3', shiftKey: '#' },
//       Digit4: { key: '4', shiftKey: '$' },
//       Digit5: { key: '5', shiftKey: '%' },
//       Digit6: { key: '6', shiftKey: '^' },
//       Digit7: { key: '7', shiftKey: '&' },
//       Digit8: { key: '8', shiftKey: '*' },
//       Digit9: { key: '9', shiftKey: '(' },
//       KeyA: { key: 'a', shiftKey: 'A' },
//       KeyB: { key: 'b', shiftKey: 'B' },
//       KeyC: { key: 'c', shiftKey: 'C' },
//       KeyD: { key: 'd', shiftKey: 'D' },
//       KeyE: { key: 'e', shiftKey: 'E' },
//       KeyF: { key: 'f', shiftKey: 'F' },
//       KeyG: { key: 'g', shiftKey: 'G' },
//       KeyH: { key: 'h', shiftKey: 'H' },
//       KeyI: { key: 'i', shiftKey: 'I' },
//       KeyJ: { key: 'j', shiftKey: 'J' },
//       KeyK: { key: 'k', shiftKey: 'K' },
//       KeyL: { key: 'l', shiftKey: 'L' },
//       KeyM: { key: 'm', shiftKey: 'M' },
//       KeyN: { key: 'n', shiftKey: 'N' },
//       KeyO: { key: 'o', shiftKey: 'O' },
//       KeyP: { key: 'p', shiftKey: 'P' },
//       KeyQ: { key: 'q', shiftKey: 'Q' },
//       KeyR: { key: 'r', shiftKey: 'R' },
//       KeyS: { key: 's', shiftKey: 'S' },
//       KeyT: { key: 't', shiftKey: 'T' },
//       KeyU: { key: 'u', shiftKey: 'U' },
//       KeyV: { key: 'v', shiftKey: 'V' },
//       KeyW: { key: 'w', shiftKey: 'W' },
//       KeyX: { key: 'x', shiftKey: 'X' },
//       KeyY: { key: 'y', shiftKey: 'Y' },
//       KeyZ: { key: 'z', shiftKey: 'Z' },
//       Numpad0: { key: '0' },
//       Numpad1: { key: '1' },
//       Numpad2: { key: '2' },
//       Numpad3: { key: '3' },
//       Numpad4: { key: '4' },
//       Numpad5: { key: '5' },
//       Numpad6: { key: '6' },
//       Numpad7: { key: '7' },
//       Numpad8: { key: '8' },
//       Numpad9: { key: '9' },
//       NumpadMultiply: { key: '*' },
//       NumpadAdd: { key: '+' },
//       NumpadComma: { key: ',' },
//       NumpadSubtract: { key: '-' },
//       NumpadDecimal: { key: '.' },
//       NumpadDivide: { key: '/' },
//       Semicolon: { key: ';', shiftKey: ':' },
//       Equal: { key: '=', shiftKey: '+' },
//       Comma: { key: ',', shiftKey: '<' },
//       Minus: { key: '-', shiftKey: '_' },
//       Period: { key: '.', shiftKey: '>' },
//       Slash: { key: '/', shiftKey: '?' },
//       Backquote: { key: '`', shiftKey: '~' },
//       BracketLeft: { key: '[', shiftKey: '{' },
//       Backslash: { key: '\\', shiftKey: '|' },
//       BracketRight: { key: ']', shiftKey: '}' },
//       Quote: { key: '\'', shiftKey: '"' },
//       IntlBackslash: { key: '\\', shiftKey: '|' }
//     };

//     mergeIf(codeToKeyTable, 'mac', {
//       OSLeft: { key: 'Meta' },
//       OSRight: { key: 'Meta' }
//     });

//     // Corrections for 'key' names in older browsers (e.g. FF36-)
//     // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent.key#Key_values
//     var keyFixTable = {
//       Esc: 'Escape',
//       Nonconvert: 'NonConvert',
//       Left: 'ArrowLeft',
//       Up: 'ArrowUp',
//       Right: 'ArrowRight',
//       Down: 'ArrowDown',
//       Del: 'Delete',
//       Menu: 'ContextMenu',
//       MediaNextTrack: 'MediaTrackNext',
//       MediaPreviousTrack: 'MediaTrackPrevious',
//       SelectMedia: 'MediaSelect',
//       HalfWidth: 'Hankaku',
//       FullWidth: 'Zenkaku',
//       RomanCharacters: 'Romaji',
//       Crsel: 'CrSel',
//       Exsel: 'ExSel',
//       Zoom: 'ZoomToggle'
//     };

//     //--------------------------------------------------------------------
//     //
//     // Exported Functions
//     //
//     //--------------------------------------------------------------------


//     var codeTable = remap(keyCodeToInfoTable, 'code');

//     try {
//       var nativeLocation = nativeKeyboardEvent && ('location' in new KeyboardEvent(''));
//     } catch (_) {}

//     function keyInfoForEvent(event) {
//       var keyCode = 'keyCode' in event ? event.keyCode : 'which' in event ? event.which : 0;

//       var keyInfo = (function(){
//         if (nativeLocation || 'keyLocation' in event) {
//           var location = nativeLocation ? event.location : event.keyLocation;
//           if (location && keyCode in locationTable[location]) {
//             return locationTable[location][keyCode];
//           }
//         }
//         if ('keyIdentifier' in event && event.keyIdentifier in keyIdentifierTable) {
//           return keyIdentifierTable[event.keyIdentifier];
//         }
//         if (keyCode in keyCodeToInfoTable) {
//           return keyCodeToInfoTable[keyCode];
//         }
//         return null;
//       }());

//       // TODO: Track these down and move to general tables
//       if (0) {
//         // TODO: Map these for newerish browsers?
//         // TODO: iOS only?
//         // TODO: Override with more common keyIdentifier name?
//         switch (event.keyIdentifier) {
//         case 'U+0010': keyInfo = { code: 'Function' }; break;
//         case 'U+001C': keyInfo = { code: 'ArrowLeft' }; break;
//         case 'U+001D': keyInfo = { code: 'ArrowRight' }; break;
//         case 'U+001E': keyInfo = { code: 'ArrowUp' }; break;
//         case 'U+001F': keyInfo = { code: 'ArrowDown' }; break;
//         }
//       }

//       if (!keyInfo)
//         return null;

//       var key = (function() {
//         var entry = codeToKeyTable[keyInfo.code];
//         if (!entry) return keyInfo.code;
//         return (event.shiftKey && 'shiftKey' in entry) ? entry.shiftKey : entry.key;
//       }());

//       return {
//         code: keyInfo.code,
//         key: key,
//         location: keyInfo.location,
//         keyCap: keyInfo.keyCap
//       };
//     }

//     function queryKeyCap(code, locale) {
//       code = String(code);
//       if (!codeTable.hasOwnProperty(code)) return 'Undefined';
//       if (locale && String(locale).toLowerCase() !== 'en-us') throw Error('Unsupported locale');
//       var keyInfo = codeTable[code];
//       return keyInfo.keyCap || keyInfo.code || 'Undefined';
//     }

//     if ('KeyboardEvent' in global && 'defineProperty' in Object) {
//       (function() {
//         function define(o, p, v) {
//           if (p in o) return;
//           Object.defineProperty(o, p, v);
//         }

//         define(KeyboardEvent.prototype, 'code', { get: function() {
//           var keyInfo = keyInfoForEvent(this);
//           return keyInfo ? keyInfo.code : '';
//         }});

//         // Fix for nonstandard `key` values (FF36-)
//         if ('key' in KeyboardEvent.prototype) {
//           var desc = Object.getOwnPropertyDescriptor(KeyboardEvent.prototype, 'key');
//           Object.defineProperty(KeyboardEvent.prototype, 'key', { get: function() {
//             var key = desc.get.call(this);
//             return keyFixTable.hasOwnProperty(key) ? keyFixTable[key] : key;
//           }});
//         }

//         define(KeyboardEvent.prototype, 'key', { get: function() {
//           var keyInfo = keyInfoForEvent(this);
//           return (keyInfo && 'key' in keyInfo) ? keyInfo.key : 'Unidentified';
//         }});

//         define(KeyboardEvent.prototype, 'location', { get: function() {
//           var keyInfo = keyInfoForEvent(this);
//           return (keyInfo && 'location' in keyInfo) ? keyInfo.location : STANDARD;
//         }});

//         define(KeyboardEvent.prototype, 'locale', { get: function() {
//           return '';
//         }});
//       }());
//     }

//     if (!('queryKeyCap' in global.KeyboardEvent))
//       global.KeyboardEvent.queryKeyCap = queryKeyCap;

//     // Helper for IE8-
//     global.identifyKey = function(event) {
//       if ('code' in event)
//         return;

//       var keyInfo = keyInfoForEvent(event);
//       event.code = keyInfo ? keyInfo.code : '';
//       event.key = (keyInfo && 'key' in keyInfo) ? keyInfo.key : 'Unidentified';
//       event.location = ('location' in event) ? event.location :
//         ('keyLocation' in event) ? event.keyLocation :
//         (keyInfo && 'location' in keyInfo) ? keyInfo.location : STANDARD;
//       event.locale = '';
//     };

//   } (window));
// }
/******/ ]);