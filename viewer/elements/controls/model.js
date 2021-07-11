import { html, css } from 'https://cdn.skypack.dev/lit-element@2.4.0';
import { WebGLTFParamElement } from './param.js';

import { WebGLTF } from 'https://cdn.jsdelivr.net/npm/webgltf/lib/webgltf.js';
import index from 'https://cdn.jsdelivr.net/gh/webgltf/webgltf-sample-models@main/index.js';

const samples = [];
for(const sample of index) {
  if(sample.group !== samples[samples.length - 1]?.group) {
    samples.push({ name: `── ${sample.group} Sample Models ──`, disabled: true });
  }
  samples.push(sample);
}

class WebGLTFViewerControlModelElement extends WebGLTFParamElement {
  static get properties() {
    return {
      sample:   { type: String,  reflect: true, param: true },
      variant:  { type: String,  reflect: true, param: true },
      material: { type: String,  reflect: true, param: true },
      loading:  { type: Boolean, reflect: true },
    }
  }
  connectedCallback(){
    super.connectedCallback();
    this.sample = this.getSample() ? this.sample : 'SciFiHelmet';
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if(this.abortController) this.abortController.abort();
  }

  updated(changedProperties) {
    if(changedProperties.has('sample') || changedProperties.has('variant')) {
      this.loadModel();
    }
    this.dispatchEvent(new CustomEvent('control:updated', { composed: true }));
  }

  render(){
    const sample = this.getSample();
    const { screenshot, source } = sample;

    const img = screenshot ? html`<span>Screenshot</span><span class="screenshot"><img width="100%" src="${screenshot}"></span>` : '';
    const link = source ? html`<span>Source</span><a href="${source}" target="_blank">${source}</a>` : '';

    return html`
      <webgltf-viewer-control-group name="Model">
        ${this.getSampleSelect()}
        ${this.getSampleVariantSelect()}
        ${this.getSampleMaterialVariantsSelect()}
        ${img}
        ${link}
      </webgltf-viewer-control-group>
    `;
  }

  getSample() {
    return samples.find(({ name }) => name === this.sample);
  }

  getSampleSelect() {
    const selectedSample = this.getSample().name;
    return html`
      <label for="sample">Sample</label>
      <select id="sample" @change="${(e) => this.sample = e.target.value}">
        ${samples.map(({ name, disabled }) => {
          return html`<option ?disabled="${disabled}" ?selected="${selectedSample === name}" value="${name}">${name}</option>`;
        })}
      </select>
    `;
  }

  getSampleVariantSelect() {
    const sample = this.getSample();
    const variants = Object.keys(sample.variants);
    const selectedVariant = sample.variants[this.variant] ? this.variant : variants[0];

    return html`
      <label for="variant">Variant</label>
      <select id="variant" @change="${(e) => this.variant = e.target.value }}">
        ${variants.map(name => html`
          <option ?selected="${selectedVariant === name}" value="${name}">${name}</option>
        `)}
      </select>
    `;
  }

  getSampleMaterialVariantsSelect() {
    const materialVariants = this.webgltf?.extensions?.KHR_materials_variants?.variants;
    const selectedMaterial = materialVariants?.find(({ name }) => name === this.material)?.name || '';

    return materialVariants ? html`
      <label for="material">Material</label>
      <select id="material" @change="${(e) => this.material = e.target.value }}">
        <option ?selected="${selectedMaterial === ""}" value="">Default</option>
        ${materialVariants.map(({ name }) => html`
          <option ?selected="${selectedMaterial === name}" value="${name}">${name}</option>
        `)}
      </select>
    ` : '';
  }

  async loadModel() {
    this.loading = true;
    this.error = false;

    const sample = this.getSample();
    const source = sample.variants[this.variant] ? sample.variants[this.variant] : sample.variants[Object.keys(sample.variants)[0]];

    try {
      if(this.abortController) this.abortController.abort();
      this.abortController = new AbortController();

      this.webgltf = await WebGLTF.load(source, this.abortController);

      console.log(this.webgltf);
    } catch(e) {
      if(e.name !== 'AbortError') {
        this.error = e.message;
        console.trace(e);
      }
    }
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

customElements.define('webgltf-viewer-control-model', WebGLTFViewerControlModelElement);


