import { html, css } from 'https://cdn.skypack.dev/lit-element@2.4.0';
import { WebGLTFParamElement } from './param.js';

import { DEBUG_DEFINES } from 'https://cdn.jsdelivr.net/npm/webgltf/lib/renderer/programs/pbr-program.js';

class WebGLTFViewerControlDebugElement extends WebGLTFParamElement {
    static get properties() {
        return {
            debug: { type: String, reflect: true, param: true },
        }
    }

    updated(changedProperties) {
        if(changedProperties.has('debug')) {
            this.dispatchEvent(new CustomEvent('control:changed', { composed: true }));
        }
        this.dispatchEvent(new CustomEvent('control:updated', { composed: true }));
    }

    render(){
        return html`
        <webgltf-viewer-control-group name="Debug">
            ${this.getDebugSelect()}
        </webgltf-viewer-control-group>
        `;
    }

    getDebugSelect() {
        const debugModes = Object.keys(DEBUG_DEFINES).map(name => name).filter(name => name !== 'DEBUG');

        return html`
        <label for="debug">Debug</label>
        <select id="debug" @change="${(e) => this.debug = e.target.value }}">
            ${debugModes.map(name => html`
            <option ?selected="${this.debug === name}" value="${name}">${name}</option>
            `)}
        </select>
        `;
    }

    static get styles(){
        return css`
        :host {
            display: block;
            overflow: hidden;
        }
        `;
    }
}

customElements.define('webgltf-viewer-control-debug', WebGLTFViewerControlDebugElement);


