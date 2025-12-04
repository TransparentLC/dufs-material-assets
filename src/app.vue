<template>
    <v-app :style="background ? {
        backgroundImage: `url(${background})`,
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
    } : undefined">
        <v-app-bar color="primary" :style="glassmorphism">
            <template v-slot:prepend>
                <img v-if="logo" :src="logo" height="40" style="margin-left:20px">
            </template>
            <v-app-bar-title v-if="title">{{ title }}</v-app-bar-title>

            <template v-slot:append>
                <div id="app-bar-append"></div>
            </template>
        </v-app-bar>

        <v-main>
            <v-container style="max-width:1080px">
                <router-view v-slot="{ Component }">
                    <keep-alive>
                        <component v-if="$route?.meta?.keepAlive" :is="Component" :key="$route.fullPath"></component>
                    </keep-alive>
                    <component v-if="!$route?.meta?.keepAlive" :is="Component"></component>
                </router-view>
            </v-container>
        </v-main>

        <!--
            感谢你使用 dufs-material-assets！如果我看到有其他人也在使用的话会很开心的！
            因此希望你可以保留页脚的项目链接，它不会影响美观，同时也是对我（以及 dufs 的原作者）的鼓励和支持～
        -->
        <footer class="text-caption text-grey text-center mb-8" v-html="footer"></footer>
    </v-app>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useTheme } from 'vuetify';
import { marked, Renderer } from 'marked';
import { pathPrefix, dufsVersion } from './common.js';
import renderer from './marked-renderer.js';

const matchDark = matchMedia('(prefers-color-scheme:dark)');
const isDark = ref(matchDark.matches);
matchDark.addEventListener('change', () => isDark.value = matchDark.matches);

const title = window.__DUFS_MATERIAL_CONFIG__?.page?.title === undefined ? (location.host + decodeURIComponent(pathPrefix === '/' ? '' : pathPrefix)) : window.__DUFS_MATERIAL_CONFIG__?.page?.title;
const logo = computed(() => {
    const e = window.__DUFS_MATERIAL_CONFIG__?.page?.logo;
    return e && (typeof e === 'string' ? e : (isDark.value ? e.dark : e.light));
});
const background = computed(() => {
    const e = window.__DUFS_MATERIAL_CONFIG__?.background;
    return e && (typeof e === 'string' ? e : (isDark.value ? e.dark : e.light));
});
const glassmorphism = (() => {
    const e = window.__DUFS_MATERIAL_CONFIG__?.glassmorphism?.appbar;
    return e ? {
        backdropFilter: `blur(${e.blur}px)`,
        backgroundColor: `color-mix(in srgb, rgb(var(--v-theme-primary)) ${e.alpha * 100}%, transparent) !important`,
    } : {};
})();
const footerRenderer = new Renderer;
Object.assign(footerRenderer, {
    ...renderer,
    image(token) {
        return Renderer.prototype.image.apply(this, [token]).replace(/^<img/, '<img style="vertical-align:middle"');
    },
    link(token) {
        return Renderer.prototype.link.apply(this, [token]).replace(/^<a/, '<a target="_blank" rel="noopener noreferrer" style="color:unset"');
    },
});
const footer = marked.parse(`${window.__DUFS_MATERIAL_CONFIG__?.footer || ''}\n\nPowered by [dufs](https://github.com/sigoden/dufs) v${dufsVersion} & [dufs-material-assets](https://github.com/TransparentLC/dufs-material-assets)`, { renderer: footerRenderer });

const theme = useTheme();
theme.global.name.value = isDark.value ? 'dark' : 'light';
watch(isDark, () => theme.global.name.value = isDark.value ? 'dark' : 'light');

</script>
