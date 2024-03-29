import { html, css } from '../../deps/lit.js';
import Stats from '../../deps/stats.js';

import { RevParamElement } from './param.js';

import { Renderer          } from '../../deps/revelry.js';
import { CanvasAutoResizer } from '../../deps/revelry.js';

import { GLTF, Node             } from '../../deps/revelry.js';
import { KHRLightsPunctualLight } from '../../deps/revelry.js';
import { KHREnvironmentMapScene } from '../../deps/revelry.js';

import { samplesIndex } from '../../deps/revelry.js';
import { envIndex     } from '../../deps/revelry.js';

import { mat4 } from '../../deps/gl-matrix.js';

import './controls.js';
import './camera.js';
import './toast.js';
// import './vr.js';



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

            useAudio:        { type: Boolean, param: true, default: true  },

            usePunctual:     { type: Boolean, param: true, default: true  },
            useEnvironment:  { type: Boolean, param: true, default: true  },
            useTransmission: { type: Boolean, param: true, default: true  },
            useSkybox:       { type: Boolean, param: true, default: true  },
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
            exposure:    { type: Number, param: true, default: 1  },

            cameraId:    { type: Number, param: true, default: -1 },
            sceneId:     { type: Number, param: true, default: -1 },

            showStats:   { type: Boolean, param: true, default: false  },
            debugPBR:    { type: String,  param: true, default: 'None' },
            debugAABB:   { type: Boolean, param: true, default: false  },

            animation:   { type: String, param: true, default: '*'  },
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

        this.#autoResizer = new CanvasAutoResizer({ canvas: this.canvas, renderScale: this.renderScale, onresize: () => {
            this.reconfigure()
        }});
    }

    spectorCapture() {
        const spector = new SPECTOR.Spector();
        this.toast.addMessage(html`Capturing Render...`, 2000);
        spector.captureCanvas(this.renderer.gal.context.canvas);
        spector.onCapture.add((json) => {
            const url = URL.createObjectURL(new Blob([JSON.stringify(json)], { type: "text/json" }));
            console.log(url);
            this.toast.addMessage(html`Render Captured | <a href="${url}" download="capture.json">Download</a>`, 5000);
        });
    }

    // get settings() {
    //     return {
    //         standard:  this.renderer?.renderPaths.standard.settings,
    //         solid:     this.renderer?.renderPaths.solid.settings,
    //         preview:   this.renderer?.renderPaths.preview.settings,
    //         wireframe: this.renderer?.renderPaths.wireframe.settings,
    //     };
    // }

    // #defaultSettings = {
    //     standard:  structuredClone(Renderer.renderPathRegistry.standard.Settings.defaults),
    //     solid:     structuredClone(Renderer.renderPathRegistry.solid.Settings.defaults),
    //     preview:   structuredClone(Renderer.renderPathRegistry.preview.Settings.defaults),
    //     wireframe: structuredClone(Renderer.renderPathRegistry.wireframe.Settings.defaults),
    // };

    // get defaultSettings() {
    //     return this.#defaultSettings;
    // }

    createRenderer() {
        try {
            cancelAnimationFrame(this.requestId);
            this.renderer?.destroy();

            console.log('Creating Renderer');

            const renderer = new Renderer({ forceWebGL2 : this.forceWebGL2 });

            this.renderer = renderer;

            this.createViewport();
            this.reconfigure();

            // this.frustum  = this.renderer.createFrustum();

            // this.vrControl = document.createElement('rev-gltf-vr-control');
            // this.vrControl.viewer = this;

            // this.camera.renderer = this.renderer; //change this to set settings only

            this.controls.update();

            this.initSample();

            this.requestId = requestAnimationFrame(t => this.renderGLTF(t));
        } catch(e) {
            console.warn(e);
            this.unsupported = true;
        }
    }

    createViewport() {
        if(!this.renderer) throw new Error('Invalid state');
        this.viewport = this.renderer.createViewport({ renderPath: this.renderPath, target: { type: 'canvas', canvas: this.canvas }});
    }

    #autoResizer;
    async connectedCallback() {
        super.connectedCallback();
        await Renderer.requestDevice();
        this.createRenderer();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        cancelAnimationFrame(this.requestId);
        this.#autoResizer?.stop();
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
            this.reconfigure();
        }

        if(changedProperties.has('exposure')) {
            if(this.viewport && 'exposure' in this.viewport.renderPath.settings) {
                this.viewport.renderPath.settings.values.exposure = this.exposure;
            }
        }

        if(changedProperties.has('skyboxBlur')) {
            if(this.viewport && 'skybox' in this.viewport.renderPath.settings) {
                this.viewport.renderPath.settings.values.skybox.blur = this.skyboxBlur;
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


        if(changedProperties.has('forceWebGL2') && this.renderer) {
            this.createRenderer();
        }

        if(changedProperties.has('renderPath') && this.renderer) {
            this.createViewport();
        }

        if(changedProperties.has('renderScale')) {
            this.#autoResizer.renderScale = this.renderScale;
        }

        if(changedProperties.has('showStats')) {
            this.#stats = this.showStats ? new Stats() : null;
            this.update();
        }

        this.controls.update();
    }

    reconfigure() {
        if(!this.viewport) return;

        const { settings } = this.viewport.renderPath;

        settings.flags.outline = false;

        if('alphaBlendMode' in settings.flags) {
            settings.flags.alphaBlendMode = this.alphaBlendMode ?? 'ordered';
        }

        if('tonemap' in settings.flags) {
            settings.flags.tonemap = this.tonemap;
        }

        if('skybox' in settings.values) {
            settings.values.skybox.blur = this.skyboxBlur;
        }

        for(const prop of ['punctual', 'environment', 'transmission', 'audio', 'skybox', 'shadows', 'fog', 'motionBlur', 'lens', 'bloom', 'grid']) {
            if(prop in settings.flags) {
                settings.flags[prop] = this[`use${prop.slice(0, 1).toUpperCase()}${prop.slice(1)}`];
            }
        }

        if('ssao' in settings.flags) {
            settings.flags.ssao = this.useSSAO;
        }

        switch(this.aaMethod) {
            case 'msaa':
                settings.flags.msaa = 4;
                break;
            case 'taa':
                settings.flags.taa  = true;
                settings.flags.msaa = 1;
                break;
            case 'msaa+taa':
                settings.flags.msaa = 4;
                settings.flags.taa  = true;
                break;
            default:
                settings.flags.taa  = false;
                settings.flags.msaa = 1;
        }

        if('debugPBR' in settings.flags) {
            settings.flags.debugPBR  = this.debugPBR;
            settings.flags.debugAABB = this.debugAABB;
        }

        this.viewport.reconfigure();
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

            if(this.animation !== '!') {
                for(const animator of this.animators) {
                    if(this.animation !== '*' && animator.animation.name !== this.animation) continue;
                    animator.update(frameDeltaTime);
                    this.graph.updateAnimationTargets(animator.targets);
                }
            }

            const cameraNode = this.gltfSample.nodes[this.cameraId]?.camera ? this.gltfSample.nodes[this.cameraId] : this.camera.node;
            if(this.cameraId === -1) {
                this.camera.updateInput(hrTime);
                this.graph.updateNode(cameraNode);
            }

            const { graph, viewport } = this;

            viewport.render({ graph, cameraNode });

            // this.frustum.update({ graph, cameraNode, jitter: this.settings[this.renderPath].temporal });
            // this.renderer.render({ graph, frustum, renderPath });
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

        if(!this.graph.lights.size) {
            this.graph.scene.nodes.push(...this.defaultLights);
            this.graph.updateNodes(new Set(this.defaultLights));
        }

        if(!this.graph.scene.extensions?.KHR_environment_map) {
            this.graph.scene.extensions ??= {}
            this.graph.scene.extensions.KHR_environment_map = new KHREnvironmentMapScene({ environment_map: this.defaultEnvironment });

        }
        this.activateMaterial();
        this.initEnv();
    }

    initEnv() {
        if(!this.gltfSample || !this.gltfEnv) return;

        if(this.graph.scene.extensions.KHR_environment_map.environment_map.extras.sample) {
            this.graph.scene.extensions.KHR_environment_map = new KHREnvironmentMapScene({ environment_map: this.gltfEnv.extensions.KHR_environment_map.environment_maps[0] });
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

            if(gltfSample.extensions?.KHR_audio) {
                if(!this.renderer.audio.context) {
                    const msg = this.toast.addMessage(html`Sample includes audio.<br>Interact with page to allow sound and finish loading.`, 3000000);
                    await this.renderer.audio.contextPromise;
                    this.toast.dismissMessage(msg);
                }
            }

            this.gltfSample = gltfSample;
            this.initSample();

            this.camera.resetToScene(this.graph);

            await this.viewport?.precompile(this.graph);

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

            const environmentMap = this.gltfEnv.extensions.KHR_environment_map.environment_maps[0];

            environmentMap.extras ??= {}
            environmentMap.extras.sample = true;

            if(this.envDeriveIrradiance) {
                delete environmentMap.irradianceCoefficients;
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
