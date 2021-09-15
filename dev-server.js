import serve from 'koa-static-server';
import Koa   from 'koa';
import cors  from '@koa/cors';
import fs    from 'fs/promises';

const app = new Koa();

app.use(cors());
app.use(async (ctx, next) => {
  await next();
  if(ctx.path === '/') {
    const index = (await fs.readFile('./index.html')).toString().replace('<!-- {dev import map} -->', `
        <!-- We can remove this shim once all major browsers support import maps -->
        <script async src="https://unpkg.com/es-module-shims@0.12.1/dist/es-module-shims.js"></script>
        <script type="importmap">
            {
                "imports": {
                    "https://cdn.jsdelivr.net/npm/webgltf/": "/webgltf/",
                    "https://cdn.jsdelivr.net/gh/webgltf/webgltf-sample-models@main/": "/webgltf-sample-models/"
                }
            }
        </script>`);
    ctx.body = index;
  }
});

app.use(serve({ rootDir: '../webgltf', rootPath: '/webgltf', log: true }));
app.use(serve({ rootDir: '../webgltf-sample-models', rootPath: '/webgltf-sample-models', log: true }));
app.use(serve({ rootDir: '.', log: true }));

app.listen(8080, (err) => {
  if(err) return console.warn(err);
  console.log('listening on port 8080');
});
