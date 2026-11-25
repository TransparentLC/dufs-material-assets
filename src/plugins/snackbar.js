import { createApp } from 'vue';
import snackbar from './snackbar.vue';

export default {
    /**
     * @param {import('vue').App} app
     * @param {{
     *  vuetify: import('vuetify'),
     * }} pluginConfig
     */
    install: (app, pluginConfig) => {
        const el = document.createElement('div');
        el.style.position = 'absolute';
        document.body.appendChild(el);
        const vm = createApp(snackbar)
            .use(pluginConfig.vuetify)
            .mount(el);

        /**
         * @typedef {{
         *  bottom: Boolean,
         *  top: Boolean,
         *  left: Boolean,
         *  right: Boolean,
         *  timeout: Number,
         *  timer: Boolean | 'top' | 'bottom',
         *  timerColor: String,
         *  color: String
         *  buttonColor: String,
         *  content: String,
         *  buttonText: String,
         *  onClickButton: Function,
         *  onClose: Function,
         * }} SnackbarConfig
         */

        /** @type {SnackbarConfig} */
        const defaultConfig = {
            bottom: true,
            top: false,
            left: false,
            right: false,
            timeout: 5000,
            timer: 'bottom',
            timerColor: undefined,
            color: null,
            buttonColor: 'primary-lighten-2',
            content: null,
            buttonText: 'OK',
            onClickButton: () => {},
            onClose: () => {},
        };

        let timeoutTimer;

        /** @type {SnackbarConfig[]} */
        const queue = [];
        const activateToast = () => {
            if (!queue.length || vm.active) return;
            Object.assign(vm, queue.shift());
            timeoutTimer = setTimeout(vm.onClose, vm.timeout);
            vm.active = true;
        };

        /**
         * @param {String} content
         * @param {SnackbarConfig} config
         */
        const $toast = (content, config = {}) => {
            queue.push({
                ...defaultConfig,
                ...config,
                content,
                onClickButton: () => {
                    if (config.onClickButton) config.onClickButton();
                    if (config.onClose) config.onClose();
                    setTimeout(activateToast, 200);
                    clearTimeout(timeoutTimer);
                },
                onClose: () => {
                    if (config.onClose) config.onClose();
                    setTimeout(activateToast, 200);
                    clearTimeout(timeoutTimer);
                },
            });
            activateToast();
        };

        for (const color of ['success', 'info', 'error', 'warning']) {
            /**
             * @param {String} content
             * @param {SnackbarConfig} [config]
             */
            $toast[color] = (content, config = {}) => $toast(content, {
                color,
                buttonColor: 'white',
                timerColor: 'white',
                ...config,
            });
        }

        app.config.globalProperties.$toast = $toast;
    },
};