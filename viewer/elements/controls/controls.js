import { LitElement, html, css } from 'https://cdn.skypack.dev/lit-element@2.4.0';

import '../icon.js';
import '../fab.js';
import './group.js';
import './model.js';
import './scene.js';
import './lighting.js';
import './debug.js';

const CONTROLS = ['model', 'scene', 'lighting', 'debug'];

class WebGLTFViewerControls extends LitElement {
  static get properties() {
    return {
      collapsed: { type: Boolean, reflect: true },
    }
  }

  get loading() {
    return CONTROLS.some(name => this[name].loading);
  }

  constructor() {
    super();
    this.collapsed = true;

    for(const name of CONTROLS) {
      this[name] = document.createElement(`webgltf-viewer-control-${name}`);
    }

    // auto collapse the controls if clicking somewhere else
    window.addEventListener('pointerdown', (e) => {
      var path = e.path || (e.composedPath && e.composedPath());
      if(path.find(el => el === this)) return;
      this.collapsed = true;
    });

    this.model.addEventListener('control:changed', (e) => {
      for(const name of CONTROLS) {
        this[name].webgltf = this.model.webgltf;
      }
    });
  }

  render() {
    return html`
      <webgltf-fab icon="sliders-h" @click="${() => this.collapsed = false}"></webgltf-fab>
      <aside>
        <div class="controls">
          <header @click="${() => this.collapsed = true }">
            <webgltf-icon name="times"></webgltf-icon>
            <span>Close</span>
          </header> 
          ${CONTROLS.map(name => this[name])}
        </div>
      </aside>
    `;
  }

  static get styles() {
    return css`
      :host {
        color: var(--primary-text);
        user-select: none;
        display: flex;
        overflow: hidden;
      }

      webgltf-fab {
        position: absolute;
        bottom: 0;
        right: 0;
        transition: opacity 0.1s ease-in-out;
        z-index: 1;
      }

      :host(:not([collapsed])) webgltf-fab {
        opacity: 0;
        pointer-events: none;
      }

      @keyframes hide-scroll {
        from, to { overflow: hidden; } 
      }

      aside {
        max-width: 400px;
        max-height: 1000px;
        overflow: auto;
        background-color: var(--primary);
        margin: 16px;
        box-shadow: var(--card-shadow-1);
        transition: max-width 0.25s ease-in-out, max-height 0.25s ease-in-out, border-radius 0.25s ease-in-out;
        animation: hide-scroll 0.25s backwards;
      }

      :host([collapsed]) aside {
        border-radius: 56px;
        max-height: 56px;
        max-width: 56px;
        overflow: hidden;
        animation: none;
      }

      aside header {
        position: sticky;
        top: 0;
        font-size: 12px;
        background-color: var(--primary);
      }

      :host([collapsed]) aside .controls {
        opacity: 0;
      }

      aside .controls {
        transition: opacity 0.15s ease-in-out;
      }

      aside header {
        padding: 10px;
        cursor: pointer;
        user-select: none;
      }

      aside header:hover {
        background-color: var(--mono-shade2);
      }

      aside header:hover:active {
        background-color: var(--mono-shade1);
      }
    `;
  }
}

customElements.define('webgltf-viewer-controls', WebGLTFViewerControls);


