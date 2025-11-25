<template>
    <Teleport to="#app-bar-append">
        <v-menu
            activator="#upload-btn"
            v-model="uploadlistMenu"
            open-delay="0"
            open-on-focus
            open-on-hover
            :close-on-content-click="false"
        >
            <template v-slot:activator="{ props: menu }">
                <v-tooltip
                    v-if="filelist.allow_upload"
                    :text="t('titleUploadFile')"
                >
                    <template v-slot:activator="{ props: tooltip }">
                        <v-btn
                            id="upload-btn"
                            v-bind="mergeProps(menu, tooltip)"
                            variant="text"
                            icon="$mdiUpload"
                            @mousedown="uploadFilesDown"
                            @mouseup="uploadFilesUp"
                            @touchstart="e => e.preventDefault() || uploadFilesDown()"
                            @touchend="e => e.preventDefault() || uploadFilesUp()"
                        >
                            <v-badge
                                v-if="uploadlist.filter(e => !e.uploaded && !e.aborted && !e.fail).length"
                                :content="uploadlist.filter(e => !e.uploaded && !e.aborted && !e.fail).length"
                            >
                                <v-icon icon="$mdiUpload"></v-icon>
                            </v-badge>
                            <v-icon v-else icon="$mdiUpload"></v-icon>
                        </v-btn>
                        <input
                            id="upload"
                            class="d-none"
                            type="file"
                            multiple
                            @change="e => uploadFilesSelectResolve(e.target.files)"
                        >
                    </template>
                </v-tooltip>
            </template>
            <v-list
                v-show="uploadlist.length"
                lines="two"
                item-props
                width="min(480px, calc(100vw - 24px))"
                max-height="540"
            >
                <v-list-item v-for="e, i in uploadlist" v-ripple>
                    <template v-slot:prepend>
                        <v-avatar :color="getColorFromExt(getExt(e.file.name))">
                            <v-icon
                                color="white"
                                :icon="getIconFromExt(getExt(e.file.name))"
                                class="flex-shrink-0"
                            ></v-icon>
                        </v-avatar>
                    </template>
                    <v-list-item-title>
                        <span :title="e.file.name">{{ e.file.name }}</span>
                    </v-list-item-title>
                    <v-list-item-subtitle style="opacity:1">
                        <span v-if="e.uploaded" class="text-success">{{ t('dialogUploadSucceed') }}</span>
                        <span v-else-if="e.fail" class="text-error">{{ t(e.fail) }}</span>
                        <span v-else-if="!e.xhr" style="opacity:var(--v-list-item-subtitle-opacity, var(--v-medium-emphasis-opacity))">{{ t('dialogUploadPending') }}</span>
                        <template v-else>
                            <span v-if="display.smAndUp.value" style="opacity:var(--v-list-item-subtitle-opacity, var(--v-medium-emphasis-opacity))">{{ formatSize(e.loaded) }} / {{ formatSize(e.file.size) }} | {{ `${Math.round(e.loaded / e.file.size * 1e4) / 1e2}%` }} | {{ formatSize(Math.round(e.speed)) }}/s</span>
                            <span v-else style="opacity:var(--v-list-item-subtitle-opacity, var(--v-medium-emphasis-opacity))">{{ formatSize(e.loaded) }} / {{ formatSize(e.file.size) }}</span>
                            <v-progress-linear
                                :model-value="e.loaded / e.file.size * 100"
                                color="primary"
                                rounded
                            ></v-progress-linear>
                        </template>
                    </v-list-item-subtitle>
                    <template v-slot:append>
                        <v-btn
                            color="grey"
                            icon="$mdiClose"
                            variant="text"
                            class="ml-4"
                            @click="() => {
                                if (!e.uploaded) {
                                    e.aborted = true;
                                    if (e.xhr) e.xhr.abort();
                                }
                                uploadlist.splice(i, 1);
                            }"
                        ></v-btn>
                    </template>
                </v-list-item>
            </v-list>
        </v-menu>
        <v-tooltip
            v-if="filelist.allow_upload"
            :text="t('titleCreateFolder')"
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
            :text="t('titleDownloadArchive')"
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

        <v-tooltip
            v-if="filelist.auth"
            :text="filelist.user ? t('titleLogout', [filelist.user]) : t('titleLogin')"
        >
            <template v-slot:activator="{ props }">
                <v-btn
                    v-bind="props"
                    variant="text"
                    :icon="filelist.user ? '$mdiLogout' : '$mdiLogin'"
                    @click="filelist.user ? logout() : login()"
                ></v-btn>
            </template>
        </v-tooltip>
    </Teleport>

    <v-card class="my-4" :style="glassmorphismFilelist">
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
                        :to="pathPrefix"
                        :active="false"
                    ></v-btn>
                    <v-btn
                        variant="text"
                        icon="$mdiRefresh"
                        density="comfortable"
                        @click="updateFilelist().then(() => $toast.success(t('toastRefreshSuccess')))"
                    ></v-btn>
                    <div class="mx-1"></div>
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
                    :label="t('headerSearch')"
                    :append-inner-icon="search ? '$mdiCloseCircle' : '$mdiMagnify'"
                    @click:append-inner="search = ''"
                ></v-text-field>
            </div>
        </div>

        <v-skeleton-loader
            :loading="filelistSkeleton"
            type="table-tbody"
        >
            <v-table
                class="w-100"
                :class="{'overflow-x-auto': display.xs.value}"
                style="font-size:1rem;background-color:transparent"
            >
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
                                {{ t('headerName') }}
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
                            {{ t('headerLastModified') }}
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
                                {{ t('headerSize') }}
                                <v-icon
                                    v-if="sortColumn === 'size'"
                                    :icon="sortOrderDesc ? '$mdiSortNumericDescending' : '$mdiSortNumericAscending'"
                                    color="grey"
                                    size="small"
                                ></v-icon>
                            </span>
                        </th>
                        <th class="text-no-wrap text-right">{{ t('headerActions') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="p in filelistPathsSorted.slice((filelistPage - 1) * filelistPageSize, filelistPage * filelistPageSize)"
                        v-ripple
                    >
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
                        <td class="text-no-wrap text-right">{{ p.is_dir ? t('headerSizeSubdirectoryItems', [p.size > 999 ? '>999' : p.size], p.size) : formatSize(p.size) }}</td>
                        <td class="text-no-wrap text-right">
                            <v-tooltip
                                v-if="previewableImageExts.has(p.ext)"
                                :text="t('actionViewImage')"
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
                                v-if="previewableVideoExts.has(p.ext)"
                                :text="t('actionPlayVideo')"
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
                                v-if="previewableAudioExts.has(p.ext)"
                                :text="t('actionPlayAudio')"
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
                                :text="t('actionViewFile')"
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
                                    previewableTextFilenames.has(p.filename.toLowerCase())
                                    || previewableTextExts.has(p.ext)
                                    || codeLanguageTable[p.ext]
                                "
                                :text="t('actionViewFile')"
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
                                v-if="previewableFontExts.has(p.ext)"
                                :text="t('actionViewFile')"
                            >
                                <template v-slot:activator="{ props }">
                                    <v-btn
                                        v-bind="props"
                                        variant="plain"
                                        icon="$mdiFileSearch"
                                        density="comfortable"
                                        @click="previewDialog = true; previewMode = 'font'; previewItem = p"
                                    ></v-btn>
                                </template>
                            </v-tooltip>
                            <v-tooltip
                                v-if="
                                    filelist.allow_upload
                                    && filelist.allow_delete
                                    && p.size < 1048576
                                    && (
                                        previewableTextFilenames.has(p.filename.toLowerCase())
                                        || previewableTextExts.has(p.ext)
                                        || codeLanguageTable[p.ext]
                                    )
                                "
                                :text="t('actionEditFile')"
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
                                :text="t('actionMove')"
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
                                :text="t(p.is_dir ? 'actionDeleteFolder' : 'actionDeleteFile')"
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
                                v-if="((p.is_dir && filelist.allow_archive) || !p.is_dir) && filelist.user"
                                :text="t('actionCopyLinkWithToken')"
                            >
                                <template v-slot:activator="{ props }">
                                    <v-btn
                                        v-bind="props"
                                        variant="plain"
                                        icon="$mdiLinkBoxVariant"
                                        density="comfortable"
                                        @click="copyLinkWithToken(p)"
                                    ></v-btn>
                                </template>
                            </v-tooltip>
                            <v-tooltip
                                v-if="p.is_dir && filelist.allow_archive"
                                :text="t('actionDownloadArchive')"
                            >
                                <template v-slot:activator="{ props }">
                                    <v-btn
                                        v-bind="props"
                                        variant="plain"
                                        icon="$mdiFolderDownload"
                                        density="comfortable"
                                        :href="currentPath + encodeURIComponent(p.name) + '/?zip'"
                                        :download="p.filename + '.zip'"
                                    ></v-btn>
                                </template>
                            </v-tooltip>
                            <v-tooltip
                                v-if="!p.is_dir"
                                :text="t('actionDownloadFile')"
                            >
                                <template v-slot:activator="{ props }">
                                    <v-btn
                                        v-bind="props"
                                        variant="plain"
                                        icon="$mdiDownload"
                                        density="comfortable"
                                        :href="currentPath + encodeURIComponent(p.name)"
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

    <v-card v-if="readmeItem" class="my-4" :style="glassmorphismReadme">
        <v-card-title class="d-flex align-center text-subtitle-1">
            <v-icon icon="$mdiBookOpenVariant" size="small" class="mr-2"></v-icon>
            <span class="flex-grow-1">{{ readmeItem.filename }}</span>
            <v-btn
                variant="text"
                density="comfortable"
                :icon="readmeExpand ? '$mdiChevronUp' : '$mdiChevronDown'"
                @click="readmeExpand = !readmeExpand"
            ></v-btn>
        </v-card-title>
        <v-expand-transition>
            <div v-show="readmeExpand">
                <v-skeleton-loader
                    :loading="readmeSkeleton"
                    type="article"
                >
                    <v-divider></v-divider>
                    <v-card-text v-if="readmeRichMode" v-html="readmeContent" class="markdown-body w-100"></v-card-text>
                    <v-card-text v-else>
                        <pre style="white-space:pre-wrap;word-break:keep-all"><code v-html="readmeContent"></code></pre>
                    </v-card-text>
                </v-skeleton-loader>
            </div>
        </v-expand-transition>
    </v-card>

    <v-pagination
        v-if="filelistPageCount > 1"
        class="my-4"
        active-color="primary"
        prev-icon="$mdiChevronLeft"
        next-icon="$mdiChevronRight"
        :density="display.xs.value ? 'compact' : (display.width.value < 768 ? 'comfortable' : 'default')"
        :total-visible="display.xs.value ? 5 : (display.smAndDown.value ? 7 : 9)"
        v-model="filelistPage"
        :length="filelistPageCount"
        @mousedown="filelistPageDown"
        @mouseup="filelistPageUp"
        @touchstart="e => e.preventDefault() || filelistPageDown()"
        @touchend="e => e.preventDefault() || filelistPageUp()"
    ></v-pagination>

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
                        :icon="{
                            once: '$mdiRepeatOnce',
                            on: '$mdiRepeat',
                            off: '$mdiRepeatOff',
                        }[previewAudioRepeat]"
                        variant="plain"
                        class="mx-1"
                        @click="previewAudioRepeat = {
                            once: 'on',
                            on: 'off',
                            off: 'once',
                        }[previewAudioRepeat]"
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
            <v-card-text
                v-else-if="previewMode === 'font'"
                class="py-4"
                style="max-height:calc(100vh - 48px - 52px - 16px)"
            >
                <div
                    class="text-center mb-4"
                    :style="{
                        fontFamily: `${previewFontFamily},Adobe NotDef`,
                        fontSize: `${previewFontSize}px`,
                        fontWeight: previewFontWeight,
                        fontStyle: previewFontItalic ? 'italic' : undefined,
                    }"
                >
                    The quick brown fox jumps over the lazy dog.
                    <br>
                    0123456789.:,;'"(!?)+-*/=
                    <br>
                    {{ t('fontPreviewText') }}
                    <br>
                    <template v-if="previewFontText">{{ previewFontText }}</template>
                    <span v-else class="text-disabled">{{ t('fontPreviewTextPlaceholder') }}</span>
                </div>
                <v-divider></v-divider>
                <v-text-field
                    v-model="previewFontText"
                    :placeholder="t('fontPreviewTextPlaceholder')"
                    variant="underlined"
                    color="primary"
                >
                    <template v-slot:append-inner>
                        <v-btn
                            icon="$mdiFormatItalic"
                            variant="text"
                            :color="previewFontItalic ? 'primary' : undefined"
                            density="compact"
                            @click="previewFontItalic = !previewFontItalic"
                        ></v-btn>
                    </template>
                </v-text-field>
                <v-slider
                    v-model="previewFontSize"
                    color="primary"
                    thumb-label
                    :step="1"
                    :min="0"
                    :max="72"
                >
                    <template v-slot:thumb-label="{ modelValue }">
                        <span class="text-white">{{ modelValue }}</span>
                    </template>
                    <template v-slot:prepend>{{ t('fontPreviewSize') }}</template>
                    <template v-slot:append>
                        <v-text-field
                            v-model="previewFontSize"
                            density="compact"
                            color="primary"
                            type="number"
                            variant="outlined"
                            hide-details
                            :min="0"
                            :max="72"
                            width="5em"
                        ></v-text-field>
                    </template>
                </v-slider>
                <v-slider
                    v-model="previewFontWeight"
                    color="primary"
                    thumb-label
                    show-ticks="always"
                    :tick-size="4"
                    :step="100"
                    :min="100"
                    :max="900"
                    hide-details
                >
                    <template v-slot:thumb-label="{ modelValue }">
                        <span class="text-white">{{ modelValue }}</span>
                    </template>
                    <template v-slot:prepend>{{ t('fontPreviewWeight') }}</template>
                    <template v-slot:append>
                        <v-select
                            v-if="display.smAndUp.value"
                            v-model="previewFontWeight"
                            :items="[
                                { title: '100 (Thin)', value: 100 },
                                { title: '200 (Extra Light)', value: 200 },
                                { title: '300 (Light)', value: 300 },
                                { title: '400 (Regular)', value: 400 },
                                { title: '500 (Medium)', value: 500 },
                                { title: '600 (Semi Bold)', value: 600 },
                                { title: '700 (Bold)', value: 700 },
                                { title: '800 (Extra Bold)', value: 800 },
                                { title: '900 (Black)', value: 900 },
                            ]"
                            menu-icon="$mdiChevronDown"
                            color="primary"
                            variant="outlined"
                            density="compact"
                            hide-details
                            width="12em"
                        ></v-select>
                    </template>
                </v-slider>
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
                        style="font-family:ui-monospace,'Cascadia Mono','JetBrains Mono','Segoe UI Mono','Liberation Mono',Menlo,Monaco,Consolas,sans-serif;width:100%;height:calc(100vh - 48px - 52px - 16px - 34px);resize:none;border:none;outline:none;font-size:1rem"
                    ></textarea>
                </v-card-text>
            </v-skeleton-loader>
        </v-card>
    </v-dialog>

    <audio
        ref="previewAudio"
        preload="metadata"
        class="d-none"
        :src="filelistPathsAudio.map(e => e.fullpath).includes(previewItem.fullpath) ? previewItem.fullpath : undefined"
        :autoplay="!previewAudioPaused"
        :loop="previewAudioRepeat === 'on'"
        @error="$toast.error(t('toastFailedLoadAudio'))"
        @play="previewAudioPaused = false"
        @pause="previewAudioPaused = true"
        @ended="previewAudioEnded"
        @loadedmetadata="previewAudioDuration = previewAudio.duration"
        @timeupdate="previewAudioCurrent = previewAudio.currentTime"
    ></audio>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, getCurrentInstance, mergeProps, reactive, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';
import { marked } from 'marked';
import prism from 'prismjs';
import { useI18n } from 'petite-vue-i18n';
import * as jsmediatags from '../mami-chan/index.js';
import Uploader from '../uploader.js';
import NotDefFont from '../assets/AND-Regular.woff2?inline';
import {
    getExt,
    getIconFromExt,
    getColorFromExt,
    formatSize,
    formatTimestamp,
    pathPrefix,
    removePrefix,
    removeSuffix,
    debounce,
    codeLanguageTable,
    previewableImageExts,
    previewableVideoExts,
    previewableAudioExts,
    previewableTextExts,
    previewableFontExts,
    previewableTextFilenames,
    readmeFilenames,
} from '../common.js';

const { $dialog, $toast } = getCurrentInstance().appContext.config.globalProperties;
const { t } = useI18n();

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
const router = useRouter();
const display = useDisplay();

const glassmorphismFilelist = computed(() => {
    const e = window.__DUFS_MATERIAL_CONFIG__?.glassmorphism?.filelist;
    return e ? {
        backdropFilter: `blur(${e.blur}px)`,
        backgroundColor: `color-mix(in srgb, rgb(var(--v-theme-surface)) ${e.alpha * 100}%, transparent) !important`,
    } : {};
});
const glassmorphismReadme = computed(() => {
    const e = window.__DUFS_MATERIAL_CONFIG__?.glassmorphism?.readme;
    return e ? {
        backdropFilter: `blur(${e.blur}px)`,
        backgroundColor: `color-mix(in srgb, rgb(var(--v-theme-surface)) ${e.alpha * 100}%, transparent) !important`,
    } : {};
});

const filelistSkeleton = ref(false);
const readmeSkeleton = ref(false);
const previewSkeleton = ref(false);
const editSkeleton = ref(false);
const search = ref('');
const sortColumn = ref('');
const sortOrderDesc = ref(false);

/** @type {import('vue').Ref<DufsData>} */
const filelist = shallowRef({
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
const filelistPageSize = window.__DUFS_MATERIAL_CONFIG__?.limit || Infinity;
const filelistPageCount = computed(() => Math.ceil(filelistPathsSorted.value.length / filelistPageSize));
const filelistPage = ref(1);
let filelistPageTimer = null;
const filelistPageDown = () => filelistPageTimer = setTimeout(() => filelistPageTimer = null, 500);
const filelistPageUp = async () => {
    if (filelistPageTimer === null) {
        const page = parseInt(await $dialog.promises.prompt(t('dialogPageSkipLabel', [1, filelistPageCount.value]), t('titlePageSkip')));
        if (!isNaN(page) && 1 <= page && page <= filelistPageCount.value) filelistPage.value = page;
    };
};

const readmeItem = computed(() => filelist.value.paths.find(e => !e.is_dir && readmeFilenames.has(e.filename.toLowerCase())));

/**
 * Start and end with /
 * @type {import('vue').Ref<String>}
 */
const currentPath = computed(() => route.params.path ? route.params.path.map(e => `/${encodeURIComponent(e)}`).join('') : '/');
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
    e.fullpath = currentPath.value + encodeURIComponent(e.name);
    e.filename = e.name.split('/').pop();
};

const updateFilelist = async () => {
    // 不允许路径不以/结尾
    if (!route.path.endsWith('/')) {
        return await router.replace(route.path + '/');
    }
    // 也不允许路径以多个/结尾
    if (route.path.match(/\/{2,}$/)) {
        return await router.replace(route.path.replace(/\/{2,}$/, '/'));
    }
    document.title = (window.__DUFS_MATERIAL_CONFIG__?.document || 'Index of ${path} - dufs').replaceAll('${path}', decodeURIComponent(removeSuffix(currentPathWithoutPrefix.value, '/')) || '/');
    let items;
    if (window.__INITIAL_DATA__) {
        items = window.__INITIAL_DATA__;
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
        items = await dufsfetch(`${currentPath.value}?${sp}`).then(r => {
            // 使用 render-try-index 时，带有 index.html 的目录不会返回 JSON 而是直接返回 HTML 文件的内容
            if (!r.headers.get('Content-Type').startsWith('application/json')) {
                location.href = currentPath.value;
                return;
            }
            return r.json();
        });
        if (!items) return;
        // console.timeEnd('Load filelist');
        filelistSkeleton.value = false;
        clearTimeout(st);
    }
    items.paths.forEach(additionalPathItem);
    filelist.value = items;
};
const updateFilelistResetPage = () => updateFilelist().then(() => filelistPage.value = 1);

const breadcrumb = computed(() => {
    const r = [{title: '/', href: pathPrefix}];
    let h = pathPrefix;
    for (const p of removeSuffix(currentPathWithoutPrefix.value, '/').split('/').slice(1)) {
        h += p + '/';
        r.push({ title: decodeURIComponent(p), href: h });
    }
    return r;
});

const previewDialog = ref(false);
const previewMode = ref('');
/** @type {import('vue').Ref<PathItem>} */
const previewItem = ref({});
const previewContent = ref('');

const editDialog = ref(false);
const editWrap = ref(true);
/** @type {import('vue').Ref<PathItem>} */
const editItem = ref({});
const editContent = ref('');

const readmeExpand = ref(true);
const readmeRichMode = ref(false);
const readmeContent = ref('');

watch(previewDialog, () => {
    if (!previewDialog.value) setTimeout(() => previewItem.value = {}, 250);
});

const updateReadme = async () => {
    if (!readmeItem.value) return;
    const st = setTimeout(() => readmeSkeleton.value = true, 150);
    const r = await dufsfetch(`${readmeItem.value.fullpath}`).then(r => r.text());
    readmeSkeleton.value = false;
    clearTimeout(st);
    if (readmeItem.value.ext === 'md') {
        readmeContent.value = marked.parse(r);
        readmeRichMode.value = true;
    } else {
        readmeContent.value = r
            // Can I escape HTML special chars in JavaScript? - Stack Overflow
            // https://stackoverflow.com/questions/6234773#follow-up-138256465
            .replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)
            // javascript - What is the easiest way to replace a url string (in a text) with an anchor tag? - Stack Overflow
            // https://stackoverflow.com/questions/7331192#answer-7331361
            .replace(
                /(\b(https?|ftp|file):\/\/[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%=~_|])/img,
                '<a href="$1" style="color:rgb(var(--v-theme-primary))">$1</a>',
            );
        readmeRichMode.value = false;
    }
};

const updatePreviewContent = async () => {
    if (!previewItem.value.fullpath) return;
    const st = setTimeout(() => previewSkeleton.value = true, 150);
    const r = await dufsfetch(previewItem.value.fullpath).then(r => r.text());;
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
    const r = await dufsfetch(editItem.value.fullpath).then(r => r.text());
    editSkeleton.value = false;
    clearTimeout(st);
    editContent.value = r;
};

// FIXME: Vite的proxy server似乎不能处理非标准HTTP method（直接返回400，甚至没有响应头）
// 但是这两个应该没有问题

// FIXME: 在Firefox上，弹出登录对话框后点击取消或什么都不填就确认多次，之后不会再弹出登录对话框，除非重启浏览器或Ctrl+F5
const login = async () => {
    await dufsfetch(`${currentPath.value}?${new URLSearchParams([['login', '']])}`, { method: 'CHECKAUTH' });
    await updateFilelist();
};

const logout = async () => {
    if (!(await $dialog.promises.confirm(t('dialogLogout', [filelist.value.user]), t('actionLogout')))) return;
    await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest;
        xhr.onload = resolve;
        xhr.onerror = reject;
        xhr.open('LOGOUT', `${currentPath.value}`, true, filelist.value.user);
        xhr.send();
    });
    await updateFilelist();
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
    ).then(r => r.text());
    $toast.success(t('toastSaveEdit', [editItem.value.name]));
    await updateFilelist();
};

onMounted(updateFilelist);
onMounted(updateReadme);

watch(currentPath, updateFilelistResetPage);
watch(search, debounce(updateFilelistResetPage, 250));
watch(readmeItem, updateReadme);

/**
 * @param {PathItem} e
 */
const deleteFile = async e => {
    if (!(await $dialog.promises.confirm(t('dialogDeleteConfirm', [e.name]), t(e.is_dir ? 'actionDeleteFolder' : 'actionDeleteFile')))) return;
    await dufsfetch(e.fullpath, { method: 'DELETE' });
    await updateFilelist();
};

/**
 * @param {PathItem} e
 */
const moveFile = async e => {
    const path = await $dialog.promises.prompt(t('dialogMoveLabel'), t('actionMove'), {value: '/' + decodeURIComponent(removePrefix(e.fullpath, pathPrefix))});
    if (!path) return;
    const pathParts = removePrefix(path.startsWith('/') ? (pathPrefix + removePrefix(path, '/')) : (currentPath.value + path), '/').split('/');
    const pathResolvedParts = [];
    for (const part of pathParts) {
        if (part === '.') {
            continue;
        } else if (part === '..') {
            pathResolvedParts.pop();
        } else {
            pathResolvedParts.push(part);
        }
    }
    await dufsfetch(
        e.fullpath,
        {
            method: 'MOVE',
            headers: {
                'Destination': '/' + pathResolvedParts.map(encodeURIComponent).join('/'),
            },
        }
    );
    $toast.success(t(e.is_dir ? 'toastMoveFolder' : 'toastMoveFile'));
    await updateFilelist();
};

/**
 * @param {PathItem} e
 */
const copyLinkWithToken = async e => {
    const token = await dufsfetch(`${e.fullpath}?${e.is_dir ? 'zip&' : ''}tokengen`).then(r => r.text());
    await navigator.clipboard.writeText(`${location.protocol}//${location.host}${e.fullpath}?${e.is_dir ? 'zip&' : ''}token=${token}`);
    $toast.success(t('toastCopyLinkWithToken', [formatTimestamp(parseInt(token.substring(128, 144), 16))]));
};

/**
 * @type {import('vue').Ref<Uploader[]>}
 */
const uploadlist = ref([]);
const uploadFilesSelectResolve = ref(() => {});
const uploadFilesClick = async () => {
    /** @type {File[]} */
    const files = Array.from(await new Promise(resolve => {
        document.getElementById('upload').value = null;
        document.getElementById('upload').click();
        uploadFilesSelectResolve.value = resolve;
    }));
    if (!files.length) return;
    files
        .map(file => {
            const cp = currentPath.value;
            return new Uploader(
                cp + encodeURIComponent(file.name),
                file,
                () => currentPath.value === cp && updateFilelist(),
            );
        })
        .forEach(e => {
            const r = reactive(e);
            uploadlist.value.push(r);
            r.upload();
        });
};
document.body.addEventListener('dragenter', e => e.preventDefault());
document.body.addEventListener('dragover', e => e.preventDefault());
document.body.addEventListener('drop', async e => {
    e.preventDefault();
    if (!filelist.value.allow_upload) {
        return $toast.warning(t('toastUploadDisabled'));
    };
    /** @type {(items: (FileSystemDirectoryEntry | FileSystemFileEntry)[], arr: [String, File][]) => Promise<[String, File][]>} */
    const readEntries = async (entries, arr = []) => {
        for (const entry of entries) {
            if (entry.isDirectory) {
                /** @type {(FileSystemDirectoryEntry | FileSystemFileEntry)} */
                const entries = await new Promise((resolve, reject) => entry.createReader().readEntries(resolve, reject));
                await readEntries(entries, arr);
            } else if (entry.isFile) {
                arr.push(await new Promise((resolve, reject) => entry.file(e => resolve([entry.fullPath.replace(/^\//, ''), e]), reject)));
            }
        }
        return arr;
    };
    const files = await readEntries(Array.from(e.dataTransfer.items).map(e => e.webkitGetAsEntry()));
    if (
        !files.length ||
        !(await $dialog.promises.confirm(
            `<p>${t('dialogUploadBody', [files.length], files.length)}</p><ul style="list-style-position:inside">${files.map(([path, file]) => `<li>${path} (${formatSize(file.size)})</li>`).join('')}</ul>`,
            t('titleUploadFile'),
            {
                rawHtml: true,
            }
        ))
    ) return;
    files
        .map(([path, file]) => {
            const cp = currentPath.value;
            return new Uploader(
                cp + encodeURIComponent(path),
                file,
                () => {
                    if (currentPath.value === cp) updateFilelist();
                    $toast.success(t('toastUploadSuccess', [file.name]));
                },
                err => $toast.error(t(err ? 'toastUploadErrorWithReason' : 'toastUploadError', [file.name, err?.message ?? err])),
            );
        })
        .forEach(e => {
            const r = reactive(e);
            uploadlist.value.push(r);
            r.upload();
        });
});
const uploadlistMenu = ref(false);
let uploadlistMenuTimer = null;
const uploadFilesDown = () => {
    uploadlistMenuTimer = setTimeout(() => {
        uploadlistMenu.value = true;
        uploadlistMenuTimer = null;
    }, 500);
};
const uploadFilesUp = () => {
    clearTimeout(uploadlistMenuTimer);
    if (uploadlistMenuTimer !== null) uploadFilesClick();
};

const createFolder = async () => {
    const path = await $dialog.promises.prompt(t('dialogCreateFolderLabel'), t('titleCreateFolder'));
    if (!path) return;
    await dufsfetch(currentPath.value + encodeURIComponent(path), { method: 'MKCOL' });
    $toast.success(t('toastCreateFolder'));
    await updateFilelist();
};

const previewAudioPaused = ref(true);
const previewAudioShuffle = ref(false);
/** @type {import('vue').Ref<'once' | 'on' | 'off'>} */
const previewAudioRepeat = ref('once');
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
const filelistPathsAudio = computed(() => filelistPathsSorted.value.filter(e => previewableAudioExts.has(e.ext)));
const previewAudioPrev = e => {
    const index = filelistPathsAudio.value.map(e => e.fullpath).indexOf(e.fullpath);
    return filelistPathsAudio.value[index === 0 ? (filelistPathsAudio.value.length - 1) : (index - 1)];
};
const previewAudioNext = e => {
    const index = filelistPathsAudio.value.map(e => e.fullpath).indexOf(e.fullpath);
    return filelistPathsAudio.value[index === filelistPathsAudio.value.length - 1 ? 0 : (index + 1)];
};
const previewAudioEnded = async () => {
    if (filelistPathsAudio.value.length === 1 || previewAudioRepeat.value === 'once') {
        previewAudioPaused.value = true;
        previewAudio.value.currentTime = 0;
    } else {
        let next;
        if (previewAudioShuffle.value) {
            const p = filelistPathsAudio.value.filter(e => e.fullpath !== previewItem.value.fullpath);
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
            (resolve, reject) => (new jsmediatags.Reader(`${location.protocol}//${location.host}${e.fullpath}`))
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
        $toast.error(t('toastFailedLoadAudioMetadata', [err.info || err]));
        previewAudioTitle.value = '';
        previewAudioArtist.value = '';
        previewAudioAlbum.value = '';
        URL.revokeObjectURL(previewAudioCover.value);
        previewAudioCover.value = '';
    }
};

const previewFontFamily = `preview-${Math.random().toString(36).substring(2, 10)}`;
const previewFontText = ref('');
const previewFontSize = ref(display.smAndUp.value ? (display.mdAndUp.value ? 32 : 24) : 16);
const previewFontWeight = ref(400);
const previewFontItalic = ref(false);
const previewFontStyleElement = document.createElement('style');
onMounted(() => document.head.appendChild(previewFontStyleElement));
watch(previewItem, () => {
    if (previewMode.value !== 'font' || !previewItem.value.fullpath) return;
    previewFontStyleElement.innerHTML = `@font-face{font-family:${previewFontFamily};src:url(${previewItem.value.fullpath})}@font-face{font-family:"Adobe NotDef";src:url(${NotDefFont})}`;
});

</script>