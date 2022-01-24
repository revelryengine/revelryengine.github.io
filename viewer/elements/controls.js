import { LitElement, html, css } from 'https://cdn.skypack.dev/lit@2.0.2';

import './fab.js';

import { PBR_DEBUG_MODES } from 'https://cdn.jsdelivr.net/gh/revelryengine/renderer/lib/constants.js';

class RevGLTFViewerControls extends LitElement {
    static get properties() {
        return {
            hidden:     { type: Boolean, reflect: true },
            fullscreen: { type: Boolean },
            menu:       { type: String  },
            menus:      { type: Array   },
        }
    }
    
    connectedCallback() {
        super.connectedCallback();
        this.viewer = this.parentNode.host;
        this.menu = '';
    }
    
    render() {
        const mode = this.viewer.renderer?.mode;
        return html`
        ${this.getMenu()}
        <div class="status">
        ${mode ? `Render Mode: ${mode}`: ''}
        </div>
        <div class="buttons">
        <rev-gltf-viewer-icon name="question-circle" type="far" @click="${() => this.closeMenu()}"></rev-gltf-viewer-icon>
        
        <rev-gltf-viewer-icon name="cog"         @click="${() => this.openMenu('settings')}"></rev-gltf-viewer-icon>
        <rev-gltf-viewer-icon name="lightbulb"   @click="${() => this.openMenu('lighting')}"></rev-gltf-viewer-icon>
        <rev-gltf-viewer-icon name="street-view" @click="${() => this.openMenu('navigation')}"></rev-gltf-viewer-icon>
        <rev-gltf-viewer-icon name="cube"        @click="${() => this.openMenu('model')}"></rev-gltf-viewer-icon>
        
        <rev-gltf-viewer-icon name="vr-cardboard" @click="${this.toggleXR}" disabled></rev-gltf-viewer-icon>
        <rev-gltf-viewer-icon name="${this.fullscreen ? 'compress': 'expand'}" @click="${this.toggleFullscreen}"></rev-gltf-viewer-icon>
        </div>
        `;
    }
    
    toggleFullscreen() {
        this.fullscreen = !this.fullscreen;
        if(this.fullscreen) {
            this.viewer.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
    
    toggleXR() {
        
    }
    
    openMenu(menu) {
        if(this.menu === menu) this.closeMenu();
        else this.menu = menu;
    }
    
    closeMenu() {
        this.menu = '';
    }
    
    getMenu() {
        const pages = this.menu.split('>').reduce((accum, value) => {
            return accum.concat(accum.length ? (accum[accum.length - 1] + '>' + value) : value)
        }, []).map(page => this.getMenuPage(page));
        
        return html`
        <div class="menu" ?open="${this.menu}">
        ${pages}
        </div>`;
    }
    
    getMenuPage(page) {
        const { sample, variant, material } = this.viewer;
        const materials = this.viewer.gltfSample?.extensions?.KHR_materials_variants?.variants;
        
        let content = '';
        switch(page) {
            case 'model': {
                content = html`
                ${this.getSubMenuItem('model>sample',   'Sample',   sample)}
                ${this.getSubMenuItem('model>variant',  'Variant',  variant)}
                ${materials?.length ? this.getSubMenuItem('model>material', 'Material', material) : ''}
                ${this.getSubMenuItem('model>details',  'Details')}
                `;
                break;
            }
            case 'model>sample': {
                content = html`
                ${this.getBackMenuItem('Sample')}
                ${this.getSubMenuItem('model>sample>khronos', 'Khronos Samples')}
                ${this.getSubMenuItem('model>sample>revelry', 'Revelry Engine Samples')}
                `;
                break;
            }
            case 'model>sample>khronos': {
                content = html`
                ${this.getBackMenuItem('Khronos Samples')}
                <div class="list">
                ${this.viewer.samples.filter(({ group }) => group === 'Khronos').map(({ name }) => {
                    const checked = this.viewer.sample === name;
                    return this.getCheckMenuItem(name, checked, () => this.viewer.sample = name);
                })}
                </div>
                
                `;
                break;
            }
            case 'model>sample>revelry': {
                content = html`
                ${this.getBackMenuItem('Revelry Engine Samples')}
                <div class="list">
                ${this.viewer.samples.filter(({ group }) => group === 'Revelry Engine').map(({ name }) => {
                    const checked = this.viewer.sample === name;
                    return this.getCheckMenuItem(name, checked, () => this.viewer.sample = name);
                })}
                </div>
                `;
                break;
            }
            case 'model>variant': {
                const sample = this.viewer.samples.find(({ name }) => name === this.viewer.sample);
                content = html`
                ${this.getBackMenuItem('Variant')}
                <div class="list">
                ${Object.keys(sample.variants).map((name) => {
                    const checked = this.viewer.variant === name;
                    return this.getCheckMenuItem(name, checked, () => this.viewer.variant = name);
                })}
                </div>
                `;
                break;
            }
            case 'model>material': {
                content = html`
                ${this.getBackMenuItem('Material')}
                <div class="list">
                ${this.getCheckMenuItem('Default', this.viewer.material === '', () => this.viewer.material = '')}
                ${materials?.map(({ name }) => {
                    const checked = this.viewer.material === name;
                    return this.getCheckMenuItem(name, checked, () => this.viewer.material = name);
                })}
                </div>
                `;
                break;
            }
            case 'model>details': {
                const sample = this.viewer.samples.find(({ name }) => name === this.viewer.sample);
                const { screenshot, source } = sample;
                const img = screenshot ? html`<img src="${screenshot}" class="screenshot" >` : '';
                const link = source ? html`<a href="${source}" target="_blank" class="source">Source</a>` : '';
                content = html`
                ${this.getBackMenuItem('Details')}
                ${img}
                ${link}
                `;
                break;
            }
            
            case 'navigation': {
                const value = this.viewer.gltfSample.nodes[this.viewer.cameraId]?.camera ? this.viewer.gltfSample.nodes[this.viewer.cameraId].name || `#${this.viewer.cameraId}` : 'Orbit Camera';
                content = html`
                ${this.getSubMenuItem('navigation>camera', 'Camera', value)}
                `;
                break;
            }
            
            case 'navigation>camera': {
                let cameras = this.viewer.gltfSample ? this.viewer.gltfSample.nodes.filter((node) => node.camera) : [];
                
                cameras = [
                    { id: -1, node: { name: 'Orbit Camera'} },
                    ...cameras.map((node) => ({ id: this.viewer.gltfSample.nodes.indexOf(node), node })),
                ];
                
                content = html`
                ${this.getBackMenuItem('Camera')}
                <div class="list">
                ${cameras.map(({ id, node }) => {
                    const checked = this.viewer.cameraId === id;
                    return this.getCheckMenuItem(node.name || `#${id}`, checked, () => this.viewer.cameraId = id);
                })}
                </div>
                
                `;
                break;
            }
            
            case 'lighting': {
                content = html`
                ${this.getSubMenuItem('lighting>environment', 'Environment Lighting',           this.viewer.useEnvironment ? 'On': 'Off')}
                ${this.getSubMenuItem('lighting>punctual',    'Punctual Lighting',              this.viewer.usePunctual    ? 'On': 'Off')}
                ${this.getSubMenuItem('lighting>bloom',       'Bloom',                          this.viewer.useBloom       ? 'On': 'Off', 'disabled')}
                ${this.getSubMenuItem('lighting>ssao',        'Screen Space Ambient Occlusion', this.viewer.useSSAO        ? 'On': 'Off', 'disabled')}
                ${this.getSubMenuItem('lighting>shadows',     'Shadows',                        this.viewer.useShadows     ? 'On': 'Off', 'disabled')}
                ${this.getSubMenuItem('lighting>tonemap',     'Tonemap',                        this.viewer.tonemap)}
                `;
                break;
            }
            case 'lighting>environment': {
                content = html`
                ${this.getBackMenuItem('Environment Lighting')}
                <div class="list">
                ${this.getCheckMenuItem('On',   this.viewer.useEnvironment, () => this.viewer.useEnvironment = true )}
                ${this.getCheckMenuItem('Off', !this.viewer.useEnvironment, () => this.viewer.useEnvironment = false )}
                </div>
                ${this.getSubMenuItem('lighting>environment>environment', 'Environment', this.viewer.environment)}
                `;
                break;
            }
            case 'lighting>environment>environment': {
                content = html`
                ${this.getBackMenuItem('Environment')}
                <div class="list">
                ${this.viewer.environments.map(({ name }) => {
                    const checked = this.viewer.environment === name;
                    return this.getCheckMenuItem(name, checked, () => this.viewer.environment = name);
                })}
                </div>
                `;
                break;
            }
            case 'lighting>punctual': {
                content = html`
                ${this.getBackMenuItem('Punctual Lighting')}
                <div class="list">
                ${this.getCheckMenuItem('On',   this.viewer.usePunctual, () => this.viewer.usePunctual = true )}
                ${this.getCheckMenuItem('Off', !this.viewer.usePunctual, () => this.viewer.usePunctual = false )}
                </div>
                `;
                break;
            }
            case 'lighting>bloom': {
                content = html`
                ${this.getBackMenuItem('Bloom')}
                <div class="list">
                ${this.getCheckMenuItem('On',   this.viewer.useBloom, () => this.viewer.useBloom = true )}
                ${this.getCheckMenuItem('Off', !this.viewer.useBloom, () => this.viewer.useBloom = false )}
                </div>
                `;
                break;
            }
            case 'lighting>ssao': {
                content = html`
                ${this.getBackMenuItem('Screen Space Ambient Occlusion')}
                <div class="list">
                ${this.getCheckMenuItem('On',   this.viewer.useSSAO, () => this.viewer.useSSAO = true )}
                ${this.getCheckMenuItem('Off', !this.viewer.useSSAO, () => this.viewer.useSSAO = false )}
                </div>
                `;
                break;
            }
            case 'lighting>shadows': {
                const shadows = this.viewer.renderer.settings.shadows;
                content = html`
                ${this.getBackMenuItem('Shadows')}
                <div class="list">
                ${this.getCheckMenuItem('On',   this.viewer.useShadows, () => this.viewer.useShadows = true )}
                ${this.getCheckMenuItem('Off', !this.viewer.useShadows, () => this.viewer.useShadows = false )}
                </div>
                <!-- ${this.getSliderMenuItem('Bias', 1, 0, 10, shadows.bias, (e) => shadows.bias = parseFloat(e.target.value))} -->
                ${this.getSliderMenuItem('Lambda', 0.01, 0.1, 1.0, shadows.lambda, (e) => shadows.lambda = parseFloat(e.target.value))}
                `;
                break;
            }
            case 'lighting>tonemap': {
                content = html`
                ${this.getBackMenuItem('Tonemap')}
                <div class="list">
                ${this.getCheckMenuItem('Aces Hill',                this.viewer.tonemap === 'Aces Hill',                () => this.viewer.tonemap = 'Aces Hill' )}
                ${this.getCheckMenuItem('Aces Hill Exposure Boost', this.viewer.tonemap === 'Aces Hill Exposure Boost', () => this.viewer.tonemap = 'Aces Hill Exposure Boost' )}
                ${this.getCheckMenuItem('Aces Narkowicz',           this.viewer.tonemap === 'Aces Narkowicz',           () => this.viewer.tonemap = 'Aces Narkowicz' )}
                ${this.getCheckMenuItem('Off', !this.viewer.tonemap, () => this.viewer.tonemap = '' )}
                </div>
                `;
                break;
            }
            
            case 'settings': {
                content = html`
                ${this.getSubMenuItem('settings>mode',  'Graphics Mode',  this.viewer.forceWebGL2 ? 'WebGL2': 'WebGPU')}
                ${this.getSubMenuItem('settings>scale', 'Render Scale',   this.viewer.renderScale || 1)}
                ${this.getSubMenuItem('settings>grid',  'Reference Grid', this.viewer.useGrid ? 'On': 'Off', 'disabled')}
                ${this.getSubMenuItem('settings>fog',   'Fog',            this.viewer.useFog ? 'On': 'Off' , 'disabled')}
                ${this.getSubMenuItem('settings>dof',   'Depth of Field', this.viewer.useDOF ? 'On': 'Off' ,'disabled')}
                ${this.getSubMenuItem('settings>debug', 'Debug',          this.viewer.debugPBR || 'None')}
                `;
                break;
            }
            case 'settings>mode': {
                content = html`
                ${this.getBackMenuItem('Graphics Mode')}
                <div class="list">
                ${this.getCheckMenuItem('WebGPU', !this.viewer.forceWebGL2, () => this.viewer.forceWebGL2 = false )}
                ${this.getCheckMenuItem('WebGL2',  this.viewer.forceWebGL2, () => this.viewer.forceWebGL2 = true )}
                </div>
                `;
                break;
            }
            case 'settings>scale': {
                content = html`
                ${this.getBackMenuItem('Render Scale')}
                <div class="list">
                ${this.getSliderMenuItem('Scale', 0.25, 0.25, 2, this.viewer.renderScale, (e) => this.viewer.renderScale = parseFloat(e.target.value))}
                </div>
                `;
                break;
            }
            case 'settings>grid': {
                content = html`
                ${this.getBackMenuItem('Reference Grid')}
                <div class="list">
                ${this.getCheckMenuItem('On',   this.viewer.useGrid, () => this.viewer.useGrid = true )}
                ${this.getCheckMenuItem('Off', !this.viewer.useGrid, () => this.viewer.useGrid = false )}
                </div>
                `;
                break;
            }
            case 'settings>fog': {
                const fog = this.viewer.renderer.settings.fog;
                content = html`
                ${this.getBackMenuItem('Fog')}
                <div class="list">
                ${this.getCheckMenuItem('On',   this.viewer.useFog, () => this.viewer.useFog = true )}
                ${this.getCheckMenuItem('Off', !this.viewer.useFog, () => this.viewer.useFog = false )}
                </div>
                ${this.getSliderMenuItem('Min', 1, 0, 50, fog.range[0], (e) => fog.range[0] = parseFloat(e.target.value))}
                ${this.getSliderMenuItem('Max', 5, 50, 500, fog.range[1], (e) => fog.range[1] = parseFloat(e.target.value))}
                `;
                break;
            }
            case 'settings>dof': {
                const dof = this.viewer.renderer.settings.dof;
                content = html`
                ${this.getBackMenuItem('Depth of Field')}
                <div class="list">
                ${this.getCheckMenuItem('On',   this.viewer.useDOF, () => this.viewer.useDOF = true )}
                ${this.getCheckMenuItem('Off', !this.viewer.useDOF, () => this.viewer.useDOF = false )}
                </div>
                ${this.getSliderMenuItem('Range', 0.5, 0.5, 25.0, dof.range, (e) => dof.range = parseFloat(e.target.value))}
                `;
                break;
            }
            case 'settings>debug': {
                content = html`
                ${this.getBackMenuItem('Debug')}
                ${this.getSubMenuItem('settings>debug>aabb', 'Bounding Boxes', this.viewer.debugAABB ? 'On': 'Off', 'disabled')}
                <div class="list">
                ${['None'].concat(Object.keys(PBR_DEBUG_MODES)).map((name) => {
                    return this.getCheckMenuItem(name, this.viewer.debugPBR === name, () => this.viewer.debugPBR = name)
                })}
                </div>
                `;
                break;
            }
            
            case 'settings>debug>aabb': {
                content = html`
                ${this.getBackMenuItem('Bounding Boxes')}
                <div class="list">
                ${this.getCheckMenuItem('On',   this.viewer.debugAABB, () => this.viewer.debugAABB = true )}
                ${this.getCheckMenuItem('Off', !this.viewer.debugAABB, () => this.viewer.debugAABB = false )}
                </div>
                `;
                break;
            }
        }
        return html`<div class="page" page="${page}">${content}</div>`;
    }
    
    closeSubMenu() {
        this.menu = this.menu.split('>').slice(0, -1).join('>');
    }
    
    getSubMenuItem(submenu, label, value, disabled) {
        return html`
        <div class="item submenu" ?disabled=${disabled} @click="${() => this.openMenu(submenu)}">
        <div class="label">${label}</div>
        <div class="value" title="${value}">${value}</div>
        <rev-gltf-viewer-icon name="angle-right"></rev-gltf-viewer-icon>
        </div>`;
    }
    
    getBackMenuItem(label) {
        return html`
        <div class="item back" @click="${() => this.closeSubMenu()}">
        <rev-gltf-viewer-icon name="angle-left"></rev-gltf-viewer-icon>
        <div class="label">${label}</div>
        </div>
        `;
    }
    
    getCheckMenuItem(label, checked, action) {
        return html`
        <div class="item check" @click="${action}" ?checked=${checked}>
        <rev-gltf-viewer-icon name="check"></rev-gltf-viewer-icon>
        <div class="label">${label}</div>
        </div>
        `
    }
    
    getSliderMenuItem(label, step, min, max, value, action) {
        return html`
        <div class="item slider">
        <div class="label">${label}</div>
        <input type="range" step="${step}" min="${min}" max="${max}" value="${value}" @input="${(e) => action(e)}"/><output>${value.toFixed(2)}</output>
        </div>`;
    }
    
    static get styles() {
        return css`
        :host {
            position: absolute;
            right: 0;
            bottom: 0;
            left: 0;
            background: rgba(0, 0, 0, 0.75);
            transition: opacity 0.5s ease-in-out;
            
            display: flex;
            flex-direction: row;
            padding: 12px;
        }
        
        :host([hidden]) {
            opacity: 0;
        }
        
        .status {
            flex-grow: 1;
        }
        
        .buttons {
            display: flex;
            flex-direction: row;
            justify-content: flex-end;
            gap: 16px;
        }
        
        rev-gltf-viewer-icon {
            user-select: none;
            font-size: large;
        }
        
        rev-gltf-viewer-icon:hover:not([disabled]) {
            cursor: pointer;
            color: #fff;
        }
        
        rev-gltf-viewer-icon[disabled] {
            opacity: 0.25;
        }
        
        .animation {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 16px;
        }
        
        .animation input {
            flex: 1;
            height: 3px;
            filter: grayscale(1);
        }
        
        .menu {
            position: absolute;
            margin: 12px;
            right: 0;
            bottom: 56px;
            background: rgba(0,0,0, 0.75);
            opacity: 0;
            transition: opacity 0.2s;
            user-select: none;
            
            display: flex;
            flex-direction: row;
        }
        
        .menu[open] {
            opacity: 1;
            overflow: hidden;
        }
        
        .menu .page {
            display: flex;
            flex-direction: column;
            min-width: 300px;
            /* transition: max-width 0.2s, opacity 0.2s, max-height 0.2s; */
        }
        
        .menu .item {
            padding: 16px;
            display: flex;
            flex-direction: row;
            gap: 16px;
            align-items: center;
            cursor: pointer;
        }
        
        .menu .item:hover {
            background: rgba(0,0,0,0.5);
        }
        
        .submenu .label {
            flex: 1;
        }
        
        .submenu .value {
            max-width: 150px;
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
            text-align: right;
        }
        
        .submenu[disabled] {
            pointer-events: none;
            opacity: 0.25;
        }
        
        .page:not(:last-child) {
            max-width: 0px;
            min-width: 0px;
            max-height: 0px;
            display: none;
        }
        
        .page:last-child {
            opacity: 1;
        }
        
        .page .back {
            position: sticky; 
            top: 0;
        }
        
        .page .list {
            max-height: 50vh;
            overflow: auto;
        }
        
        .page .list .item:not([checked]) rev-gltf-viewer-icon {
            opacity: 0;
        }
        
        .page .screenshot {
            max-width: 300px;
            padding: 16px;
        }
        
        .page a {
            color: inherit;
            padding: 16px;
        }
        
        .page a:hover {
            color: var(--primary-text);
        }
        
        .menu .item.slider input {
            flex: 1;
        }
        
        
        `;
    }
}

customElements.define('rev-gltf-viewer-controls', RevGLTFViewerControls);


