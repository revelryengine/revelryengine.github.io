import { html, css } from 'https://cdn.skypack.dev/lit-element@2.4.0';
import { WebGLTFParamElement } from './param.js';

import { Environment } from 'https://cdn.jsdelivr.net/npm/webgltf/lib/renderer/environment.js';
import index from 'https://cdn.jsdelivr.net/gh/webgltf/webgltf-sample-models@main/environments/index.js';

const environments = index.filter(({ res }) => res === 256);

class WebGLTFViewerControlLightingElement extends WebGLTFParamElement {
  static get properties() {
    return {
      punctualoff: { type: Boolean, reflect: true, param: true },
      ssaooff:     { type: Boolean, reflect: true, param: true },
      ibloff:      { type: Boolean, reflect: true, param: true },
      ibl:         { type: String,  reflect: true, param: true },
      loading:     { type: Boolean, reflect: true },
    }
  }

  connectedCallback(){
    super.connectedCallback();
    this.ibl = environments.find(({ name }) => name === this.ibl) ? this.ibl : 'Round Platform';
  }

  updated(changedProperties) {
    if(changedProperties.has('ibl')) {
      this.loadEnvironment();
    } else if(changedProperties.has('punctualoff') || changedProperties.has('ssaooff')) {
      this.dispatchEvent(new CustomEvent('control:changed', { composed: true }));
    }
    this.dispatchEvent(new CustomEvent('control:updated', { composed: true }));
  }

  render(){
    const env = environments.find(({ name }) => name === this.ibl) || {};
    const { screenshot, source } = env;
    const img = screenshot ? html`<span>Screenshot</span><span class="screenshot"><img width="100%" src="${screenshot}"></span>` : '';
    const link = source ? html`<span>Source</span><a href="${source}" target="_blank">${source}</a>` : '';

    return html`
      <webgltf-viewer-control-group name="Lighting">
        <label for="ibl">Image Based Lighting</label>
        ${this.getIBLSelect()}
        ${img}
        ${link}
        <label for="punctual">Punctual Lighting</label>
        <input id="punctual" type="checkbox" ?checked=${!this.punctualoff} @change="${(e) => this.punctualoff = !e.target.checked }"/>
        <label for="ssao">SSAO</label>
        <input id="ssao" type="checkbox" ?checked=${!this.ssaooff} @change="${(e) => this.ssaooff = !e.target.checked }"/>
      </webgltf-viewer-control-group>
    `;
  }

  getIBLSelect() {
    return html`
      <select id="ibl" @change="${(e) => this.ibl = e.target.value }}">
        ${environments.map(({ name }) => html`
          <option ?selected="${this.ibl === name}" value="${name}">${name}</option>
        `)}
        <option ?selected="${this.ibl === 'None'}" value="">None</option>
      </select>
    `;
  }

  async loadEnvironment() {
    this.loading = true;
    const gltf = environments.find(({ name }) => name === this.ibl)?.gltf;
    this.environment = gltf ? await Environment.load(gltf) : null;
    this.loading = false;
    this.dispatchEvent(new CustomEvent('control:changed', { composed: true }));
  }

  static get styles(){
    return css`
      :host {
        display: block;
        overflow: hidden;
      }

      a {
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
        color: var(--primary-text);
      }

      a:hover {
        color: var(--primary-dark);
      }

      a:visited {
        color: var(--primary-text);
      }

      .screenshot {
        text-align: center;
      }
    `;
  }
}

customElements.define('webgltf-viewer-control-lighting', WebGLTFViewerControlLightingElement);


