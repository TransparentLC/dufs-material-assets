<template>
    <v-app>
        <v-snackbar
            v-model="active"
            :color="color"
            :bottom="bottom"
            :top="top"
            :left="left"
            :right="right"
            :timeout="timeout"
        >
            {{ content }}
            <template #actions>
                <v-btn
                    v-if="buttonText"
                    :color="buttonColor"
                    text
                    @click="active = false; onClickButton()"
                >{{ buttonText }}</v-btn>
            </template>
        </v-snackbar>
    </v-app>
</template>

<script setup>
import { ref } from 'vue';

const active = ref(false);

const bottom = ref(false);
const top = ref(false);
const left = ref(false);
const right = ref(false);
const timeout = ref(0);
const color = ref('');
const buttonColor = ref('');
const content = ref('');
const buttonText = ref('');

const onClickButton = ref(() => {});
const onClose = ref(() => {});

defineExpose({
    active,
    bottom,
    top,
    left,
    right,
    timeout,
    color,
    buttonColor,
    content,
    buttonText,
    onClickButton,
    onClose,
});

</script>