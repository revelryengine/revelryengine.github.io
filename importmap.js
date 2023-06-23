const shim = document.createElement('script');
shim.async = true;
shim.src   = 'https://ga.jspm.io/npm:es-module-shims@1.6.2/dist/es-module-shims.js';

const element = document.createElement('script');
element.type = 'importmap-shim';
element.textContent = JSON.stringify({
    imports: {
        'revelryengine/ecs/'                 : 'https://cdn.jsdelivr.net/gh/revelryengine/ecs@v0.1.1-alpha/',
        'revelryengine/core/'                : 'https://cdn.jsdelivr.net/gh/revelryengine/core@v0.1.1-alpha/',
        'revelryengine/gltf/'                : 'https://cdn.jsdelivr.net/gh/revelryengine/gltf@v0.1.3-alpha/',
        'revelryengine/renderer/'            : 'https://cdn.jsdelivr.net/gh/revelryengine/renderer@v0.1.10-alpha/',
        'revelryengine/sample-environments/' : 'https://cdn.jsdelivr.net/gh/revelryengine/sample-environments@v0.2.0-alpha/',
        'revelryengine/sample-models/'       : 'https://cdn.jsdelivr.net/gh/revelryengine/sample-models@v0.1.0-alpha/',
        'lit'                                : 'https://cdn.skypack.dev/lit@2.4.0',
        'lit/'                               : 'https://cdn.skypack.dev/lit@2.4.0/',
        'stats'                              : 'https://cdn.jsdelivr.net/gh/mrdoob/stats.js/build/stats.module.js',
    }
});

document.currentScript?.after(shim);
document.currentScript?.after(element);
