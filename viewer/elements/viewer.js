import { LitElement, html, css } from 'https://cdn.skypack.dev/lit-element@2.4.0';

import { Renderer    } from 'https://cdn.jsdelivr.net/npm/webgltf/lib/renderer/renderer.js';
import { Animator    } from 'https://cdn.jsdelivr.net/npm/webgltf/lib/renderer/animator.js';

import './controls/controls.js';
import './camera.js';
import './vr.js';

class WebGLTFViewerElement extends LitElement {
  static get properties() {
    return {
      showcontrols: { type: Boolean, reflect: true },
      loading:      { type: Boolean, reflect: true },
      error:        { type: String,  reflect: true },

      webgltf: { type: Object },
      scene:   { type: Object },
      ibl:     { type: Object },

      usePunctual: { type: Boolean },
      useIBL:      { type: Boolean },
    }
  }

  constructor() {
    
    super();
    this.canvas   = document.createElement('canvas');
    this.camera   = document.createElement('webgltf-viewer-camera');
    this.controls = document.createElement('webgltf-viewer-controls');

    this.controls.addEventListener('control:updated', () => this.controlChange());
    this.controls.addEventListener('control:changed', () => this.controlChange());
    this.controls.addEventListener('control:error', () => this.controlChange());
  }

  controlChange() {
    this.loading = this.controls.loading;
    this.webgltf = this.controls.model.webgltf;
    this.ibl     = this.controls.environment.environment;

    this.usePunctual = !this.controls.environment.punctualoff;
    this.useIBL      = !this.controls.environment.useIBL;

    for(const variant of (this.webgltf?.extensions?.KHR_materials_variants?.variants || [])){
      if(variant.name === this.controls.model.material) {
        variant.activate(this.renderer.context);
      } else {
        variant.deactivate(this.renderer.context);
      }
    }
  }

  async connectedCallback() {
    super.connectedCallback();
    try {
      this.renderer = new Renderer(this.canvas, { xrCompatible: true });
      this.vrControl = document.createElement('webgltf-vr-control');
      this.vrControl.viewer = this;
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
    if(changedProperties.has('webgltf')) {
      this.animator = new Animator(this.webgltf.animations);
      this.camera.resetToScene(this.webgltf.scenes[this.controls.scene.scene || 0]);
      this.lastRenderTime = performance.now();      
    }
    if(changedProperties.has('ibl') || changedProperties.has('usePunctual') || changedProperties.has('useIBL')) {
      this.renderer.environment = this.ibl;
      this.renderer.usePunctual = this.usePunctual;
      this.renderer.useIBL = this.useIBL;
      this.renderer.clearProgramCache();
    }
  }

  render(){
    if(!this.renderer) {
      console.log('Not supported');
      return html`<p>Your browser does not support WebGL 2.0</p>`;
    }

    this.loading = this.controls.loading;
    this.error   = this.controls.error;

    this.renderer.scaleFactor = this.loading ? 0.25 : 1;
    
    return html`
      ${this.camera}
      ${this.canvas}
      ${this.vrControl}
      ${this.showcontrols ? this.controls : ''}
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
      this.camera.update();
      this.animator.update(hrTime - this.lastRenderTime);

      const scene = this.webgltf.scenes[this.controls.scene.scene || 0];
      const camera = this.webgltf.nodes[this.controls.scene.camera] || this.camera.node;

      this.renderer.render(scene, camera);
    }
    this.lastRenderTime = hrTime;
  }

  static get styles() {
    return css`
      :host {
        display: flex;
        position: relative;
        background-color: var(--primary-light);
        width: 100%;
        height: 100%;
        align-items: center;
        justify-content: center;
      }

      :host([loading]) canvas {
        filter: blur(4px);
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
        background-color: var(--primary);
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
        z-index: 100;
        position: absolute;
        right: 0;
        bottom: 0;
        max-height: 100%;
      }

      webgltf-vr-control {
        z-index: 12; /* the docisfy sidebar button is 11 */
        position: absolute;
        bottom: 0;
        left: 0;
      }
    `;
  }
}

customElements.define('webgltf-viewer', WebGLTFViewerElement);
