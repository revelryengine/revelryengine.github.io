declare module 'https://*'

declare module 'https://cdn.jsdelivr.net/gh/toji/gl-matrix@v3.4.1/src/index.js' {
    import 'vendor/cdn.jsdelivr.net/gh/toji/gl-matrix@v3.4.1/src/types.d.js';
    export * from 'vendor/cdn.jsdelivr.net/gh/toji/gl-matrix@v3.4.1/src/index.js';
}

declare module 'https://cdn.jsdelivr.net/gh/mrdoob/stats.js/build/stats.module.js' {
    export { default } from 'stats.js';
}

declare module 'https://esm.sh/lit@3.0.1/index.js?target=esnext' {
    export * from 'vendor/esm.sh/v133/lit@3.0.1/index.js';
}

declare module 'https://esm.sh/lit@3.0.1/directives/repeat.js?target=esnext' {
    export * from 'vendor/esm.sh/v133/lit@3.0.1/directives/repeat.js';
}
