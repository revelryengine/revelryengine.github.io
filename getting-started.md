# Getting Started
```html
<html>
    <style>
        html, body, canvas {
            width: 100%;
            height: 100%;
        }
    </style>
    <body>
        <canvas id="main" width="100%" height="100%">
        <script type="module">
            import { WebGLTF     } from 'https://cdn.jsdelivr.net/npm/webgltf@0.1.0/lib/webgltf.js';
            import { Renderer    } from 'https://cdn.jsdelivr.net/npm/webgltf@0.1.0/lib/renderer/renderer.js';
            import { Environment } from 'https://cdn.jsdelivr.net/npm/webgltf@0.1.0/lib/renderer/environment.js';
            import { Animator    } from 'https://cdn.jsdelivr.net/npm/webgltf@0.1.0/lib/renderer/animator.js';

            (async () => {
                const webgltf     = await WebGLTF.load('https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/63f026b2/2.0/VC/glTF/VC.gltf');
                const environment = await Environment.load('https://raw.githubusercontent.com/webgltf/webgltf-sample-models/main/environments/green_sanctuary/green_sanctuary_256.gltf');

                const renderer = new Renderer('#main', { environment });
                const animator = new Animator(webgltf.animations);
                
                const scene = webgltf.scene || webgltf.scenes[0];

                const cameraNodes = []; // find all cameras in scene
                for(const node of scene.depthFirstSearch()) {
                    if(node.camera) cameraNodes.push(node);
                }

                //Set up basic update loop
                let lastRenderTime = 0;
                function loop(hrTime) {
                    let cameraNode = cameraNodes[Math.floor(hrTime / 5000) % cameraNodes.length]; //Just cycling through scene cameras every 5 seconds

                    animator.update(hrTime - lastRenderTime);
                    renderer.render(scene, cameraNode);
                    lastRenderTime = hrTime;

                    requestAnimationFrame(loop);
                }
                requestAnimationFrame(loop);
            })();
        </script>
    </body>
</html>
```
