import { createRouter, createWebHistory } from 'vue-router';

import filelist from './components/filelist.vue';

export default createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/:path(.*)*',
            component: filelist,
        },
    ],
});
