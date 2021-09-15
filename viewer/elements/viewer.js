import { html, css           } from 'https://cdn.skypack.dev/lit-element@2.4.0';
import { WebGLTFParamElement } from './param.js';

import { WebGLTF     } from 'https://cdn.jsdelivr.net/npm/webgltf/lib/webgltf.js';
import { Renderer    } from 'https://cdn.jsdelivr.net/npm/webgltf/lib/renderer/renderer.js';
import { Animator    } from 'https://cdn.jsdelivr.net/npm/webgltf/lib/renderer/animator.js';
import { Environment } from 'https://cdn.jsdelivr.net/npm/webgltf/lib/renderer/environment.js';

import samplesIndex from 'https://cdn.jsdelivr.net/gh/webgltf/webgltf-sample-models@main/index.js';
import envIndex     from 'https://cdn.jsdelivr.net/gh/webgltf/webgltf-sample-models@main/environments/index.js';

import './controls.js';
import './camera.js';
import './toast.js';
import './vr.js';

const samples      = samplesIndex;
const environments = envIndex.filter(({ res }) => res === 256);

class WebGLTFViewerElement extends WebGLTFParamElement {
  static get properties() {
    return {
      showcontrols: { type: Boolean, reflect: true },

      loading:       { type: Boolean, reflect: true },
      loadingSample: { type: Boolean },
      loadingEnv:    { type: Boolean },

      error:        { type: String,  reflect: true },

      webgltf: { type: Object },

      usePunctual: { type: Boolean, param: true, default: true },
      useIBL:      { type: Boolean, param: true, default: true },
      useSSAO:     { type: Boolean, param: true, default: true },
      useShadows:  { type: Boolean, param: true, default: true },
      useGrid:     { type: Boolean, param: true, default: false },
      useFog:      { type: Boolean, param: true, default: false },
      useDOF:      { type: Boolean, param: true, default: false },
      useAABB:     { type: Boolean, param: true, default: false },

      sample:      { type: String, param: true, default: 'SciFiHelmet' },
      variant:     { type: String, param: true, default: 'glTF' },
      material:    { type: String, param: true },
      environment: { type: String, param: true, default: 'Round Platform' },
      tonemap:     { type: String, param: true, default: '' },

      cameraId:    { type: Number, param: true, default: -1 },
      sceneId:     { type: Number, param: true, default: -1 },

      debug:       { type: String, param: true, default: 'DEBUG_NONE' },
    }
  }

  constructor() {
    
    super();
    this.canvas   = document.createElement('canvas');
    this.camera   = document.createElement('webgltf-viewer-camera');
    this.controls = document.createElement('webgltf-viewer-controls');
    this.toast    = document.createElement('webgltf-viewer-toast');

    this.camera.addEventListener('pointerdown', () => {
      this.controls.closeMenu();
    });

    this.samples      = samples;
    this.environments = environments;
  }

  async connectedCallback() {
    super.connectedCallback();
    try {
      this.renderer = new Renderer(this.canvas, { xrCompatible: true });
      this.renderer.scaleFactor = 1 / window.devicePixelRatio;
      this.camera.renderer = this.renderer;
      // this.vrControl = document.createElement('webgltf-vr-control');
      // this.vrControl.viewer = this;
      this.requestId = requestAnimationFrame(t => this.renderWebGLTF(t));
    } catch(e) {
      console.warn(e);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    cancelAnimationFrame(this.requestId);
  }

  updated(changedProperties) {
    super.updated(changedProperties);

    const { settings } = this.renderer;

    if(changedProperties.has('webgltf')) {
      this.animator = new Animator(this.webgltf.animations);
      const scene  = this.webgltf.scene || this.webgltf.scenes[0];

      scene.graph.update();

      this.camera.resetToScene(scene, this.canvas);

      this.lastRenderTime = performance.now();      
    }

    if(changedProperties.has('usePunctual')
      || changedProperties.has('useIBL') 
      || changedProperties.has('useSSAO') 
      || changedProperties.has('useShadows')
      || changedProperties.has('useGrid')
      || changedProperties.has('useFog')
      || changedProperties.has('useDOF')
      || changedProperties.has('tonemap')
      || changedProperties.has('debug')) {
      settings.punctual.enabled = this.usePunctual;
      settings.ibl.enabled      = this.useIBL;
      settings.ssao.enabled     = this.useSSAO;
      settings.shadows.enabled  = this.useShadows;
      settings.grid.enabled     = this.useGrid;
      settings.fog.enabled      = this.useFog;
      settings.dof.enabled      = this.useDOF;
      settings.tonemap          = this.tonemap;
      settings.debug            = this.debug;
      this.renderer.reset();
    }

    if(changedProperties.has('sample') || changedProperties.has('variant') ) {
      
      this.loadSample();
    }

    if(changedProperties.has('material')) {
      this.activateMaterial();
    }

    if(changedProperties.has('environment')) {
      if(this.useIBL) this.loadEnvironment();
    }

    if(changedProperties.has('useIBL')) {
      if(this.useIBL && !this.renderer.environment) this.loadEnvironment();
    }

    if(changedProperties.has('useDOF')) {
      if(this.useDOF) this.toast.addMessage(html`Depth of Field enabled.<br>Click/Tap to set focus distance.`, 5000);
    }

    if(changedProperties.has('useAABB')) {
      settings.aabb.enabled = this.useAABB;
    }

    this.controls.update();
  }

  render(){
    if(!this.renderer) {
      console.log('Not supported');
      return html`<p>Your browser does not support WebGL 2.0</p>`;
    }

    this.loading = this.loadingSample || this.loadingEnv;
    
    return html`
      ${this.camera}
      ${this.canvas}
      ${this.vrControl}
      ${this.showcontrols ? this.controls : ''}
      ${this.toast}
      <div class="loader"><webgltf-icon name="spinner"></webgltf-icon> Loading</div>
      <div class="error ${this.error ? 'show': 'hide'}">
        <webgltf-icon name="exclamation-circle"></webgltf-icon> Failed to load model
        <small><pre>${this.error}</pre></small>
        <button @click="${() => this.error = false}">Dismiss</button>
      </div>
    `;
  }

  renderWebGLTF(hrTime) {
    this.requestId = requestAnimationFrame(t => this.renderWebGLTF(t));

    if (this.webgltf) {
      this.camera.updateInput(hrTime);
      
      const scene = this.webgltf.scenes[0];
      const camera = this.webgltf.nodes[this.cameraId]?.camera ? this.webgltf.nodes[this.cameraId] : this.camera.node;

      this.animator.update(hrTime - this.lastRenderTime, scene);
      if(!this.vrControl?.xrSession) this.renderer.render(scene, camera);
    }
    this.lastRenderTime = hrTime;
  }

  async loadSample() {
    this.loadingSample = true;
    this.error = false;

    const sample = this.samples.find(({ name }) => name === this.sample);
    const source = sample.variants[this.variant] ? sample.variants[this.variant] : sample.variants[Object.keys(sample.variants)[0]];

    try {
      if(this.abortController) this.abortController.abort();
      this.abortController = new AbortController();

      this.webgltf = await WebGLTF.load(source, this.abortController);
      this.loadingSample = false;
      this.toast.addMessage(html`Drag to Rotate<br>Scroll/Pinch to Zoom`, 3000);
      console.log('Sample:', this.webgltf);
    } catch(e) {
      if(e.name !== 'AbortError') {
        this.error = e.message;
        console.trace(e);
      }
    }
  }

  async loadEnvironment() {
    this.loadingEnv = true;
    const gltf = environments.find(({ name }) => name === this.environment)?.gltf;
    this.renderer.environment = gltf ? await Environment.load(gltf) : null;
    this.renderer.reset();
    this.loadingEnv = false;

    console.log('Environment:', this.renderer.environment);
  }

  activateMaterial() {
    for(const variant of (this.webgltf?.extensions?.KHR_materials_variants?.variants || [])){
      if(variant.name === this.material) {
        variant.activate(this.renderer.context);
      } else {
        variant.deactivate(this.renderer.context);
      }
    }
  }

  static get styles() {
    return css`
      :host {
        display: flex;
        position: relative;
        background: radial-gradient(var(--primary-dark), var(--primary-light));
        width: 100%;
        height: 100%;
        align-items: center;
        justify-content: center;
      }

      :host([loading]) canvas {
        filter: blur(12px);
      }

      :host([loading]) .loader {
        display: inline-block;
      }

      .error.show {
        display: inline-block;
        font-size: var(--font-size-m);
      }

      .error button {
        float: right;
        cursor: pointer;
      }

      .loader, .error {
        display: none;
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        font-size: var(--font-size-l);
        background-color: rgba(0,0,0, 0.75);
        padding: 15px;
        border-radius: 5px;
        z-index: 3;
      }

      .loader webgltf-icon {
        animation: spin 2s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      canvas {
        width: 100%;
        height: 100%;
        touch-action: none;
      }

      webgltf-viewer-camera {
        z-index: 1;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        touch-action: none;
        line-height: 24px;
      }

      webgltf-viewer-controls {
        z-index: 2;
      }

      webgltf-viewer-toast {
        z-index: 4;
        position: absolute;
        left: 0;
        right: 0;
        bottom: 20vh;
      }
    `;
  }
}

customElements.define('webgltf-viewer', WebGLTFViewerElement);
