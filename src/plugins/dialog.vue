<template>
    <v-app>
        <v-dialog
            v-model="active"
            :persistent="persistent"
            scrollable
            :width="width"
            :max-height="maxHeight"
        >
            <v-card>
                <v-card-title v-if="title" class="headline pt-4">{{ title }}</v-card-title>
                <v-card-text class="px-4 pt-0">
                    <div v-if="rawHtml" v-html="content"></div>
                    <div v-else>{{ content }}</div>

                    <template v-if="prompt">
                        <v-textarea
                            v-if="rows > 1"
                            v-model="value"
                            hide-details
                            color="primary"
                            no-resize
                            :label="label"
                            :rows="rows"
                            :counter="maxLength || false"
                            :placeholder="placeholder"
                        ></v-textarea>
                        <v-text-field
                            v-else
                            v-model="value"
                            hide-details
                            color="primary"
                            :label="label"
                            :type="password ? 'password' : 'text'"
                            :counter="maxLength || false"
                            :placeholder="placeholder"
                        ></v-text-field>
                    </template>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <div class="d-flex flex-row align-end">
                        <v-btn
                            v-if="buttonDismissText"
                            :color="buttonDismissColor"
                            text
                            class="d-block"
                            @click="onDismiss(); active = false"
                        >{{ buttonDismissText }}</v-btn>
                        <v-btn
                            v-if="buttonConfirmText"
                            :color="buttonConfirmColor"
                            text
                            class="d-block"
                            @click="onConfirm(value); active = false"
                        >{{ buttonConfirmText }}</v-btn>
                    </div>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-app>
</template>

<script setup>
import { ref } from 'vue';

const active = ref(false);
const value = ref('');

const width = ref(0);
const maxHeight = ref(0);
const persistent = ref(false);
const rawHtml = ref(false);
const title = ref('');
const content = ref('');

const prompt = ref(false);
const label = ref('');
const password = ref(false);
const rows = ref(0);
const placeholder = ref('');
const maxLength = ref(0);

const buttonConfirmText = ref('');
const buttonDismissText = ref('');
const buttonConfirmColor = ref('');
const buttonDismissColor = ref('');

const onConfirm = ref(() => {});
const onDismiss = ref(() => {});
const onClose = ref(() => {});

defineExpose({
    active,
    value,
    width,
    maxHeight,
    persistent,
    rawHtml,
    title,
    content,
    prompt,
    label,
    password,
    rows,
    placeholder,
    maxLength,
    buttonConfirmText,
    buttonDismissText,
    buttonConfirmColor,
    buttonDismissColor,
    onConfirm,
    onDismiss,
    onClose,
});

</script>