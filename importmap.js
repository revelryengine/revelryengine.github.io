const element = document.createElement('script');
element.type = 'importmap';
element.textContent = JSON.stringify({
    imports: {
        'https://cdn.jsdelivr.net/gh/revelryengine/renderer/'            : globalThis.DEVELOPMENT_MODE ? `${location.origin}/packages/renderer/`            : 'https://cdn.jsdelivr.net/gh/revelryengine/renderer@v0.3.0-alpha/',
        'https://cdn.jsdelivr.net/gh/revelryengine/gltf/'                : globalThis.DEVELOPMENT_MODE ? `${location.origin}/packages/gltf/`                : 'https://cdn.jsdelivr.net/gh/revelryengine/gltf@v0.3.1-alpha/',
        'https://cdn.jsdelivr.net/gh/revelryengine/utils/'               : globalThis.DEVELOPMENT_MODE ? `${location.origin}/packages/utils/`               : 'https://cdn.jsdelivr.net/gh/revelryengine/utils@v0.3.0-alpha/',
        'https://cdn.jsdelivr.net/gh/revelryengine/sample-environments/' : globalThis.DEVELOPMENT_MODE ? `${location.origin}/packages/sample-environments/` : 'https://cdn.jsdelivr.net/gh/revelryengine/sample-environments@v0.3.0-alpha/',
        'https://cdn.jsdelivr.net/gh/revelryengine/sample-models/'       : globalThis.DEVELOPMENT_MODE ? `${location.origin}/packages/sample-models/`       : 'https://cdn.jsdelivr.net/gh/revelryengine/sample-models@v0.3.0-alpha/',
    }
});

document.currentScript?.after(element);
