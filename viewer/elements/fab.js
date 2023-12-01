import { LitElement, html, css } from '../../deps/lit.js';

import './icon.js';

class RevGLTFViewerFAB extends LitElement {
    static get properties() {
        return {
            icon:     { type: String, reflect: true  },
            disabled: { type: Boolean, reflect: true },
        }
    }

    static get styles() {
        return css`
        :host {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 56px;
            height: 56px;
            background-color: var(--primary);
            color: var(--theme-color);
            border-radius: 56px;
            cursor: pointer;
            overflow: hidden;
            margin: 16px;
            box-shadow: var(--card-shadow-1);
            transition: all 0.3s cubic-bezier(.25,.8,.25,1);
            user-select: none;
        }

        :host(:hover) {
            background-color: var(--mono-shade2);
            box-shadow: var(--card-shadow-2);
        }

        :host(:hover:active) {
            background-color: var(--mono-shade1);
        }

        :host([disabled]) {
            cursor: default;
            pointer-events: none;
            opacity: 0.38;
            color: var(--primary-light);
        }
        `;
    }

    render(){
        return html`
        <rev-gltf-viewer-icon name="${this.icon}"></rev-gltf-viewer-icon>
        `;
    }
}

customElements.define('rev-gltf-viewer-fab', RevGLTFViewerFAB);


