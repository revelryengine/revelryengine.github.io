import { html, css       } from 'lit';
import Stats from 'stats';

import { RevParamElement } from './param.js';

import { Renderer          } from 'revelryengine/renderer/lib/renderer.js';
import { CanvasAutoResizer } from 'revelryengine/renderer/lib/utils.js';
import { mat4              } from 'revelryengine/renderer/deps/gl-matrix.js';

import { GLTF, Node                } from 'revelryengine/gltf/lib/gltf.js';
import { KHRLightsPunctualLight    } from 'revelryengine/gltf/lib/extensions/KHR_lights_punctual.js';
import { KHRLightsEnvironmentScene } from 'revelryengine/gltf/lib/extensions/KHR_lights_environment.js';

import samplesIndex from 'revelryengine/sample-models/index.js';
import envIndex     from 'revelryengine/sample-environments/index.js';

import './controls.js';
import './camera.js';
import './toast.js';
// import './vr.js';

import 'revelryengine/renderer/lib/render-paths/wireframe/wireframe.js';
import 'revelryengine/renderer/lib/render-paths/preview/preview.js';
import 'revelryengine/renderer/lib/render-paths/solid/solid.js';

await Renderer.requestDevice();

const defaultRenderScale = Math.max(0.5, 1 / window.devicePixelRatio);

class RevGLTFViewerElement extends RevParamElement  {
    #abortSample = null;
    #abortEnv    = null;

    #stats;
    static get properties() {
        return {
            loading:       { type: Boolean, reflect: true },
            unsupported:   { type: Boolean },

            loadingSample: { type: Boolean },
            loadingEnv:    { type: Boolean },
            
            canvas:        { type: Object },
            gltfSample:    { type: Object },
            gltfEnv:       { type: Object },
            
            forceWebGL2:    { type: Boolean, param: true, default: false },
            renderPath:     { type: String, param: true, default: 'standard'},

            alphaBlendMode:  { type: String, param: true, default: 'ordered'},
            
            useTransmission: { type: Boolean, param: true, default: true  },
            useAudio:        { type: Boolean, param: true, default: true  },
            useEnvironment:  { type: Boolean, param: true, default: true  },
            useSkybox:       { type: Boolean, param: true, default: true  },
            usePunctual:     { type: Boolean, param: true, default: true  },
            useBloom:        { type: Boolean, param: true, default: false },
            useSSAO:         { type: Boolean, param: true, default: false },
            useShadows:      { type: Boolean, param: true, default: true  },

            useGrid:         { type: Boolean, param: true, default: false },
            useFog:          { type: Boolean, param: true, default: false },
            useMotionBlur:   { type: Boolean, param: true, default: false },
            useLens:         { type: Boolean, param: true, default: false },


            aaMethod:       { type: String, param: true, default: 'msaa' },
            msaaSamples:    { type: Number, param: true, default: 4      },
            renderScale:    { type: Number, param: true, default: defaultRenderScale },
            skyboxBlur:     { type: Number, param: true, default: 0.5 },
            
            sample:        { type: String, param: true, default: 'SciFiHelmet' },
            variant:       { type: String, param: true, default: 'glTF' },
            material:      { type: String, param: true, default: '' },

            envSample:           { type: String,  param: true, default: 'Quattro Canti' },
            envFormat:           { type: String,  param: true, default: 'rgb9e5ufloat'  },
            envDeriveIrradiance: { type: Boolean, param: true, default: false           },

            tonemap:     { type: String, param: true, default: '' },
            
            cameraId:    { type: Number, param: true, default: -1 },
            sceneId:     { type: Number, param: true, default: -1 },
            
            showStats:   { type: Boolean, param: true, default: false  },
            debugPBR:    { type: String,  param: true, default: 'None' },
            debugAABB:   { type: Boolean, param: true, default: false  },
        }
    }
    
    constructor() {
        super();

        this.canvas   = document.createElement('canvas');
        this.camera   = document.createElement('rev-gltf-viewer-camera');
        this.controls = document.createElement('rev-gltf-viewer-controls');
        this.toast    = document.createElement('rev-gltf-viewer-toast');
        
        this.camera.addEventListener('pointerdown', () => {
            this.controls.closeMenu();
        });
        
        self.addEventListener('keydown', (e) => {
            if(e.key === 'PageDown') {
                const index = this.samples.findIndex(({ name }) => name === this.sample);
                const next  = this.samples[(index + 1) % this.samples.length];
                this.sample = next.name;
                e.preventDefault();
            } else if(e.key === 'PageUp') {
                const index = this.samples.findIndex(({ name }) => name === this.sample);
                const prev  = this.samples[index < 1 ? this.samples.length - 1 : index - 1];
                this.sample = prev.name;
                e.preventDefault();
            } else if(e.key == 'e') {
                this.useEnvironment = !this.useEnvironment;
            } else if(e.key == 'p') {
                this.usePunctual = !this.usePunctual;
            } else if(e.key == 'g') {
                this.useGrid = !this.useGrid;
            } else if(e.key == 'f') {
                this.useFog = !this.useFog;
            }
        });
        
        this.samples      = samplesIndex;
        this.environments = envIndex;
        
        this.defaultLights = [
            new Node({
                matrix: mat4.fromRotation(mat4.create(), Math.PI / 4, [-1, 1, 0]),
                extensions: {
                    KHR_lights_punctual: { 
                        light: new KHRLightsPunctualLight({ type: 'directional', intensity: 2 })
                    }
                }
            }),
        ];

        this.defaultEnvironment = {
            irradianceCoefficients: [ //Quattro Canti
                new Float32Array([ 1.6842093, 1.9152059, 2.7332558]),
                new Float32Array([ 1.2791452, 1.5860805, 2.4953382]),
                new Float32Array([-0.2130158,-0.1758900,-0.2581007]),
                new Float32Array([ 0.2989670, 0.4725520, 0.7639449]),
                new Float32Array([ 0.2301868, 0.5252784, 0.9756353]),
                new Float32Array([-0.3325697,-0.2930032,-0.4379021]),
                new Float32Array([-0.4870316,-0.6346348,-1.0424628]),
                new Float32Array([ 0.3440121, 0.3180480, 0.2901741]),
                new Float32Array([-0.1153576,-0.3432447,-0.8736377]),
            ],
            extras: { sample: true }
        }
    }

    get settings() {
        return {
            standard:  this.renderer?.renderPaths.standard.settings,
            solid:     this.renderer?.renderPaths.solid.settings,
            preview:   this.renderer?.renderPaths.preview.settings,
            wireframe: this.renderer?.renderPaths.wireframe.settings,
        };
    }

    #defaultSettings = {
        standard:  structuredClone(Renderer.renderPathRegistry.get('standard').Settings.defaults),
        solid:     structuredClone(Renderer.renderPathRegistry.get('solid').Settings.defaults),
        preview:   structuredClone(Renderer.renderPathRegistry.get('preview').Settings.defaults),
        wireframe: structuredClone(Renderer.renderPathRegistry.get('wireframe').Settings.defaults),
    };

    get defaultSettings() {
        return this.#defaultSettings;
    }
    
    createRenderer() {
        try {
            cancelAnimationFrame(this.requestId);
            this.renderer?.destroy();

            const settings = {
                forceWebGL2 : this.forceWebGL2,
                target: this.canvas,
                renderPathSettings: this.reconcileSettings(this.defaultSettings)
            }

            console.log('Creating Renderer', settings);
            
            const renderer = new Renderer(settings);
            
            this.renderer = renderer;
            this.frustum  = this.renderer.createFrustum();

            // this.vrControl = document.createElement('rev-gltf-vr-control');
            // this.vrControl.viewer = this;
            
            this.camera.renderer = this.renderer; //change this to set settings only
            this.controls.update();

            this.initSample();

            this.requestId = requestAnimationFrame(t => this.renderGLTF(t));
        } catch(e) {
            console.warn(e);
            this.unsupported = true;
        }
    }

    #autoResizer;
    async connectedCallback() {
        super.connectedCallback();

        await Renderer.requestDevice();

        this.createRenderer();

        const { canvas, renderScale } = this;
        
        this.#autoResizer = new CanvasAutoResizer({ canvas, renderScale, onresize: () => {
            this.renderer.reconfigure(this.settings);
        }});
    }
    
    disconnectedCallback() {
        super.disconnectedCallback();
        cancelAnimationFrame(this.requestId);
        this.#autoResizer.stop();
    }
    
    updated(changedProperties) {
        super.updated(changedProperties);
        
        if(changedProperties.has('alphaBlendMode') 
            || changedProperties.has('useTransmission') 
            || changedProperties.has('useAudio') 
            || changedProperties.has('useEnvironment')
            || changedProperties.has('useSkybox') 
            || changedProperties.has('usePunctual')
            || changedProperties.has('useBloom') 
            || changedProperties.has('useSSAO') 
            || changedProperties.has('useShadows')
            || changedProperties.has('useGrid')
            || changedProperties.has('useFog')
            || changedProperties.has('useMotionBlur')
            || changedProperties.has('useLens')
            || changedProperties.has('tonemap')
            || changedProperties.has('aaMethod')
            || changedProperties.has('msaaSamples')
            || changedProperties.has('skyboxBlur')
            || changedProperties.has('debugPBR')
            || changedProperties.has('debugAABB')) {
            if(this.renderer) {
                this.renderer.reconfigure(this.reconcileSettings(this.settings));
            }
        }

        if(changedProperties.has('sample') || changedProperties.has('variant')) {
            this.loadSample();
        }

        if(changedProperties.has('envSample') || changedProperties.has('envFormat') || changedProperties.has('envDeriveIrradiance')) {
            this.loadEnvironment();
        }
        
        if(changedProperties.has('material')) {
            this.activateMaterial();
        }
        
        if(changedProperties.has('useLens')) {
            //if(this.useLens) this.toast.addMessage(html`Depth of Field enabled.<br>Click/Tap to set focus distance.`, 5000);
        }
        
        
        if(changedProperties.has('forceWebGL2')) {
            if(this.renderer) {
                const canvas  = document.createElement('canvas');
                canvas.width  = this.canvas.width;
                canvas.height = this.canvas.height;

                this.canvas = canvas;
                this.createRenderer();

                this.#autoResizer?.stop();
                this.#autoResizer = new CanvasAutoResizer({ canvas, renderScale: this.renderScale, onresize: () => {
                    this.renderer.reconfigure({ standard: this.settings });
                }});
            }
        }

        if(changedProperties.has('showStats')) {
            this.#stats = this.showStats ? new Stats() : null;
            this.update();
        }

        if(changedProperties.has('renderScale') && this.#autoResizer) {
            this.#autoResizer.renderScale = this.renderScale;
        }
        
        this.controls.update();
    }

    reconcileSettings(settings) {
        const { standard } = settings;

        standard.alphaBlendMode       = this.alphaBlendMode ?? 'ordered';
        standard.transmission.enabled = this.useTransmission;
        standard.audio.enabled        = this.useAudio;
        standard.environment.enabled  = this.useEnvironment;
        standard.skybox.enabled       = this.useSkybox;
        standard.punctual.enabled     = this.usePunctual;
        standard.shadows.enabled      = this.useShadows;
        standard.fog.enabled          = this.useFog;
        standard.motionBlur.enabled   = this.useMotionBlur;
        standard.ssao.enabled         = this.useSSAO;
        standard.lens.enabled         = this.useLens;
        standard.bloom.enabled        = this.useBloom;
        standard.tonemap              = this.tonemap;
        standard.skybox.blur          = this.skyboxBlur;
        standard.debug = {
            pbr:  { enabled: this.debugPBR !== 'None', mode: this.debugPBR },
            aabb: { enabled: this.debugAABB },
        }

        for(const path of Object.values(settings)) {
            path.grid.enabled = this.useGrid;
            switch(this.aaMethod) {
                case 'msaa': 
                    path.msaa.enabled = true;
                    break;
                case 'taa':
                    path.taa.enabled  = true;
                    path.msaa.enabled = false;
                    break;
                case 'msaa+taa':
                    path.msaa.enabled = true;
                    path.taa.enabled  = true;
                    break;
                default:
                    path.taa.enabled  = false;
                    path.msaa.enabled = false;
            }
    
            path.msaa.samples = this.msaaSamples;
            
        }

        return settings;
    }
    
    render(){
        if(this.unsupported) {
            console.log('Not supported');
            return html`<p>Your browser may not support WebGPU or WebGL2</p>`;
        }
        
        this.loading = !!(this.loadingSample || this.loadingEnv);

        return html`
        ${this.#stats?.dom ?? ''}
        ${this.camera}
        ${this.canvas}
        ${this.vrControl}
        ${this.controls}
        ${this.toast}
        <div class="loader"><rev-gltf-viewer-icon name="spinner"></rev-gltf-viewer-icon> Loading</div>
        `;
    }
    
    renderGLTF(hrTime) {
        this.#stats?.begin();

        if (this.gltfSample) {
            const frameDeltaTime = hrTime - this.lastRenderTime;
            this.animators?.forEach(animator => {
                animator.update(frameDeltaTime);
                animator.targets.nodes && this.graph.updateNodes(animator.targets.nodes);
                animator.targets.materials && this.graph.updateMaterials(animator.targets.materials);
            });

            const cameraNode = this.gltfSample.nodes[this.cameraId]?.camera ? this.gltfSample.nodes[this.cameraId] : this.camera.node;
            if(this.cameraId === -1) {
                this.camera.updateInput(hrTime);
                this.graph.updateNode(cameraNode);
            }
            
            const { graph, frustum, renderPath } = this;

            this.frustum.update({ graph, cameraNode, jitter: this.settings[this.renderPath].temporal });
            this.renderer.render({ graph, frustum, renderPath });
            // if(!this.vrControl?.xrSession) this.renderer.render(scene, camera);
        }
        this.lastRenderTime = hrTime;
        
        this.#stats?.end();
        this.requestId = requestAnimationFrame(t => this.renderGLTF(t));
        
    }

    initSample() {
        if(!this.gltfSample) return;

        this.graph     = this.renderer.getSceneGraph(this.gltfSample.scene ?? this.gltfSample.scenes[0]);
        this.animators = this.gltfSample.animations.map(animation => animation.createAnimator());
        
        if(!this.graph.lights.length) {
            this.graph.scene.nodes.push(...this.defaultLights);
            this.graph.updateNodes(new Set(this.defaultLights));
        }

        if(!this.graph.scene.extensions.KHR_lights_environment) {
            this.graph.scene.extensions.KHR_lights_environment = new KHRLightsEnvironmentScene({ light: this.defaultEnvironment });
            
        }
        this.activateMaterial();
        this.initEnv();
    }
    
    initEnv() {
        if(!this.gltfSample || !this.gltfEnv) return;
        
        if(this.graph.scene.extensions.KHR_lights_environment.light.extras.sample) {
            this.graph.scene.extensions.KHR_lights_environment = new KHRLightsEnvironmentScene({ light: this.gltfEnv.extensions.KHR_lights_environment.lights[0] });
        }
    }
    
    async loadSample() {

        const sample = this.samples.find(({ name }) => name === this.sample);
        const source = sample.variants[this.variant] ? sample.variants[this.variant] : sample.variants[Object.keys(sample.variants)[0]];
        
        if(this.gltfSample?.$uri === source) return;

        try {
            this.#abortSample?.abort();
            this.#abortSample = new AbortController();

            this.loadingSample = true;

            const gltfSample = await GLTF.load(source, this.#abortSample.signal);
            await this.renderer?.preloadTextures(gltfSample.textures);

            if(gltfSample.extensions.KHR_audio) {
                if(!this.renderer.audio.context) {
                    const msg = this.toast.addMessage(html`Sample includes audio.<br>Interact with page to allow sound and finish loading.`, 3000000);
                    await this.renderer.audio.contextPromise;
                    this.toast.dismissMessage(msg);
                }
            }
            
            this.gltfSample = gltfSample;
            this.initSample();

            this.camera.resetToScene(this.graph);
            
            this.toast.addMessage(html`Drag to Rotate<br>Scroll/Pinch to Zoom`, 3000);

            console.log('Sample:', this.gltfSample);
        } catch(e) {
            if(e.name !== 'AbortError') {
                this.toast.addMessage(html`Error loading sample`, 3000);
                console.trace(e);
            }
        }
        this.loadingSample = false;
    }

    async loadEnvironment() {
        const env = this.environments.find(({ name }) => name === this.envSample);
        const source = env.formats[this.envFormat];

        try {
        
            this.#abortEnv?.abort();
            this.#abortEnv = new AbortController();

            this.loadingEnv = true;
            this.gltfEnv = await GLTF.load(source, this.#abortEnv.signal);
            this.gltfEnv.extensions.KHR_lights_environment.lights[0].extras.sample = true;

            if(this.envDeriveIrradiance) {
                delete this.gltfEnv.extensions.KHR_lights_environment.lights[0].irradianceCoefficients;
            }

            this.initEnv();

            console.log('Environment:', this.gltfEnv);
            
        } catch(e) {
            if(e.name !== 'AbortError') {
                this.toast.addMessage(html`Error loading environment`, 3000);
                console.trace(e);
            }
        }

        this.loadingEnv = false;
    }
    
    activateMaterial() {
        if(!this.material) return this.graph?.setActiveMaterialVariant(null);

        for(const variant of (this.gltfSample?.extensions?.KHR_materials_variants?.variants ?? [])){
            if(variant.name === this.material) {
                return this.graph.setActiveMaterialVariant(variant);
            }
        }
    }
    
    static get styles() {
        return css`
        :host {
            display: flex;
            position: relative;
            background: #3d3d3d; 
            width: 100%;
            height: 100%;
            align-items: center;
            justify-content: center;
            flex-grow: 1;
            box-sizing: border-box;
        }
        
        :host([loading]) canvas {
            filter: blur(12px);
        }
        
        :host([loading]) .loader {
            display: inline-block;
        }
        
    
        .loader {
            display: none;
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            font-size: var(--font-size-l);
            background-color: rgba(0,0,0, 0.75);
            padding: 15px;
            border-radius: 5px;
            z-index: 3;
            user-select: none;
        }
        
        .loader rev-gltf-viewer-icon {
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
        
        rev-gltf-viewer-camera {
            z-index: 1;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            touch-action: none;
            line-height: 24px;
        }
        
        rev-gltf-viewer-controls {
            z-index: 2;
        }
        
        rev-gltf-viewer-toast {
            z-index: 4;
            position: absolute;
            left: 0;
            right: 0;
            bottom: 20vh;
        }

        .fps {
            position: absolute;
            top: 0px;
            left: 0px;
            background: rgba(0,0,0, 0.75);
            padding: 5px;
        }
        `;
    }
}

customElements.define('rev-gltf-viewer', RevGLTFViewerElement);
