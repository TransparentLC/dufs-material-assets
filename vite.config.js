import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { createHtmlPlugin } from 'vite-plugin-html';
import vuetify from 'vite-plugin-vuetify';
import { visualizer } from 'rollup-plugin-visualizer';
import fs from 'node:fs';

const __IS_PROD__ = process.env.NODE_ENV === 'production';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        vuetify({
            autoImport: true,
        }),
        createHtmlPlugin({
            minify: {
                collapseWhitespace: true,
                collapseBooleanAttributes: true,
                decodeEntities: true,
                removeComments: true,
                removeAttributeQuotes: false,
                removeRedundantAttributes: true,
                removeScriptTypeAttributes: true,
                removeStyleLinkTypeAttributes: true,
                removeEmptyAttributes: true,
                useShortDoctype: true,
                processConditionalComments: true,
                sortAttributes: true,
                sortClassName: true,
                minifyCSS: true,
                minifyJS: true,
                minifyURLs: false,
            },
            inject: {
                data: {
                    DUFS_EMBED_FILENAME: process.env.DUFS_EMBED_FILENAME,
                    injectScript: `
                        <script>
                            // window.__CUSTOM_TITLE__ = 'Custom title';
                            // window.__CUSTOM_THEME__ = {
                            //     light: {
                            //         primary: '#0288d1',
                            //         secondary: '#00b0ff',
                            //     },
                            //     dark: {
                            //         primary: '#026da7',
                            //         secondary: '#008dcc',
                            //     },
                            // };
                            // window.__CUSTOM_THEME__ = {
                            //     light: {
                            //         primary: '#6750a4',
                            //         secondary: '#b4b0bb',
                            //         tertiary: '#7d5260',
                            //         error: '#b3261e',
                            //         surface: '#fffbfe',
                            //     },
                            // };
                            ${__IS_PROD__ ? `window.__INITIAL_DATA__ = JSON.parse(decodeURIComponent(escape(atob("__INDEX_DATA__"))));` : ''}
                            window.__DUFS_PREFIX__ = '${__IS_PROD__ ? '__ASSETS_PREFIX__' : '/prefix/__dufs_v0.0.0__/'}';
                        </script>
                    `,
                },
            },
        }),
    ],
    css: {
        transformer: 'lightningcss',
    },
    build: {
        chunkSizeWarningLimit: Infinity,
        minify: 'terser',
        terserOptions: {
            compress: {
                arguments: true,
                ecma: 2020,
                module: true,
                unsafe_math: true,
                unsafe_methods: true,
                unsafe_proto: true,
                unsafe_regexp: true,
                unsafe_symbols: true,
                unsafe_undefined: true,
                passes: 2,
            },
            mangle: {
                module: true,
            },
            format: {
                ecma: 2020,
                comments: false,
            },
        },
        cssMinify: 'lightningcss',
        rollupOptions: {
            plugins: [
                visualizer({
                    gzipSize: true,
                    brotliSize: true,
                }),
            ],
            ...(process.env.DUFS_EMBED_FILENAME ? {
                output: {
                    entryFileNames: 'index.js',
                    assetFileNames: '[name][extname]',
                },
            } : {}),
        },
    },
    define: {
        __IS_PROD__,
        __BUILD_TIME__: `"${(new Date).toISOString()}"`,
        __VUE_VERSION__: `"Vue ${JSON.parse(fs.readFileSync('./node_modules/vue/package.json', {encoding: 'utf-8'})).version}"`,
        __VITE_VERSION__: `"Vite ${JSON.parse(fs.readFileSync('./node_modules/vite/package.json', {encoding: 'utf-8'})).version}"`,
        __VUETIFY_VERSION__: `"Vuetify ${JSON.parse(fs.readFileSync('./node_modules/vuetify/package.json', {encoding: 'utf-8'})).version}"`,
    },
    server: {
        proxy: {
            '^/prefix/.+\..+?$': 'http://localhost:5000',
        },
    },
});
