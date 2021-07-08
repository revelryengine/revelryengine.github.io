import { html, css } from 'https://cdn.skypack.dev/lit-element@2.4.0';
import { WebGLTFParamElement } from './param.js';

class WebGLTFViewerControlSceneElement extends WebGLTFParamElement {
  static get properties() {
    return {
      scene:   { type: Number, reflect: true, param: true },
      camera:  { type: Number, reflect: true, param: true },
      webgltf: { type: Object },
    }
  }

  updated(changedProperties) {
    if(changedProperties.has('webgltf')) {
      this.scene = this.webgltf.scenes[this.scene] ? this.scene : 0;
      this.camera = this.webgltf.nodes[this.camera]?.camera ? this.camera : -1;
    }
  }

  render(){
    return html`
      <webgltf-viewer-control-group name="Scene">
        <label for="scene">Scene</label>
        ${this.getSceneSelect()}
        <label for="camera">Camera</label>
        ${this.getCameraSelect()}
      </webgltf-viewer-control-group>
    `;
  }

  getSceneSelect() {
    const scenes = this.webgltf ? this.webgltf.scenes.map((scene) => ({ id: this.webgltf.scenes.indexOf(scene), scene })) : [];

    return html`
      <select id="camera" @change="${(e) => this.scene = e.target.value }}">
        ${scenes.map(({ id, scene }) => html`
          <option ?selected="${this.scene === id}" value="${id}">${scene.name || id}</option>
        `)}
      </select>
    `;
  }

  getCameraSelect() {
    let cameras = this.webgltf ? this.webgltf.nodes.filter((node) => node.camera) : [];

    cameras = [
      { id: -1, node: { name: 'Orbit Camera'} },
      ...cameras.map((node) => ({ id: this.webgltf.nodes.indexOf(node), node })),
    ];

    return html`
      <select id="camera" @change="${(e) => this.camera = e.target.value }}">
        ${cameras.map(({ id, node }) => html`
          <option ?selected="${this.camera === id}" value="${id}">${node.name || node.camera.name || id}</option>
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

customElements.define('webgltf-viewer-control-scene', WebGLTFViewerControlSceneElement);


