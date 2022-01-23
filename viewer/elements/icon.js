import { LitElement, html, css } from 'https://cdn.skypack.dev/lit@2.0.2';

import './icon.js';

class RevGLTFViewerIcon extends LitElement {
  static get properties() {
    return {
      name: { type: String, reflect: true },
      type: { type: String, reflect: true },
    }
  }

  static get styles() {
    return css`
      :host {
        display: inline-block;
      }
    `;
  }

  render(){
    return html`
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.13.0/css/all.min.css" rel="stylesheet">
      <i class="${this.type || 'fas'} fa-${this.name}"></i>
    `;
  }
}

customElements.define('rev-gltf-viewer-icon', RevGLTFViewerIcon);


