<template>
    <div class="mx-auto min-h-screen max-w-3xl px-4 py-8 pt-20">
        <!-- Top Title Bar -->
        <div class="border-[color:var(--color-primary)]/10 mb-8 flex items-center justify-between border-b pb-4">
            <router-link
                to="/"
                class="btn btn-ghost btn-sm -ml-1 pl-0 text-xs hover:text-[color:var(--color-accent)] gap-1.5"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back to Slideshow
            </router-link>
            <h1 class="text-xl font-extrabold tracking-tight">
                Slideshow Settings
            </h1>
        </div>

        <div class="bg-[color:var(--color-primary)]/5 border-[color:var(--color-primary)]/10 space-y-8 rounded-xl border p-6">
            <!-- 1. ALBUMS & SOURCES SECTION -->
            <div class="space-y-4">
                <div class="flex justify-between items-center border-b border-[color:var(--color-primary)]/10 pb-2">
                    <h2 class="text-base font-bold text-[color:var(--color-accent)]">
                        Albums & Sources
                    </h2>
                    <button
                        type="button"
                        @click="startAddAlbum"
                        class="btn btn-accent btn-xs rounded-lg px-3 font-semibold text-[color:var(--color-background)] hover:opacity-90"
                        :disabled="isAddingAlbum || !!editingAlbumId"
                    >
                        + Add Album
                    </button>
                </div>

                <!-- Empty Warning -->
                <div v-if="albums.length === 0 && !isAddingAlbum" class="alert alert-warning text-xs rounded-lg p-3">
                    <span>You must add at least one album to display a slideshow.</span>
                </div>

                <!-- ADD ALBUM FORM -->
                <div v-if="isAddingAlbum" class="border border-[color:var(--color-accent)]/40 bg-[color:var(--color-primary)]/5 rounded-xl p-4 space-y-4">
                    <h3 class="text-sm font-bold text-[color:var(--color-accent)]">Add New Album</h3>
                    <div class="space-y-3">
                        <div>
                            <label class="label text-xs font-semibold py-1">Album Name</label>
                            <input
                                v-model="newAlbum.name"
                                type="text"
                                placeholder="e.g. Summer Vacation"
                                class="input input-bordered input-sm w-full bg-base-100 text-base-content"
                            />
                        </div>
                        <div>
                            <label class="label text-xs font-semibold py-1">Immich Share URL</label>
                            <input
                                v-model="newAlbum.immich_url"
                                type="text"
                                placeholder="https://immich.example.com/share/..."
                                class="input input-bordered input-sm w-full bg-base-100 text-base-content"
                            />
                        </div>
                        <div class="space-y-2">
                            <div class="flex justify-between items-center">
                                <label class="label text-xs font-semibold py-1">Fallback URLs (Amazon / Google Photos)</label>
                                <button
                                    type="button"
                                    @click="addFallbackUrl(newAlbum)"
                                    class="btn btn-ghost btn-xs text-[color:var(--color-accent)]"
                                >
                                    + Add URL
                                </button>
                            </div>
                            <div v-for="(fUrl, fIdx) in newAlbum.fallback_urls" :key="fIdx" class="flex items-center gap-2">
                                <input
                                    v-model="newAlbum.fallback_urls[fIdx]"
                                    type="text"
                                    placeholder="https://..."
                                    class="input input-bordered input-xs flex-1 bg-base-100 text-base-content"
                                />
                                <button
                                    type="button"
                                    @click="removeFallbackUrl(newAlbum, fIdx)"
                                    class="btn btn-ghost btn-xs text-error"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="flex justify-end gap-2 pt-2">
                        <button type="button" @click="cancelAddAlbum" class="btn btn-ghost btn-xs">Cancel</button>
                        <button type="button" @click="saveNewAlbum" class="btn btn-accent btn-xs">Save Album</button>
                    </div>
                </div>

                <!-- ALBUMS LIST -->
                <div class="space-y-3">
                    <div
                        v-for="(album, idx) in albums"
                        :key="album.id"
                        class="border-[color:var(--color-primary)]/10 bg-[color:var(--color-primary)]/3 rounded-xl border p-4 transition-all relative hover:border-[color:var(--color-primary)]/20"
                        :class="settings.active_album === album.id ? 'border-[color:var(--color-accent)]/40 bg-[color:var(--color-accent)]/5' : ''"
                    >
                        <!-- VIEW MODE -->
                        <div v-if="editingAlbumId !== album.id" class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div class="space-y-1.5 flex-1 min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <!-- Reorder buttons -->
                                    <div class="flex items-center gap-0.5 mr-1" v-if="albums.length > 1">
                                        <button
                                            type="button"
                                            @click="moveAlbumUp(idx)"
                                            class="btn btn-ghost btn-xs p-0 w-5 h-5 min-h-0 hover:text-[color:var(--color-accent)]"
                                            :class="idx === 0 ? 'opacity-25 pointer-events-none' : ''"
                                            title="Move Up"
                                        >
                                            ▲
                                        </button>
                                        <button
                                            type="button"
                                            @click="moveAlbumDown(idx)"
                                            class="btn btn-ghost btn-xs p-0 w-5 h-5 min-h-0 hover:text-[color:var(--color-accent)]"
                                            :class="idx === albums.length - 1 ? 'opacity-25 pointer-events-none' : ''"
                                            title="Move Down"
                                        >
                                            ▼
                                        </button>
                                    </div>
                                    <span class="text-sm font-bold text-base-content tracking-tight">{{ album.name }}</span>
                                    <span
                                        v-if="settings.active_album === album.id"
                                        class="badge badge-accent badge-sm font-bold px-2 text-[10px] text-[color:var(--color-background)]"
                                    >
                                        Active
                                    </span>
                                </div>
                                <div class="space-y-0.5 text-xs opacity-75 w-full overflow-hidden">
                                    <div class="flex items-center gap-1.5 overflow-hidden">
                                        <span class="font-semibold uppercase text-[9px] opacity-50 flex-shrink-0 w-24">Immich:</span>
                                        <span class="truncate min-w-0">{{ album.immich_url || 'None' }}</span>
                                    </div>
                                    <div v-if="album.fallback_urls && album.fallback_urls.length > 0" class="space-y-0.5 min-w-0 w-full">
                                        <div v-for="(url, uIdx) in album.fallback_urls" :key="uIdx" class="flex items-center gap-1.5 overflow-hidden">
                                            <span class="font-semibold uppercase text-[9px] opacity-50 flex-shrink-0 w-24">
                                                {{ getFallbackLabel(url) }}:
                                            </span>
                                            <span class="truncate min-w-0 text-[11px]">{{ url }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center gap-2 self-end md:self-center">
                                <button
                                    v-if="settings.active_album !== album.id"
                                    type="button"
                                    @click="setActiveAlbum(album.id)"
                                    class="btn btn-outline btn-xs"
                                >
                                    Set Active
                                </button>
                                <button
                                    type="button"
                                    @click="startEditAlbum(album)"
                                    class="btn btn-ghost btn-xs text-info"
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    @click="deleteAlbum(album.id)"
                                    class="btn btn-ghost btn-xs text-error"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>

                        <!-- EDIT MODE -->
                        <div v-else class="space-y-4">
                            <h3 class="text-sm font-bold text-[color:var(--color-accent)]">Edit Album</h3>
                            <div class="space-y-3">
                                <div>
                                    <label class="label text-xs font-semibold py-1">Album Name</label>
                                    <input
                                        v-model="editingAlbumData.name"
                                        type="text"
                                        class="input input-bordered input-sm w-full bg-base-100 text-base-content"
                                    />
                                </div>
                                <div>
                                    <label class="label text-xs font-semibold py-1">Immich Share URL</label>
                                    <input
                                        v-model="editingAlbumData.immich_url"
                                        type="text"
                                        class="input input-bordered input-sm w-full bg-base-100 text-base-content"
                                    />
                                </div>
                                <div class="space-y-2">
                                    <div class="flex justify-between items-center">
                                        <label class="label text-xs font-semibold py-1">Fallback URLs</label>
                                        <button
                                            type="button"
                                            @click="addFallbackUrl(editingAlbumData)"
                                            class="btn btn-ghost btn-xs text-[color:var(--color-accent)]"
                                        >
                                            + Add URL
                                        </button>
                                    </div>
                                    <div v-for="(fUrl, fIdx) in editingAlbumData.fallback_urls" :key="fIdx" class="flex items-center gap-2">
                                        <input
                                            v-model="editingAlbumData.fallback_urls[fIdx]"
                                            type="text"
                                            class="input input-bordered input-xs flex-1 bg-base-100 text-base-content"
                                        />
                                        <button
                                            type="button"
                                            @click="removeFallbackUrl(editingAlbumData, fIdx)"
                                            class="btn btn-ghost btn-xs text-error"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="flex justify-end gap-2 pt-2">
                                <button type="button" @click="cancelEditAlbum" class="btn btn-ghost btn-xs">Cancel</button>
                                <button type="button" @click="saveEditAlbum" class="btn btn-accent btn-xs">Update Album</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. COLOR SETTINGS SECTION -->
            <div class="space-y-4">
                <h2 class="text-base font-bold text-[color:var(--color-accent)] border-b border-[color:var(--color-primary)]/10 pb-2">
                    Color Branding
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <!-- Primary Color -->
                    <div class="space-y-1.5">
                        <label class="text-xs font-semibold">Primary Color</label>
                        <div class="flex items-center gap-2">
                            <input
                                type="color"
                                v-model="settings.color_primary"
                                @input="settingsStore.applyCustomColors"
                                class="h-8 w-10 cursor-pointer rounded border border-base-300 bg-transparent p-0"
                            />
                            <input
                                type="text"
                                v-model="settings.color_primary"
                                @input="settingsStore.applyCustomColors"
                                class="input input-bordered input-sm flex-1 font-mono text-xs bg-base-100 text-base-content"
                            />
                        </div>
                    </div>

                    <!-- Accent Color -->
                    <div class="space-y-1.5">
                        <label class="text-xs font-semibold">Accent Color</label>
                        <div class="flex items-center gap-2">
                            <input
                                type="color"
                                v-model="settings.color_accent"
                                @input="settingsStore.applyCustomColors"
                                class="h-8 w-10 cursor-pointer rounded border border-base-300 bg-transparent p-0"
                            />
                            <input
                                type="text"
                                v-model="settings.color_accent"
                                @input="settingsStore.applyCustomColors"
                                class="input input-bordered input-sm flex-1 font-mono text-xs bg-base-100 text-base-content"
                            />
                        </div>
                    </div>

                    <!-- Background Color -->
                    <div class="space-y-1.5">
                        <label class="text-xs font-semibold">Background Color</label>
                        <div class="flex items-center gap-2">
                            <input
                                type="color"
                                v-model="settings.color_background"
                                @input="settingsStore.applyCustomColors"
                                class="h-8 w-10 cursor-pointer rounded border border-base-300 bg-transparent p-0"
                            />
                            <input
                                type="text"
                                v-model="settings.color_background"
                                @input="settingsStore.applyCustomColors"
                                class="input input-bordered input-sm flex-1 font-mono text-xs bg-base-100 text-base-content"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <!-- 3. SLIDESHOW CONFIGURATION SECTION -->
            <div class="space-y-4">
                <h2 class="text-base font-bold text-[color:var(--color-accent)] border-b border-[color:var(--color-primary)]/10 pb-2">
                    Slideshow Timing & Behavior
                </h2>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Slide Interval -->
                    <div class="space-y-1">
                        <label class="text-xs font-semibold">Slide Interval (seconds)</label>
                        <input
                            type="number"
                            v-model.number="settings.slide_interval"
                            min="1"
                            max="3600"
                            class="input input-bordered input-sm w-full bg-base-100 text-base-content"
                        />
                    </div>

                    <!-- Latest Pin Count -->
                    <div class="space-y-1">
                        <label class="text-xs font-semibold">Latest Pin Count</label>
                        <input
                            type="number"
                            v-model.number="settings.latest_pin_count"
                            min="0"
                            max="100"
                            class="input input-bordered input-sm w-full bg-base-100 text-base-content"
                        />
                        <span class="text-[10px] opacity-60">Number of recent items to keep at the start.</span>
                    </div>

                    <!-- Video Repeat Threshold -->
                    <div class="space-y-1">
                        <label class="text-xs font-semibold">Video Repeat Threshold (seconds)</label>
                        <input
                            type="number"
                            v-model.number="settings.video_repeat_threshold"
                            min="0"
                            max="60"
                            class="input input-bordered input-sm w-full bg-base-100 text-base-content"
                        />
                        <span class="text-[10px] opacity-60">Videos shorter than this will loop before advancing.</span>
                    </div>

                    <!-- Video Repeat Count -->
                    <div class="space-y-1">
                        <label class="text-xs font-semibold">Video Repeat Count</label>
                        <input
                            type="number"
                            v-model.number="settings.video_repeat_count"
                            min="1"
                            max="20"
                            class="input input-bordered input-sm w-full bg-base-100 text-base-content"
                        />
                    </div>

                    <!-- Cache TTL Days -->
                    <div class="space-y-1">
                        <label class="text-xs font-semibold">Cache Duration (days)</label>
                        <input
                            type="number"
                            v-model.number="cacheDays"
                            min="1"
                            max="365"
                            class="input input-bordered input-sm w-full bg-base-100 text-base-content"
                        />
                    </div>
                </div>

                <!-- Toggle Checkboxes -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <label class="cursor-pointer flex items-center gap-2 text-xs font-medium">
                        <input type="checkbox" v-model="settings.randomize" class="checkbox checkbox-sm checkbox-primary" />
                        <span>Shuffle / Randomize</span>
                    </label>

                    <label class="cursor-pointer flex items-center gap-2 text-xs font-medium">
                        <input type="checkbox" v-model="settings.prioritize_videos" class="checkbox checkbox-sm checkbox-primary" />
                        <span>Prioritize Videos</span>
                    </label>

                    <label class="cursor-pointer flex items-center gap-2 text-xs font-medium">
                        <input type="checkbox" v-model="settings.autoplay_fullscreen" class="checkbox checkbox-sm checkbox-primary" />
                        <span>Kiosk Mode (Prompt Fullscreen)</span>
                    </label>
                </div>
            </div>

            <!-- 4. ACTION BUTTONS -->
            <div class="flex justify-end items-center gap-3 pt-4 border-t border-[color:var(--color-primary)]/10">
                <button
                    type="button"
                    @click="applySettings"
                    :disabled="isSaving"
                    class="btn btn-outline btn-sm rounded-xl px-5"
                >
                    Apply
                </button>
                <button
                    type="button"
                    @click="saveSettingsAndRedirect"
                    :disabled="isSaving"
                    class="btn btn-primary btn-sm rounded-xl px-6 text-[color:var(--color-background)] font-bold"
                >
                    <span v-if="isSaving" class="loading loading-spinner loading-xs"></span>
                    Save & View Slideshow
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSettingsStore } from '@/stores/settings';
import { useToastStore } from '@/stores/toast';

const router = useRouter();
const settingsStore = useSettingsStore();
const toastStore = useToastStore();

const settings = computed(() => settingsStore.settings);
const albums = computed(() => settingsStore.albums);
const isSaving = ref(false);

const cacheDays = computed({
    get: () => Math.round((settings.value.cache_ttl || 604800) / 86400),
    set: (val) => {
        settings.value.cache_ttl = (val || 7) * 86400;
    }
});

// Add Album State
const isAddingAlbum = ref(false);
const newAlbum = reactive({
    name: '',
    immich_url: '',
    fallback_urls: []
});

function startAddAlbum() {
    isAddingAlbum.value = true;
    newAlbum.name = '';
    newAlbum.immich_url = '';
    newAlbum.fallback_urls = [];
}

function cancelAddAlbum() {
    isAddingAlbum.value = false;
}

function addFallbackUrl(target) {
    if (!target.fallback_urls) target.fallback_urls = [];
    target.fallback_urls.push('');
}

function removeFallbackUrl(target, idx) {
    target.fallback_urls.splice(idx, 1);
}

function getFallbackLabel(url) {
    if (!url) return 'Fallback';
    if (url.includes('amazon') || url.includes('/photos/share/')) return 'Amazon Fallback';
    if (url.includes('google') || url.includes('goo.gl')) return 'Google Fallback';
    return 'Fallback';
}

async function saveNewAlbum() {
    if (!newAlbum.name.trim()) {
        toastStore.warning('Please enter an album name.');
        return;
    }
    const cleanFallbacks = (newAlbum.fallback_urls || []).filter(u => u && u.trim());
    if (!newAlbum.immich_url.trim() && cleanFallbacks.length === 0) {
        toastStore.warning('Please provide an Immich URL or at least one Fallback URL.');
        return;
    }

    try {
        const order = albums.value.length;
        const res = await settingsStore.postSettingsAction('create_album', {
            name: newAlbum.name.trim(),
            immich_url: newAlbum.immich_url.trim(),
            amazon_url: cleanFallbacks.find(u => u.includes('amazon')) || cleanFallbacks[0] || '',
            fallback_urls: cleanFallbacks,
            order
        });

        isAddingAlbum.value = false;
        await settingsStore.fetchSettingsAndAlbums();
        toastStore.success('Album created successfully!');
    } catch (err) {
        toastStore.error('Failed to create album: ' + err.message);
    }
}

// Edit Album State
const editingAlbumId = ref(null);
const editingAlbumData = reactive({
    id: '',
    name: '',
    immich_url: '',
    fallback_urls: []
});

function startEditAlbum(album) {
    editingAlbumId.value = album.id;
    editingAlbumData.id = album.id;
    editingAlbumData.name = album.name;
    editingAlbumData.immich_url = album.immich_url || '';
    editingAlbumData.fallback_urls = [...(album.fallback_urls || [])];
}

function cancelEditAlbum() {
    editingAlbumId.value = null;
}

async function saveEditAlbum() {
    if (!editingAlbumData.name.trim()) {
        toastStore.warning('Please enter an album name.');
        return;
    }
    const cleanFallbacks = (editingAlbumData.fallback_urls || []).filter(u => u && u.trim());
    if (!editingAlbumData.immich_url.trim() && cleanFallbacks.length === 0) {
        toastStore.warning('Please provide an Immich URL or at least one Fallback URL.');
        return;
    }

    try {
        await settingsStore.postSettingsAction('update_album', {
            album_id: editingAlbumData.id,
            name: editingAlbumData.name.trim(),
            immich_url: editingAlbumData.immich_url.trim(),
            amazon_url: cleanFallbacks.find(u => u.includes('amazon')) || cleanFallbacks[0] || '',
            fallback_urls: cleanFallbacks
        });

        editingAlbumId.value = null;
        await settingsStore.fetchSettingsAndAlbums();
        toastStore.success('Album updated successfully!');
    } catch (err) {
        toastStore.error('Failed to update album: ' + err.message);
    }
}

async function deleteAlbum(albumId) {
    if (!confirm('Are you sure you want to delete this album?')) return;
    try {
        await settingsStore.postSettingsAction('delete_album', { album_id: albumId });
        await settingsStore.fetchSettingsAndAlbums();
        toastStore.success('Album deleted.');
    } catch (err) {
        toastStore.error('Failed to delete album: ' + err.message);
    }
}

async function setActiveAlbum(albumId) {
    try {
        await settingsStore.postSettingsAction('set_active_album', { album_id: albumId });
        settings.value.active_album = albumId;
        toastStore.success('Active album changed.');
    } catch (err) {
        toastStore.error('Failed to set active album: ' + err.message);
    }
}

async function moveAlbumUp(idx) {
    if (idx <= 0) return;
    await swapAlbums(idx, idx - 1);
}

async function moveAlbumDown(idx) {
    if (idx >= albums.value.length - 1) return;
    await swapAlbums(idx, idx + 1);
}

async function swapAlbums(i, j) {
    const list = [...albums.value];
    const albumA = list[i];
    const albumB = list[j];
    list[i] = albumB;
    list[j] = albumA;
    settingsStore.albums = list;

    try {
        await settingsStore.postSettingsAction('swap_albums', {
            albumA_id: albumA.id,
            albumA_order: j,
            albumB_id: albumB.id,
            albumB_order: i
        });
        albumA.order = j;
        albumB.order = i;
        toastStore.success('Album order saved.');
    } catch (err) {
        toastStore.error('Failed to reorder albums: ' + err.message);
    }
}

async function performSave() {
    isSaving.value = true;
    try {
        await settingsStore.postSettingsAction('save_settings', {
            settings_id: settings.value.id,
            color_primary: settings.value.color_primary,
            color_accent: settings.value.color_accent,
            color_background: settings.value.color_background,
            randomize: !!settings.value.randomize,
            prioritize_videos: !!settings.value.prioritize_videos,
            autoplay_fullscreen: !!settings.value.autoplay_fullscreen,
            latest_pin_count: parseInt(settings.value.latest_pin_count, 10) || 6,
            slide_interval: parseInt(settings.value.slide_interval, 10) || 7,
            video_repeat_threshold: parseInt(settings.value.video_repeat_threshold, 10) || 5,
            video_repeat_count: parseInt(settings.value.video_repeat_count, 10) || 3,
            cache_ttl: (cacheDays.value || 7) * 86400,
            active_album: settings.value.active_album || null
        });
        settingsStore.applyCustomColors();
        return true;
    } catch (err) {
        toastStore.error('Failed to save settings: ' + err.message);
        return false;
    } finally {
        isSaving.value = false;
    }
}

async function applySettings() {
    const ok = await performSave();
    if (ok) {
        toastStore.success('Settings applied successfully!');
    }
}

async function saveSettingsAndRedirect() {
    const ok = await performSave();
    if (ok) {
        toastStore.success('Settings saved! Redirecting to slideshow...');
        setTimeout(() => {
            router.push('/');
        }, 400);
    }
}

onMounted(async () => {
    try {
        await settingsStore.fetchSettingsAndAlbums();
    } catch (err) {
        toastStore.error('Error loading settings.');
    }
});
</script>
