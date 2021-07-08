# Getting Started

```js
import { Renderer, WebGLTF } from 'https://cdn.skypack.dev/webgltf';

(async () => {
  const renderer = new Renderer('#main');

  const model = await WebGLTF.load('url/to/model.gltf');
  const scene = model.scene || model.scenes[0];
  const camera = model.createCamera();
  renderer.render(scene, camera);
})();
```
