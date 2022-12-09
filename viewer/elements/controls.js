import { LitElement, html, css } from 'lit';

import './fab.js';

import { PBR_DEBUG_MODES } from 'revelryengine/renderer/lib/constants.js';

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
        const audio = this.viewer.renderer?.settings.audio || {};
        const volume = `volume${audio.muted || !audio.enabled ? '-mute' : '-high'}`;

        return html`
        ${this.getMenu()}
        <div class="status">
        ${mode ? `Render Mode: ${mode}`: ''}
        </div>
        <div class="buttons">
        <rev-gltf-viewer-icon name="question-circle" type="far" @click="${() => this.closeMenu()}"></rev-gltf-viewer-icon>
        
        <rev-gltf-viewer-icon name="cog"       @click="${() => this.openMenu('settings')}"></rev-gltf-viewer-icon>
        <rev-gltf-viewer-icon name="lightbulb" @click="${() => this.openMenu('lighting')}"></rev-gltf-viewer-icon>
        <rev-gltf-viewer-icon name="camera"    @click="${() => this.openMenu('camera')}"></rev-gltf-viewer-icon>
        <rev-gltf-viewer-icon name="cube"      @click="${() => this.openMenu('model')}"></rev-gltf-viewer-icon>
        <rev-gltf-viewer-icon name="${volume}" @click="${() => this.openMenu('volume')}"></rev-gltf-viewer-icon>

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
            
            case 'camera': {
                const value = this.viewer.gltfSample.nodes[this.viewer.cameraId]?.camera ? this.viewer.gltfSample.nodes[this.viewer.cameraId].name || `#${this.viewer.cameraId}` : 'Orbit Camera';
                content = html`
                ${this.getSubMenuItem('camera>camera', 'Camera', value)}
                ${this.getSubMenuItem('camera>lens',   'Lens Effect', this.viewer.useLens ? 'On': 'Off')}
                `;
                break;
            }
            
            case 'camera>camera': {
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

            case 'camera>lens': {
                const lens = this.viewer.renderer.settings.lens;
                content = html`
                ${this.getBackMenuItem('Lens Effect')}
                <div class="list">
                ${this.getCheckMenuItem('On',   this.viewer.useLens, () => this.viewer.useLens = true )}
                ${this.getCheckMenuItem('Off', !this.viewer.useLens, () => this.viewer.useLens = false )}
                </div>
                ${this.getSliderMenuItem('Lens Size (mm)',            1, 1.0,  100, lens.size,        (e) => lens.size  = parseFloat(e.target.value))}
                ${this.getSliderMenuItem('F Stop',                  0.1, 1.4,   22, lens.fStop,              (e) => lens.fStop = parseFloat(e.target.value))}
                ${this.getSliderMenuItem('Focal Length (mm)',         1, 1.0, 2000, lens.focalLength, (e) => lens.focalLength = parseFloat(e.target.value))}
                ${this.getSliderMenuItem('Focal Distance (meters)', 0.5, 0.5,  500, lens.focalDistance / 1000,      (e) => lens.focalDistance = parseFloat(e.target.value) * 1000)}
                `;
                break;
            }
            
            case 'lighting': {
                content = html`
                ${this.getSubMenuItem('lighting>environment',  'Environment Lighting',           this.viewer.useEnvironment ? 'On': 'Off')}
                ${this.getSubMenuItem('lighting>punctual',     'Punctual Lighting',              this.viewer.usePunctual    ? 'On': 'Off')}
                ${this.getSubMenuItem('lighting>transmission', 'Transmission',                   this.viewer.useTransmission ? 'On': 'Off')}
                ${this.getSubMenuItem('lighting>bloom',        'Bloom',                          this.viewer.useBloom       ? 'On': 'Off')}
                ${this.getSubMenuItem('lighting>ssao',         'Screen Space Ambient Occlusion', this.viewer.useSSAO        ? 'On': 'Off')}
                ${this.getSubMenuItem('lighting>shadows',      'Shadows',                        this.viewer.useShadows     ? 'On': 'Off')}
                ${this.getSubMenuItem('lighting>exposure',     'Exposure',                       this.viewer.renderer.settings.exposure)}
                ${this.getSubMenuItem('lighting>tonemap',      'Tonemap',                        this.viewer.tonemap)}
                `;
                break;
            }
            case 'lighting>exposure': {
                const { settings } = this.viewer.renderer;
                content = html`
                ${this.getBackMenuItem('Exposure')}
                ${this.getSliderMenuItem('Exposure', 0.1, 0.1, 5, settings.exposure, (e) => settings.exposure = parseFloat(e.target.value))}
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
                ${this.viewer.useEnvironment ? html`
                ${this.getSubMenuItem('lighting>environment>skybox', 'Sky Box', this.viewer.useSkybox ? 'On': 'Off')}
                `: ''}
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
            case 'lighting>environment>skybox': {
                content = html`
                ${this.getBackMenuItem('Sky Box')}
                <div class="list">
                ${this.getCheckMenuItem('On',   this.viewer.useSkybox, () => this.viewer.useSkybox = true )}
                ${this.getCheckMenuItem('Off', !this.viewer.useSkybox, () => this.viewer.useSkybox = false )}
                </div>
                ${this.getSliderMenuItem('Blur', 0.1, 0, 1, this.viewer.skyboxBlur, (e) => this.viewer.skyboxBlur = parseFloat(e.target.value))}
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
            case 'lighting>transmission': {
                content = html`
                ${this.getBackMenuItem('Transmission')}
                <div class="list">
                ${this.getCheckMenuItem('On',   this.viewer.useTransmission, () => this.viewer.useTransmission = true )}
                ${this.getCheckMenuItem('Off', !this.viewer.useTransmission, () => this.viewer.useTransmission = false )}
                </div>
                `;
                break;
            }
            case 'lighting>bloom': {
                const bloom = this.viewer.renderer.settings.bloom;
                content = html`
                ${this.getBackMenuItem('Bloom')}
                <div class="list">
                ${this.getCheckMenuItem('On',   this.viewer.useBloom, () => this.viewer.useBloom = true )}
                ${this.getCheckMenuItem('Off', !this.viewer.useBloom, () => this.viewer.useBloom = false )}
                </div>
                ${this.getSliderMenuItem('Threshold',            0.1, 0,  10, bloom.threshold,     (e) => bloom.threshold  = parseFloat(e.target.value))}
                ${this.getSliderMenuItem('Intensity',            0.1, 0,  10, bloom.intensity,     (e) => bloom.intensity = parseFloat(e.target.value))}
                ${this.getSliderMenuItem('Soft Threshold',       0.1, 0,  10, bloom.softThreshold, (e) => bloom.softThreshold = parseFloat(e.target.value))}
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
                ${this.getSubMenuItem('settings>mode',        'Graphics Mode',  this.viewer.forceWebGL2 ? 'WebGL2': 'WebGPU')}
                ${this.getSubMenuItem('settings>scale',       'Render Scale',   this.viewer.renderScale || 1)}
                ${this.getSubMenuItem('settings>grid',        'Reference Grid', this.viewer.useGrid ? 'On': 'Off')}
                ${this.getSubMenuItem('settings>fog',         'Fog',            this.viewer.useFog ? 'On': 'Off')}
                ${this.getSubMenuItem('settings>motion-blur', 'Motion Blur',    this.viewer.useMotionBlur ? 'On': 'Off')}
                ${this.getSubMenuItem('settings>aa',          'Anti-Aliasing',  this.viewer.aaMethod || 'None')}
                ${this.getSubMenuItem('settings>fps',         'Show Stats',     this.viewer.showStats ? 'On': 'Off')}
                ${this.getSubMenuItem('settings>debug',       'Debug',          this.viewer.debugPBR || 'None')}
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
                const grid = this.viewer.renderer.settings.grid;
                content = html`
                ${this.getBackMenuItem('Reference Grid')}
                <div class="list">
                ${this.getCheckMenuItem('On',   this.viewer.useGrid, () => this.viewer.useGrid = true )}
                ${this.getCheckMenuItem('Off', !this.viewer.useGrid, () => this.viewer.useGrid = false )}
                </div>
                ${this.getSliderMenuItem('Increment', 1, -3, 2, Math.log10(grid.increment), (e) => grid.increment = 10 ** parseFloat(e.target.value), grid.increment.toFixed(3))}
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
                ${this.getSliderMenuItem('Min', 1, 0, 100, fog.range[0], (e) => fog.range[0] = parseFloat(e.target.value))}
                ${this.getSliderMenuItem('Max', 5, fog.range[0], 500, Math.max(fog.range[0], fog.range[1]), (e) => fog.range[1] = parseFloat(e.target.value))}
                `;
                break;
            }

            case 'settings>motion-blur': {
                const motionBlur = this.viewer.renderer.settings.motionBlur;
                content = html`
                ${this.getBackMenuItem('Motion Blur')}
                <div class="list">
                ${this.getCheckMenuItem('On',   this.viewer.useMotionBlur, () => this.viewer.useMotionBlur = true )}
                ${this.getCheckMenuItem('Off', !this.viewer.useMotionBlur, () => this.viewer.useMotionBlur = false )}
                </div>
                ${this.getSliderMenuItem('Scale', 0.1, 0, 1, motionBlur.scale, (e) => motionBlur.scale = parseFloat(e.target.value))}
                `;
                break;
            }

            case 'settings>aa': {
                content = html`
                ${this.getBackMenuItem('Anti-Aliasing')}
                <div class="list">
                ${this.getCheckMenuItem('None',     this.viewer.aaMethod === 'None',     () => this.viewer.aaMethod = 'None' )}
                ${this.getCheckMenuItem('MSAA',     this.viewer.aaMethod === 'MSAA',     () => this.viewer.aaMethod = 'MSAA' )}
                ${this.getCheckMenuItem('TAA',      this.viewer.aaMethod === 'TAA',      () => this.viewer.aaMethod = 'TAA' )}
                ${this.getCheckMenuItem('MSAA+TAA', this.viewer.aaMethod === 'MSAA+TAA', () => this.viewer.aaMethod = 'MSAA+TAA' )}
                </div>
                
                ${this.viewer.aaMethod.includes('MSAA') ? html`
                ${this.getSubMenuItem('settings>aa>msaa-samples', 'MSAA Samples', this.viewer.msaaSamples)}
                ` :''}
                `;
                break;
            }

            case 'settings>aa>msaa-samples': {
                content = html`
                ${this.getBackMenuItem('MSAA Samples')}
                <div class="list">
                ${this.getCheckMenuItem('2', this.viewer.msaaSamples === 2, () => this.viewer.msaaSamples = 2 )}
                ${this.getCheckMenuItem('4', this.viewer.msaaSamples === 4, () => this.viewer.msaaSamples = 4 )}
                </div>
                `;
                break;
            }

            case 'settings>fps': {
                content = html`
                ${this.getBackMenuItem('Show FPS')}
                <div class="list">
                ${this.getCheckMenuItem('On',  this.viewer.showStats, () => this.viewer.showStats = true )}
                ${this.getCheckMenuItem('Off', !this.viewer.showStats, () => this.viewer.showStats = false )}
                </div>
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

            case 'volume': {
                const { audio } = this.viewer.renderer.settings;
                content = html`
                <div class="list">
                ${this.getCheckMenuItem('On',   this.viewer.useAudio, () => this.viewer.useAudio = true )}
                ${this.getCheckMenuItem('Off', !this.viewer.useAudio, () => this.viewer.useAudio = false )}
                </div>
                ${this.getSliderMenuItem('Volume', 1, 0, 100, audio.volume * 100, (e) => audio.volume = parseFloat(e.target.value) / 100)}
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
    
    getSliderMenuItem(label, step, min, max, value, action, display) {
        return html`
        <div class="item slider">
        <div class="label">${label}</div>
        <input type="range" step="${step}" min="${min}" max="${max}" value="${value}" @input="${(e) => action(e) && this.update()}"/><output>${display || value.toFixed(2)}</output>
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
            user-select: none;
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
        
        .menu .item.slider output {
            min-width: 7ch;
            text-align: right;
        }
        `;
    }
}

customElements.define('rev-gltf-viewer-controls', RevGLTFViewerControls);


