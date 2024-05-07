<template>
    <Teleport to="#app-bar-append">
        <v-tooltip
            v-if="filelist.allow_upload"
            text="Upload files"
        >
            <template v-slot:activator="{ props }">
                <v-btn
                    v-bind="props"
                    variant="text"
                    icon="$mdiUpload"
                    @click="uploadFilesClick"
                ></v-btn>
                <input
                    id="upload"
                    class="d-none"
                    type="file"
                    multiple
                    @change="e => uploadFilesSelectResolve(e.target.files)"
                >
            </template>
        </v-tooltip>
        <v-tooltip
            v-if="filelist.allow_upload"
            text="Create folder"
        >
            <template v-slot:activator="{ props }">
                <v-btn
                    v-bind="props"
                    variant="text"
                    icon="$mdiFolderPlus"
                    @click="createFolder"
                ></v-btn>
            </template>
        </v-tooltip>
        <v-tooltip
            v-if="filelist.allow_archive"
            text="Download root folder as a .zip file"
        >
            <template v-slot:activator="{ props }">
                <v-btn
                    v-bind="props"
                    variant="text"
                    icon="$mdiFolderDownload"
                    :href="currentPath + '?zip'"
                    download
                ></v-btn>
            </template>
        </v-tooltip>
    </Teleport>

    <v-card class="my-4">
        <div class="d-flex flex-column flex-sm-row align-sm-center">
            <v-breadcrumbs :items="breadcrumb" class="flex-grow-1 overflow-x-auto py-2 py-sm-4">
                <template v-slot:divider>
                    <v-icon icon="$mdiChevronRight"></v-icon>
                </template>
                <template v-slot:prepend>
                    <v-btn
                        variant="text"
                        icon="$mdiHome"
                        density="comfortable"
                        :to="breadcrumb[0].href"
                        :active="false"
                    ></v-btn>
                </template>
                <template v-slot:title="{ item }">
                    <v-breadcrumbs-item
                        :to="item.href"
                        active-color="primary"
                        exact
                        class="text-no-wrap px-0"
                    >{{ item.title }}</v-breadcrumbs-item>
                </template>
            </v-breadcrumbs>
            <div
                v-if="filelist.allow_search"
                class="flex-shrink-0 px-3 py-2 py-sm-4"
                :style="{
                    width: (
                        display.mdAndUp.value
                            ? '320px'
                            : (display.smAndUp.value ? '240px' : '100%')
                    ),
                }"
            >
                <v-text-field
                    v-model="search"
                    density="compact"
                    variant="outlined"
                    color="primary"
                    single-line
                    hide-details
                    label="Search"
                    :append-inner-icon="search ? '$mdiCloseCircle' : '$mdiMagnify'"
                    @click:append-inner="search = ''"
                ></v-text-field>
            </div>
        </div>

        <v-skeleton-loader
            :loading="filelistSkeleton"
            type="table-tbody"
        >
            <v-table class="w-100" :class="{'overflow-x-auto': display.xs.value}" style="font-size:1rem">
                <thead>
                    <tr style="color:rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity))">
                        <th class="w-100">
                            <span
                                style="cursor:pointer"
                                @click="
                                    sortColumn === 'name'
                                        ? (
                                            sortOrderDesc
                                            ? (sortColumn = '')
                                            : (sortOrderDesc = true)
                                        )
                                        : (sortColumn = 'name', sortOrderDesc = false)
                                "
                            >
                                Name
                                <v-icon
                                    v-if="sortColumn === 'name'"
                                    :icon="sortOrderDesc ? '$mdiSortAlphabeticalDescending' : '$mdiSortAlphabeticalAscending'"
                                    color="grey"
                                    size="small"
                                ></v-icon>
                            </span>
                        </th>
                        <th class="text-no-wrap text-right">
                            <span
                                style="cursor:pointer"
                                @click="
                                    sortColumn === 'mtime'
                                        ? (
                                            sortOrderDesc
                                            ? (sortColumn = '')
                                            : (sortOrderDesc = true)
                                        )
                                        : (sortColumn = 'mtime', sortOrderDesc = false)
                                "
                            >
                                Last Modified
                                <v-icon
                                    v-if="sortColumn === 'mtime'"
                                    :icon="sortOrderDesc ? '$mdiSortClockDescending' : '$mdiSortClockAscending'"
                                    color="grey"
                                    size="small"
                                ></v-icon>
                            </span>
                        </th>
                        <th class="text-no-wrap text-right">
                            <span
                                style="cursor:pointer"
                                @click="
                                    sortColumn === 'size'
                                        ? (
                                            sortOrderDesc
                                            ? (sortColumn = '')
                                            : (sortOrderDesc = true)
                                        )
                                        : (sortColumn = 'size', sortOrderDesc = false)
                                "
                            >
                                Size
                                <v-icon
                                    v-if="sortColumn === 'size'"
                                    :icon="sortOrderDesc ? '$mdiSortNumericDescending' : '$mdiSortNumericAscending'"
                                    color="grey"
                                    size="small"
                                ></v-icon>
                            </span>
                        </th>
                        <th class="text-no-wrap text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="p in filelistPathsSorted" v-ripple>
                        <td>
                            <div
                                class="d-flex align-center"
                                :style="{'min-width': display.width.value < 768 ? 'min(1080px, calc(100vw - 64px))' : null}"
                            >
                                <v-icon
                                    :color="p.is_dir ? 'primary' : getColorFromExt(p.ext)"
                                    :icon="p.is_dir ? '$mdiFolder' : getIconFromExt(p.ext)"
                                    class="mr-2 flex-shrink-0"
                                ></v-icon>
                                <router-link
                                    v-if="p.is_dir"
                                    :to="p.fullpath + '/'"
                                    class="text-decoration-none"
                                    style="color:inherit;overflow-wrap:anywhere"
                                >{{ p.name }}</router-link>
                                <a
                                    v-else
                                    :href="p.fullpath"
                                    class="text-decoration-none"
                                    style="color:inherit;overflow-wrap:anywhere"
                                >{{ p.name }}</a>
                                <v-icon
                                    v-if="p.is_symlink"
                                    icon="$mdiLinkVariant"
                                    color="grey"
                                    size="x-small"
                                    class="ml-1"
                                ></v-icon>
                            </div>
                        </td>
                        <td class="text-no-wrap text-right">{{ formatTimestamp(p.mtime) }}</td>
                        <td class="text-no-wrap text-right">{{ Number.isInteger(p.size) ? formatSize(p.size) : '' }}</td>
                        <td class="text-no-wrap text-right">
                            <v-tooltip
                                v-if="(new Set(['jpg', 'jpeg', 'gif', 'png', 'webp', 'avif', 'svg'])).has(p.ext)"
                                text="View image"
                            >
                                <template v-slot:activator="{ props }">
                                    <v-btn
                                        v-bind="props"
                                        variant="plain"
                                        icon="$mdiImageSearch"
                                        density="comfortable"
                                        @click="previewDialog = true; previewMode = 'image'; previewItem = p"
                                    ></v-btn>
                                </template>
                            </v-tooltip>
                            <v-tooltip
                                v-if="(new Set(['mp4', 'webm', 'ogv'])).has(p.ext)"
                                text="Play video"
                            >
                                <template v-slot:activator="{ props }">
                                    <v-btn
                                        v-bind="props"
                                        variant="plain"
                                        icon="$mdiVideo"
                                        density="comfortable"
                                        @click="previewDialog = true; previewMode = 'video'; previewItem = p"
                                    ></v-btn>
                                </template>
                            </v-tooltip>
                            <v-tooltip
                                v-if="(new Set(['mp3', 'm4a', 'ogg', 'weba', 'oga', 'flac', 'opus'])).has(p.ext)"
                                text="Play audio"
                            >
                                <template v-slot:activator="{ props }">
                                    <v-btn
                                        v-bind="props"
                                        variant="plain"
                                        icon="$mdiDiscPlayer"
                                        density="comfortable"
                                        @click="previewDialog = true; previewMode = 'audio'; previewItem = p; updateAudioTags(p); previewAudioDuration = 0"
                                    ></v-btn>
                                </template>
                            </v-tooltip>
                            <v-tooltip
                                v-if="p.ext === 'pdf'"
                                text="View file"
                            >
                                <template v-slot:activator="{ props }">
                                    <v-btn
                                        v-bind="props"
                                        variant="plain"
                                        icon="$mdiFileSearch"
                                        density="comfortable"
                                        @click="previewDialog = true; previewMode = 'pdf'; previewItem = p"
                                    ></v-btn>
                                </template>
                            </v-tooltip>
                            <v-tooltip
                                v-if="
                                    (new Set(['readme', 'license'])).has(p.filename.toLowerCase())
                                    || (new Set(['txt', 'log', 'conf', 'ini', 'md', 'gitignore'])).has(p.ext)
                                    || codeLanguageTable[p.ext]
                                "
                                text="View file"
                            >
                                <template v-slot:activator="{ props }">
                                    <v-btn
                                        v-bind="props"
                                        variant="plain"
                                        icon="$mdiFileSearch"
                                        density="comfortable"
                                        @click="previewDialog = true; previewMode = 'text'; previewItem = p; previewContent = ''; updatePreviewContent()"
                                    ></v-btn>
                                </template>
                            </v-tooltip>
                            <v-tooltip
                                v-if="
                                    filelist.allow_upload
                                    && filelist.allow_delete
                                    && p.size < 1048576
                                    && (
                                        (new Set(['readme', 'license'])).has(p.filename.toLowerCase())
                                        || (new Set(['txt', 'log', 'conf', 'ini', 'md', 'gitignore'])).has(p.ext)
                                        || codeLanguageTable[p.ext]
                                    )
                                "
                                text="Edit file"
                            >
                                <template v-slot:activator="{ props }">
                                    <v-btn
                                        v-bind="props"
                                        variant="plain"
                                        icon="$mdiFileDocumentEdit"
                                        density="comfortable"
                                        @click="editDialog = true; editItem = p; editContent = ''; updateEditContent()"
                                    ></v-btn>
                                </template>
                            </v-tooltip>
                            <v-tooltip
                                v-if="filelist.allow_delete"
                                text="Move to new path"
                            >
                                <template v-slot:activator="{ props }">
                                    <v-btn
                                        v-bind="props"
                                        variant="plain"
                                        icon="$mdiFileMove"
                                        density="comfortable"
                                        @click="moveFile(p)"
                                    ></v-btn>
                                </template>
                            </v-tooltip>
                            <v-tooltip
                                v-if="filelist.allow_delete"
                                :text="p.is_dir ? 'Delete folder' : 'Delete file'"
                            >
                                <template v-slot:activator="{ props }">
                                    <v-btn
                                        v-bind="props"
                                        variant="plain"
                                        icon="$mdiDeleteForever"
                                        density="comfortable"
                                        @click="deleteFile(p)"
                                    ></v-btn>
                                </template>
                            </v-tooltip>
                            <v-tooltip
                                v-if="p.is_dir && filelist.allow_archive"
                                text="Download folder as a .zip file"
                            >
                                <template v-slot:activator="{ props }">
                                    <v-btn
                                        v-bind="props"
                                        variant="plain"
                                        icon="$mdiFolderDownload"
                                        density="comfortable"
                                        :href="currentPath + p.name + '/?zip'"
                                        :download="p.filename + '.zip'"
                                    ></v-btn>
                                </template>
                            </v-tooltip>
                            <v-tooltip
                                v-if="!p.is_dir"
                                text="Download file"
                            >
                                <template v-slot:activator="{ props }">
                                    <v-btn
                                        v-bind="props"
                                        variant="plain"
                                        icon="$mdiDownload"
                                        density="comfortable"
                                        :href="currentPath + p.name"
                                        :download="p.filename"
                                    ></v-btn>
                                </template>
                            </v-tooltip>
                        </td>
                    </tr>
                </tbody>
            </v-table>
        </v-skeleton-loader>
    </v-card>

    <v-card v-if="readmeItem" class="my-4">
        <v-card-title class="text-subtitle-1">
            <v-icon icon="$mdiBookOpenVariant" size="small" class="mr-2"></v-icon>{{ readmeItem.filename }}
        </v-card-title>
        <v-skeleton-loader
            :loading="readmeSkeleton"
            type="article"
        >
            <v-card-text v-if="readmeRichMode" v-html="readmeContent" class="markdown-body w-100"></v-card-text>
            <v-card-text v-else>
                <pre style="white-space:pre-wrap;word-break:keep-all"><code>{{ readmeContent }}</code></pre>
            </v-card-text>
        </v-skeleton-loader>
    </v-card>

    <v-dialog
        v-model="previewDialog"
        width="min(960px, calc(100vw - 32px))"
    >
        <v-card>
            <v-card-title class="d-flex align-center">
                <v-icon
                    :color="getColorFromExt(previewItem.ext)"
                    :icon="getIconFromExt(previewItem.ext)"
                    class="mr-2 flex-shrink-0"
                ></v-icon>
                <span class="flex-grow-1 text-truncate" :title="previewItem.name">
                    {{ previewItem.filename }}
                    <span class="d-none d-sm-inline">({{ formatSize(previewItem.size) }})</span>
                </span>
                <v-btn
                    variant="plain"
                    icon="$mdiDownload"
                    density="comfortable"
                    :href="previewItem.fullpath"
                    :download="previewItem.filename"
                ></v-btn>
                <v-btn
                    variant="plain"
                    icon="$mdiClose"
                    density="comfortable"
                    @click="previewDialog = false"
                ></v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <v-card-text
                v-if="previewMode === 'image'"
                class="py-4"
                style="max-height:calc(100vh - 48px - 52px - 16px)"
            >
                <img
                    :src="previewItem.fullpath"
                    :alt="previewItem.filename"
                    class="d-block mx-auto rounded"
                    style="max-width:100%;max-height:calc(100vh - 48px - 52px - 48px)"
                >
            </v-card-text>
            <v-card-text
                v-else-if="previewMode === 'video'"
                class="py-4"
                style="max-height:calc(100vh - 48px - 52px - 16px)"
            >
                <video
                    :src="previewItem.fullpath"
                    controls
                    autoplay
                    preload="metadata"
                    class="d-block mx-auto rounded"
                    style="max-width:100%;max-height:calc(100vh - 48px - 52px - 48px)"
                ></video>
            </v-card-text>
            <v-card-text
                v-else-if="previewMode === 'audio'"
                class="py-4 d-flex flex-column align-center"
                style="max-height:calc(100vh - 48px - 52px - 16px)"
            >
                <v-img
                    width="320"
                    height="320"
                    class="rounded flex-shrink-1"
                    aspect-ratio="1"
                    :src="previewAudioCover"
                >
                    <template v-slot:placeholder>
                        <div class="d-flex justify-center align-center rounded bg-primary-darken-1 mx-auto" style="height:320px;max-height:100%;aspect-ratio:1/1">
                            <v-icon icon="$mdiMusic" size="108" color="white"></v-icon>
                        </div>
                    </template>
                </v-img>
                <div class="my-4 text-center">
                    <div class="text-h5">{{ previewAudioTitle || removeSuffix(previewItem.name, `.${previewItem.ext}`) }}</div>
                    <div
                        v-if="previewAudioArtist"
                        class="text-subtitle-1 text-truncate"
                        style="max-width:calc(min(960px, calc(100vw - 32px)) - 48px)"
                        :title="previewAudioArtist"
                    >{{ previewAudioArtist }}</div>
                    <div
                        v-if="previewAudioAlbum"
                        class="text-subtitle-1 text-truncate"
                        style="max-width:calc(min(960px, calc(100vw - 32px)) - 48px)"
                        :title="previewAudioAlbum"
                    >{{ previewAudioAlbum }}</div>
                </div>
                <v-slider
                    class="flex-grow-1 mb-4 w-100"
                    color="primary"
                    hide-details
                    min="0"
                    :max="previewAudioDuration"
                    :model-value="previewAudioCurrent"
                    @update:modelValue="e => previewAudioCurrent = previewAudio.currentTime = e"
                >
                    <template v-slot:prepend>{{ formatAudioTime(previewAudio.currentTime) }}</template>
                    <template v-slot:append>{{ formatAudioTime(previewAudioDuration) }}</template>
                </v-slider>
                <div class="d-flex align-center">
                    <v-btn
                        :icon="previewAudioShuffle ? '$mdiShuffle' : '$mdiShuffleDisabled'"
                        variant="plain"
                        class="mx-1"
                        @click="previewAudioShuffle = !previewAudioShuffle"
                    ></v-btn>
                    <v-btn
                        icon="$mdiSkipPrevious"
                        variant="plain"
                        class="mx-1"
                        @click="updateAudioTags((previewItem = previewAudioPrev(previewItem)))"
                    ></v-btn>
                    <v-btn
                        :icon="previewAudioPaused ? '$mdiPlay' : '$mdiPause'"
                        color="primary"
                        elevation="0"
                        class="mx-1"
                        @click="previewAudioPaused ? previewAudio.play() : previewAudio.pause(); previewAudioPaused = !previewAudioPaused"
                    ></v-btn>
                    <v-btn
                        icon="$mdiSkipNext"
                        variant="plain"
                        class="mx-1"
                        @click="updateAudioTags((previewItem = previewAudioNext(previewItem)))"
                    ></v-btn>
                    <v-btn
                        :icon="previewAudioRepeat ? '$mdiRepeat' : '$mdiRepeatOff'"
                        variant="plain"
                        class="mx-1"
                        @click="previewAudioRepeat = !previewAudioRepeat"
                    ></v-btn>
                </div>
            </v-card-text>
            <v-card-text
                v-else-if="previewMode === 'pdf'"
                class="py-4"
                style="max-height:calc(100vh - 48px - 52px - 16px)"
            >
                <embed
                    :src="previewItem.fullpath"
                    type="application/pdf"
                    class="rounded"
                    style="width:100%;height:calc(100vh - 48px - 52px - 48px)"
                >
            </v-card-text>
            <v-skeleton-loader
                v-else-if="previewMode === 'text'"
                :loading="previewSkeleton"
                type="paragraph, subtitle, sentences"
                class="overflow-y-auto"
                style="max-height:calc(100vh - 48px - 52px - 16px)"
            >
                <v-card-text
                    v-if="previewItem.ext === 'md' || codeLanguageTable[previewItem.ext]"
                    v-html="previewContent"
                    class="pt-0 markdown-body"
                    :class="{
                        'pb-0': previewItem.ext !== 'md',
                        'w-100': previewItem.ext === 'md',
                    }"
                ></v-card-text>
                <v-card-text v-else class="py-0 markdown-body">
                    <pre style="white-space:pre-wrap;word-break:keep-all"><code>{{ previewContent }}</code></pre>
                </v-card-text>
            </v-skeleton-loader>
        </v-card>
    </v-dialog>

    <v-dialog
        v-model="editDialog"
        width="min(960px, calc(100vw - 32px))"
    >
        <v-card>
            <v-card-title class="d-flex align-center">
                <v-icon
                    :color="getColorFromExt(editItem.ext)"
                    :icon="getIconFromExt(editItem.ext)"
                    class="mr-2 flex-shrink-0"
                ></v-icon>
                <span class="flex-grow-1 text-truncate" :title="editItem.name">
                    {{ editItem.filename }}
                </span>
                <v-btn
                    variant="plain"
                    :icon="editWrap ? '$mdiFormatTextWrappingWrap' : '$mdiFormatTextWrappingOverflow'"
                    density="comfortable"
                    @click="editWrap = !editWrap"
                ></v-btn>
                <v-btn
                    variant="plain"
                    icon="$mdiContentSave"
                    density="comfortable"
                    @click="saveEditContent"
                ></v-btn>
                <v-btn
                    variant="plain"
                    icon="$mdiClose"
                    density="comfortable"
                    @click="editDialog = false"
                ></v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <v-skeleton-loader
                :loading="editSkeleton"
                type="paragraph, subtitle, sentences"
                class="overflow-y-auto"
                style="max-height:calc(100vh - 48px - 52px - 16px)"
            >
                <v-card-text>
                    <textarea
                        v-model="editContent"
                        :wrap="editWrap ? 'soft' : 'off'"
                        style="font-family:ui-monospace,'Cascadia Mono','Segoe UI Mono','Liberation Mono',Menlo,Monaco,Consolas,sans-serif;width:100%;height:calc(100vh - 48px - 52px - 16px - 34px);resize:none;border:none;outline:none;font-size:1rem"
                    ></textarea>
                </v-card-text>
            </v-skeleton-loader>
        </v-card>
    </v-dialog>

    <audio
        ref="previewAudio"
        preload="metadata"
        class="d-none"
        :src="filelistPathsAudio.includes(previewItem) ? previewItem.fullpath : undefined"
        :autoplay="!previewAudioPaused"
        :loop="previewAudioRepeat"
        @error="$toast.error('Failed to load audio')"
        @play="previewAudioPaused = false"
        @pause="previewAudioPaused = true"
        @ended="previewAudioEnded"
        @loadedmetadata="previewAudioDuration = previewAudio.duration"
        @timeupdate="previewAudioCurrent = previewAudio.currentTime"
    ></audio>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, getCurrentInstance } from 'vue';
import { useRoute } from 'vue-router';
import { useDisplay } from 'vuetify';
import { marked } from 'marked';
import prism from 'prismjs';

import * as jsmediatags from '../mami-chan/index.js';

import { getExt, getIconFromExt, getColorFromExt, formatSize, formatTimestamp, pathPrefix, removePrefix, removeSuffix, debounce, codeLanguageTable } from '../common.js';
const { $dialog, $toast } = getCurrentInstance().appContext.config.globalProperties;

/**
 * @param {RequestInfo | URL} input
 * @param {RequestInit | undefined} init
 * @returns {Promise<Response>}
 */
const dufsfetch = (input, init = {}) => fetch(input, init)
    .then(r => {
        if (r.status >= 400) {
            const e = new Error(r.statusText);
            e.status = r.status;
            throw e;
        }
        return r;
    })
    .catch(e => {
        $toast.error(e.toString());
        throw e;
    });

/**
 * @typedef {{
 *      path_type: "Dir" | "SymlinkDir" | "File" | "SymlinkFile",
 *      name: String,
 *      mtime: Number,
 *      size: Number,
 *      is_dir: Boolean,
 *      is_symlink: Boolean,
 *      ext: String,
 *      fullpath: String,
 *      filename: String,
 * }} PathItem
 * @typedef {{
 *      allow_archive: Boolean,
 *      allow_delete: Boolean,
 *      allow_search: Boolean,
 *      allow_upload: Boolean,
 *      auth: Boolean,
 *      dir_exists: Boolean,
 *      href: String,
 *      kind: "Index" | "Edit",
 *      paths: PathItem[],
 *      uri_prefix: String,
 *      user: String | null,
 * }} DufsData
 */

const route = useRoute();
const display = useDisplay();

const filelistSkeleton = ref(false);
const readmeSkeleton = ref(false);
const previewSkeleton = ref(false);
const editSkeleton = ref(false);
const search = ref('');
const sortColumn = ref('');
const sortOrderDesc = ref(false);

/** @type {import('vue').Ref<DufsData>} */
const filelist = ref({
    paths: [],
});

const filelistPathsSorted = computed(() => {
    switch (sortColumn.value) {
        case 'name':
            // sorting - Natural sort of alphanumerical strings in JavaScript - Stack Overflow
            // https://stackoverflow.com/questions/2802341#answer-38641281
            const c = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
            return [...filelist.value.paths].sort((a, b) => c.compare(a[sortColumn.value], b[sortColumn.value]) * (sortOrderDesc.value ? -1 : 1));
        case 'mtime':
        case 'size':
            return [...filelist.value.paths].sort((a, b) => (a[sortColumn.value] - b[sortColumn.value]) * (sortOrderDesc.value ? -1 : 1));
        default:
            return filelist.value.paths;
    }
});

const readmeFilenames = new Set(['readme', 'readme.txt', 'readme.md']);

const readmeItem = computed(() => filelist.value.paths.find(e => !e.is_dir && readmeFilenames.has(e.filename.toLowerCase())));

/**
 * Start and end with /
 * @type {import('vue').Ref<String>}
 */
const currentPath = computed(() => route.params.path ? route.params.path.map(e => `/${e}`).join('') : '/');
/**
 * Start and end with /
 * @type {import('vue').Ref<String>}
 */
const currentPathWithoutPrefix = computed(() => '/' + removePrefix(currentPath.value, pathPrefix));

/**
 * @param {PathItem} e
 */
const additionalPathItem = e => {
    e.is_dir = e.path_type === 'Dir' || e.path_type === 'SymlinkDir';
    e.is_symlink = e.path_type === 'SymlinkDir' || e.path_type === 'SymlinkFile';
    e.ext = getExt(e.name).toLowerCase();
    e.fullpath = currentPath.value + e.name;
    e.filename = e.name.split('/').pop();
};

const updateFilelist = async () => {
    document.title = `Index of ${removeSuffix(currentPathWithoutPrefix.value, '/') || '/'} - dufs`;
    if (window.__INITIAL_DATA__) {
        filelist.value = window.__INITIAL_DATA__;
        delete window.__INITIAL_DATA__;
    } else {
        const sp = new URLSearchParams([
            ['json', ''],
        ])
        if (search.value) {
            sp.append('q', search.value);
        }
        // Don't show skeleton if loading time is less than 150ms
        const st = setTimeout(() => filelistSkeleton.value = true, 150);
        // console.time('Load filelist');
        filelist.value = await dufsfetch(`${__IS_PROD__ ? `${location.protocol}//${location.host}` : 'http://localhost:5000'}${currentPath.value}?${sp}`)
            .then(r => {
                if (r.status >= 400) throw new Error(r.statusText);
                return r.json();
            });
        // console.timeEnd('Load filelist');
        filelistSkeleton.value = false;
        clearTimeout(st);
    }
    filelist.value.paths.forEach(additionalPathItem);
};

const breadcrumb = computed(() => {
    const r = [{title: '/', href: pathPrefix}];
    let h = pathPrefix;
    for (const p of removeSuffix(currentPathWithoutPrefix.value, '/').split('/').slice(1)) {
        h += p + '/';
        r.push({title: p, href: h});
    }
    return r;
});

const previewDialog = ref(false);
const previewMode = ref('');
/** @type {import('vue').Ref<PathItem>} */
const previewItem = ref({});
const previewContent = ref('');

const editDialog = ref(false);
const editWrap = ref(false);
/** @type {import('vue').Ref<PathItem>} */
const editItem = ref({});
const editContent = ref('');

const readmeRichMode = ref(false);
const readmeContent = ref('');

watch(previewDialog, () => {
    if (!previewDialog.value) setTimeout(() => previewItem.value = {}, 250);
});

const updateReadme = async () => {
    if (!readmeItem.value) return;
    const st = setTimeout(() => readmeSkeleton.value = true, 150);
    const r = await dufsfetch(readmeItem.value.fullpath)
        .then(r => {
            if (r.status >= 400) throw new Error(r.statusText);
            return r.text();
        });
    readmeSkeleton.value = false;
    clearTimeout(st);
    if (readmeItem.value.ext === 'md') {
        readmeContent.value = marked.parse(r);
        readmeRichMode.value = true;
    } else {
        readmeContent.value = r;
        readmeRichMode.value = false;
    }
};

const updatePreviewContent = async () => {
    if (!previewItem.value.fullpath) return;
    const st = setTimeout(() => previewSkeleton.value = true, 150);
    const r = await dufsfetch(previewItem.value.fullpath)
        .then(r => {
            if (r.status >= 400) throw new Error(r.statusText);
            return r.text();
        });
    previewSkeleton.value = false;
    clearTimeout(st);
    if (previewItem.value.ext === 'md') {
        previewContent.value = marked.parse(r);
    } else {
        const lang = codeLanguageTable[previewItem.value.ext];
        if (lang && prism.languages[lang]) {
            previewContent.value = `<pre class="line-numbers language-${lang} w-100" style="background:none"><code class="language-${lang}">${prism.highlight(r, prism.languages[lang], lang)}</code></pre>`;
            nextTick(() => prism.highlightAll());
        } else {
            previewContent.value = r;
        }
    }
};

const updateEditContent = async () => {
    if (!editItem.value.fullpath) return;
    const st = setTimeout(() => editSkeleton.value = true, 150);
    const r = await dufsfetch(editItem.value.fullpath)
        .then(r => {
            if (r.status >= 400) throw new Error(r.statusText);
            return r.text();
        });
    editSkeleton.value = false;
    clearTimeout(st);
    editContent.value = r;
};

const saveEditContent = async () => {
    if (!editItem.value.fullpath) return;
    editDialog.value = false;
    await dufsfetch(
        editItem.value.fullpath,
        {
            method: 'PUT',
            body: editContent.value,
        },
    )
        .then(r => {
            if (r.status >= 400) throw new Error(r.statusText);
            return r.text();
        });
    $toast.success(`${editItem.value.name} has been saved.`);
    await updateFilelist();
};

onMounted(updateFilelist);
onMounted(updateReadme);
watch(currentPath, updateFilelist);
watch(search, debounce(updateFilelist, 250));
watch(readmeItem, updateReadme);

/**
 * @param {PathItem} e
 */
const deleteFile = async e => {
    if (!(await $dialog.promises.confirm(`Are you sure to delete ${e.name}?`, e.is_dir ? 'Delete folder' : 'Delete file'))) return;
    await dufsfetch(
        e.fullpath,
        {
            method: 'DELETE',
        }
    ).then(r => {
        if (r.status >= 400) throw new Error(r.statusText);
    });
    await updateFilelist();
};

/**
 * @param {PathItem} e
 */
const moveFile = async e => {
    const path = await $dialog.promises.prompt('Path', 'Move to new path', {value: e.name});
    if (!path) return;
    await dufsfetch(
        e.fullpath,
        {
            method: 'MOVE',
            headers: {
                'Destination': encodeURI(currentPath.value + path),
            },
        }
    ).then(r => {
        if (r.status >= 400) throw new Error(r.statusText);
    });
    $toast.success(`${e.is_dir ? 'Folder' : 'File'} moved.`);
    await updateFilelist();
};

/**
 * @param {File[]} files
 */
const uploadFiles = async files => {
    await Promise.all(files.map(e => dufsfetch(
        currentPath.value + e.name,
        {
            method: 'PUT',
            body: e,
        },
    )));
    $toast.success(`${files.length} files have been uploaded.`);
    await updateFilelist();
};
const uploadFilesSelectResolve = ref(() => {});
const uploadFilesClick = async () => {
    let t;
    /** @type {File[]} */
    const files = Array.from(await new Promise(resolve => {
        document.getElementById('upload').value = null;
        document.getElementById('upload').click();
        uploadFilesSelectResolve.value = resolve;
        t = setTimeout(() => resolve([]), 5 * 60 * 1000);
    }));
    clearTimeout(t);
    if (!files.length) return;
    await uploadFiles(files);
};
document.body.addEventListener('dragenter', e => e.preventDefault());
document.body.addEventListener('dragover', e => e.preventDefault());
document.body.addEventListener('drop', async e => {
    e.preventDefault();
    if (!filelist.value.allow_upload) {
        return $toast.warning('File uploading is disabled.');
    };
    const files = Array.from(e.dataTransfer.files).filter(e => e.size || e.type);
    if (
        !files.length ||
        !(await $dialog.promises.confirm(
            `Are you sure to upload these files?<br><ul style="list-style-position:inside">${files.map(e => `<li>${e.name} (${formatSize(e.size)})</li>`).join('')}</ul>`,
            'Upload files',
            {
                rawHtml: true,
            }
        ))
    ) return;
    await uploadFiles(files);
});

const createFolder = async () => {
    const path = await $dialog.promises.prompt('Folder name', 'Create new folder');
    if (!path) return;
    await dufsfetch(
        currentPath.value + path,
        {
            method: 'MKCOL',
        }
    ).then(r => {
        if (r.status >= 400) throw new Error(r.statusText);
    });
    $toast.success('New folder created.');
    await updateFilelist();
};

const previewAudioPaused = ref(true);
const previewAudioShuffle = ref(false);
const previewAudioRepeat = ref(false);
const previewAudioCurrent = ref(0);
const previewAudioDuration = ref(0);
const previewAudioCover = ref(null);
const previewAudioTitle = ref('');
const previewAudioArtist = ref('');
const previewAudioAlbum = ref('');
/** @type {import('vue').Ref<HTMLAudioElement>} */
const previewAudio = ref(null);
const formatAudioTime = t => {
    t = t || 0;
    return `${Math.floor(t / 60).toString().padStart(2, 0)}:${(Math.round(t) % 60).toString().padStart(2, 0)}`;
};
watch(previewDialog, () => {
    previewAudio.value.pause();
});
const filelistPathsAudio = computed(() => filelistPathsSorted.value.filter(e => (new Set(['mp3', 'm4a', 'ogg', 'weba', 'oga', 'flac', 'opus'])).has(e.ext)));
const previewAudioPrev = e => {
    const index = filelistPathsAudio.value.indexOf(e);
    return filelistPathsAudio.value[index === 0 ? (filelistPathsAudio.value.length - 1) : (index - 1)];
};
const previewAudioNext = e => {
    const index = filelistPathsAudio.value.indexOf(e);
    return filelistPathsAudio.value[index === filelistPathsAudio.value.length - 1 ? 0 : (index + 1)];
};
const previewAudioEnded = async () => {
    if (filelistPathsAudio.value.length === 1) {
        previewAudioPaused.value = true;
        previewAudio.value.currentTime = 0;
    } else {
        let next;
        if (previewAudioShuffle.value) {
            const p = filelistPathsAudio.value.filter(e => e !== previewItem.value);
            next = p[Math.floor(Math.random() * p.length)];
        } else {
            next = previewAudioNext(previewItem.value);
        }
        updateAudioTags((previewItem.value = next));
        let r;
        await new Promise(resolve => previewAudio.value.addEventListener('loadedmetadata', (r = resolve)));
        previewAudio.value.removeEventListener('loadedmetadata', r);
        previewAudio.value.play();
    }
};

/**
 * @param {PathItem} e
 */
const updateAudioTags = async e => {
    try {
        /**
         * @type {{
         *      title: String,
         *      artist: String,
         *      album: String,
         *      picture: {
         *          format: String,
         *          data: Number[],
         *      },
         * }}
         */
        const tags = await new Promise(
            (resolve, reject) => (new jsmediatags.Reader(`${__IS_PROD__ ? `${location.protocol}//${location.host}` : 'http://localhost:5000'}${e.fullpath}`))
                .setTagsToRead(['title', 'artist', 'album', 'picture'])
                .read({
                    onSuccess: e => resolve(e.tags),
                    onError: reject,
                })
        );
        previewAudioTitle.value = tags.title;
        previewAudioArtist.value = tags.artist;
        previewAudioAlbum.value = tags.album;
        URL.revokeObjectURL(previewAudioCover.value);
        previewAudioCover.value = tags.picture ? URL.createObjectURL(new Blob([(new Uint8Array(tags.picture.data)).buffer], {type: tags.picture.format})) : null;
    } catch (err) {
        $toast.error(`Failed to read audio metadata: ${err.info || err}`);
        previewAudioTitle.value = '';
        previewAudioArtist.value = '';
        previewAudioAlbum.value = '';
        URL.revokeObjectURL(previewAudioCover.value);
        previewAudioCover.value = '';
    }
};

</script>