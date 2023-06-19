import { createApp } from 'vue';
import dialog from './dialog.vue';

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
        const vm = createApp(dialog)
            .use(pluginConfig.vuetify)
            .mount(el);

        /**
         * @typedef {{
         *  value: String,
         *  width: Number,
         *  maxHeight: Number,
         *  persistent: Boolean,
         *  rawHtml: Boolean,
         *  title: String,
         *  content: String,
         *  prompt: Boolean,
         *  label: String,
         *  password: Boolean,
         *  rows: Number,
         *  placeholder: String,
         *  maxLength: Number,
         *  buttonConfirmText: String,
         *  buttonDismissText: String,
         *  buttonConfirmColor: String,
         *  buttonDismissColor: String,
         *  onClickConfirmButton: Function,
         *  onClickDismissButton: Function,
         *  onClose: Function,
         * }} DialogConfig
         */

        /** @type {DialogConfig} */
        const defaultConfig = {
            value: '',
            width: 540,
            maxHeight: null,
            persistent: false,
            rawHtml: false,
            title: '',
            content: '',
            prompt: false,
            label: '',
            password: false,
            rows: 1,
            placeholder: '',
            maxLength: null,
            buttonConfirmText: 'OK',
            buttonDismissText: 'Cancel',
            buttonConfirmColor: 'primary-darken-1',
            buttonDismissColor: 'primary-darken-1',
            onClickConfirmButton: () => {},
            onClickDismissButton: () => {},
            onClose: () => {},
        };

        /** @type {DialogConfig[]} */
        const queue = [];
        const activateDialog = () => {
            if (!queue.length || vm.active) return;
            Object.assign(vm, queue.shift());
            vm.active = true;
        };
        vm.$watch('active', newval => {
            if (newval) return;
            vm.onClose();
            setTimeout(activateDialog, 150);
        });

        /**
         * @param {DialogConfig} config
         */
        const $dialog = (config = {}) => {
            queue.push({
                ...defaultConfig,
                ...config,
            });
            activateDialog();
        };

        /**
         * @param {String} content
         * @param {String} title
         * @param {() => void} onConfirm
         * @param {DialogConfig} [config]
         */
        $dialog.alert = (content, title, onConfirm, config = {}) => $dialog({
            content,
            title,
            onConfirm,
            ...config,
        });
        /**
         * @param {String} content
         * @param {String} title
         * @param {() => void} onConfirm
         * @param {() => void} onDismiss
         * @param {DialogConfig} [config]
         */
        $dialog.confirm = (content, title, onConfirm, onDismiss, config = {}) => $dialog({
            content,
            title,
            onConfirm,
            onDismiss,
            ...config,
        });
        /**
         * @param {String} label
         * @param {String} title
         * @param {() => void} onConfirm
         * @param {() => void} onDismiss
         * @param {DialogConfig} [config]
         */
        $dialog.prompt = (label, title, onConfirm, onDismiss, config = {}) => $dialog({
            prompt: true,
            label,
            title,
            onConfirm,
            onDismiss,
            ...config,
        });
        $dialog.promises = {
            /**
             * @param {String} content
             * @param {String} title
             * @param {DialogConfig} [config]
             * @returns {Promise<void>}
             */
            alert: (content, title, config = {}) => new Promise(resolve => $dialog.alert(
                content,
                title,
                resolve,
                config,
            )),
            /**
             * @param {String} content
             * @param {String} title
             * @param {DialogConfig} [config]
             * @returns {Promise<Boolean>}
             */
            confirm: (content, title, config = {}) => new Promise(resolve => $dialog.confirm(
                content,
                title,
                () => resolve(true),
                () => resolve(false),
                config,
            )),
            /**
             * @param {String} label
             * @param {String} title
             * @param {DialogConfig} [config]
             * @returns {Promise<String|null>}
             */
            prompt: (label, title, config = {}) => new Promise(resolve => $dialog.prompt(
                label,
                title,
                resolve,
                () => resolve(null),
                config,
            )),
        };

        app.config.globalProperties.$dialog = $dialog;
    },
};