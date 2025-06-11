<template>
    <v-app>
        <v-app-bar color="primary">
            <v-app-bar-title>{{ title }}</v-app-bar-title>

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

                <!--
                    感谢你使用 dufs-material-assets！如果我看到有其他人也在使用的话会很开心的！
                    因此希望你可以保留这个页脚。它不会影响美观，同时也是对我（以及 dufs 的原作者）的鼓励和支持～
                -->
                <div class="text-caption text-grey text-center mt-8 mb-4">
                    Powered by
                    <a href="https://github.com/sigoden/dufs" target="_blank" rel="noopener noreferrer" style="color:unset">dufs</a> v{{ dufsVersion }} &
                    <a href="https://github.com/TransparentLC/dufs-material-assets" target="_blank" rel="noopener noreferrer" style="color:unset">dufs-material-assets</a>
                </div>
            </v-container>
        </v-main>
    </v-app>
</template>

<script setup>
import { useTheme } from 'vuetify';
import { pathPrefix, dufsVersion } from './common.js';

const title = window.__CUSTOM_PAGE_TITLE__ || (location.host + decodeURIComponent(pathPrefix === '/' ? '' : pathPrefix));

const theme = useTheme();
const matchDark = matchMedia('(prefers-color-scheme:dark)');
const setTheme = () => theme.global.name.value = matchDark.matches ? 'dark' : 'light';
setTheme();
matchDark.addEventListener('change', setTheme);

</script>
