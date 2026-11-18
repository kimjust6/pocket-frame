<template>
    <div
        class="fixed inset-0 w-screen h-screen bg-black overflow-hidden select-none"
        :class="{ 'cursor-none': !showControls }"
        @mousemove="keepControlsAlive()"
        @click="keepControlsAlive()"
        @touchstart="onTouchStart($event); keepControlsAlive()"
        @touchmove="onTouchMove($event)"
        @touchend="onTouchEnd($event)"
    >
        <!-- Active Slide (Instant Cut, No Slide Animation) -->
        <div
            v-if="currentImage"
            class="absolute inset-0 w-full h-full overflow-hidden bg-black flex items-center justify-center"
        >
            <!-- Image Slide -->
            <img
                v-if="currentImage.type !== 'VIDEO'"
                :key="currentImage.url"
                :src="currentImage.url"
                :alt="`Slide ${currentIndex + 1}`"
                fetchpriority="high"
                class="relative h-full w-full object-contain z-10"
                referrerpolicy="no-referrer"
            />
            <!-- Video Slide -->
            <video
                v-else
                ref="currentVideoRef"
                :key="currentImage.url"
                :src="currentImage.url"
                preload="auto"
                muted
                playsinline
                :controls="showControls && userInteracted"
                @mousemove="keepControlsAlive()"
                @click="keepControlsAlive()"
                @touchstart="keepControlsAlive()"
                @canplay="onVideoCanPlay"
                @ended="onVideoEnded"
                class="relative h-full w-full object-contain z-10 pointer-events-auto"
                referrerpolicy="no-referrer"
            ></video>
        </div>

        <!-- Empty State -->
        <div v-if="images.length === 0 && !isLoading" class="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white z-10 space-y-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 opacity-40 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p class="max-w-md text-sm opacity-75">{{ emptyMessage }}</p>
            <router-link to="/settings" class="btn btn-primary btn-sm rounded-xl">
                Configure Albums
            </router-link>
        </div>

        <!-- Loading Spinner -->
        <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
            <div class="flex flex-col items-center gap-3 text-white">
                <span class="loading loading-spinner loading-lg text-primary"></span>
                <p class="text-xs opacity-75 tracking-wider uppercase">{{ statusText }}</p>
            </div>
        </div>

        <!-- Top Control Overlay -->
        <transition
            enter-active-class="transition ease-out duration-300"
            enter-from-class="-translate-y-full opacity-0"
            enter-to-class="translate-y-0 opacity-100"
            leave-active-class="transition ease-in duration-300"
            leave-from-class="translate-y-0 opacity-100"
            leave-to-class="-translate-y-full opacity-0"
        >
            <div
                v-show="showControls"
                class="absolute top-0 inset-x-0 p-6 z-20 flex justify-between items-start bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none select-none text-white"
            >
                <router-link to="/" class="pointer-events-auto cursor-pointer block hover:opacity-90 select-none">
                    <h1 class="text-xl font-bold tracking-tight text-white drop-shadow-md">
                        {{ albumName || 'Pocket Frame' }}
                    </h1>
                    <p class="text-xs opacity-75 drop-shadow-sm mt-0.5">{{ statusText }}</p>
                </router-link>
                <div class="flex items-center gap-3 pointer-events-auto">
                    <button
                        @click="toggleFullscreen"
                        class="border border-white/20 hover:border-white hover:bg-white/10 text-white rounded-xl px-4 py-2 text-sm font-semibold opacity-90 transition-all backdrop-blur-md shadow-lg drop-shadow-sm flex items-center gap-2"
                        title="Toggle Fullscreen"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="isFullscreen ? 'M4 4h4v4H4zm12 0h4v4h-4zM4 16h4v4H4zm12 0h4v4h-4z' : 'M4 8V4h4M16 4h4v4M4 16v4h4M20 16v4h-4'" />
                        </svg>
                        <span>{{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}</span>
                    </button>
                    <router-link
                        to="/settings"
                        class="border border-white/20 hover:border-white hover:bg-white/10 text-white rounded-xl px-4 py-2 text-sm font-semibold opacity-90 transition-all backdrop-blur-md shadow-lg drop-shadow-sm"
                    >
                        Settings
                    </router-link>
                </div>
            </div>
        </transition>

        <!-- Left Navigation Arrow -->
        <transition
            enter-active-class="transition ease-out duration-300"
            enter-from-class="-translate-x-8 opacity-0"
            enter-to-class="translate-x-0 opacity-100"
            leave-active-class="transition ease-in duration-300"
            leave-from-class="translate-x-0 opacity-100"
            leave-to-class="-translate-x-8 opacity-0"
        >
            <div
                v-show="showControls && images.length > 1"
                class="absolute left-6 top-1/2 -translate-y-1/2 z-20 pointer-events-auto"
            >
                <button
                    @click="prevImage"
                    class="bg-black/40 hover:bg-black/60 text-white border border-white/10 w-14 h-14 flex items-center justify-center rounded-full backdrop-blur-md transition-all shadow-lg active:scale-95"
                    title="Previous Slide"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            </div>
        </transition>

        <!-- Right Navigation Arrow -->
        <transition
            enter-active-class="transition ease-out duration-300"
            enter-from-class="translate-x-8 opacity-0"
            enter-to-class="translate-x-0 opacity-100"
            leave-active-class="transition ease-in duration-300"
            leave-from-class="translate-x-0 opacity-100"
            leave-to-class="translate-x-8 opacity-0"
        >
            <div
                v-show="showControls && images.length > 1"
                class="absolute right-6 top-1/2 -translate-y-1/2 z-20 pointer-events-auto"
            >
                <button
                    @click="nextImage"
                    class="bg-black/40 hover:bg-black/60 text-white border border-white/10 w-14 h-14 flex items-center justify-center rounded-full backdrop-blur-md transition-all shadow-lg active:scale-95"
                    title="Next Slide"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </transition>

        <!-- Bottom Control Overlay -->
        <transition
            enter-active-class="transition ease-out duration-300"
            enter-from-class="translate-y-full opacity-0"
            enter-to-class="translate-y-0 opacity-100"
            leave-active-class="transition ease-in duration-300"
            leave-from-class="translate-y-0 opacity-100"
            leave-to-class="translate-y-full opacity-0"
        >
            <div
                v-show="showControls && images.length > 0"
                class="absolute bottom-0 inset-x-0 p-6 z-20 flex justify-center items-center bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none select-none text-white"
            >
                <div class="pointer-events-auto backdrop-blur-md bg-black/40 border border-white/10 px-5 py-2 rounded-full shadow-lg text-sm font-semibold tracking-wider drop-shadow-sm flex items-center gap-3">
                    <span>{{ currentIndex + 1 }} / {{ images.length }}</span>
                </div>
            </div>
        </transition>

        <!-- Autoplay Fullscreen Start Overlay -->
        <div
            v-if="autoplayFullscreen && !isFullscreen"
            @click="toggleFullscreen"
            class="fixed inset-0 z-[1000] bg-black/95 flex flex-col items-center justify-center cursor-pointer select-none text-white transition-all duration-500"
        >
            <div class="text-center space-y-4 max-w-sm p-6">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-primary animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                <h2 class="text-xl font-bold tracking-tight">Tap to Start Kiosk Mode</h2>
                <p class="text-xs opacity-70">This will launch the slideshow in fullscreen.</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { pb } from '@/lib/pocketbase';
import { useSettingsStore } from '@/stores/settings';
import { useToastStore } from '@/stores/toast';

const settingsStore = useSettingsStore();
const toastStore = useToastStore();

const images = ref([]);
const currentIndex = ref(0);
const statusText = ref('Loading slideshow...');
const albumName = ref('');
const emptyMessage = ref('No images loaded. Add an Immich share URL in Settings to start the slideshow.');
const isLoading = ref(true);

const showControls = ref(true);
const userInteracted = ref(false);
const isFullscreen = ref(false);
const autoplayFullscreen = ref(false);

// Minimal single-slot state (Instant cut, zero animation)
const currentVideoRef = ref(null);
const swipeOffset = ref(0);
let isDragging = false;
let touchStartX = 0;
let touchStartY = 0;

let slideTimerId = null;
let controlsTimeout = null;
let watchdogIntervalId = null;

let slideIntervalMs = 7000;
let videoRepeatThreshold = 5;
let videoRepeatCount = 3;
let currentVideoPlayCount = 0;

// Currently visible active image/video
const currentImage = computed(() => {
    if (images.value.length === 0) return null;
    return images.value[currentIndex.value] || null;
});

// Preload next image in memory for instant cuts
function preloadNext() {
    if (images.value.length > 1) {
        const nextIdx = (currentIndex.value + 1) % images.value.length;
        const nextItem = images.value[nextIdx];
        if (nextItem && nextItem.type !== 'VIDEO' && nextItem.url) {
            const img = new Image();
            img.src = nextItem.url;
        }
    }
}

function keepControlsAlive(autoHide = true) {
    userInteracted.value = true;
    showControls.value = true;
    if (controlsTimeout) clearTimeout(controlsTimeout);
    if (autoHide) {
        controlsTimeout = setTimeout(() => {
            showControls.value = false;
        }, 3500);
    }
}

function nextImage() {
    if (images.value.length <= 1) return;
    cleanupCurrentVideo();
    currentIndex.value = (currentIndex.value + 1) % images.value.length;
    currentVideoPlayCount = 0;
    resetSlideTimer();
    preloadNext();
}

function prevImage() {
    if (images.value.length <= 1) return;
    cleanupCurrentVideo();
    currentIndex.value = (currentIndex.value - 1 + images.value.length) % images.value.length;
    currentVideoPlayCount = 0;
    resetSlideTimer();
    preloadNext();
}

function cleanupCurrentVideo() {
    const v = currentVideoRef.value;
    if (v) {
        try {
            v.pause();
            v.removeAttribute('src');
            v.load(); // Releases hardware video decoder buffer immediately
        } catch (e) {}
    }
}

function resetSlideTimer() {
    if (slideTimerId) clearTimeout(slideTimerId);
    const current = images.value[currentIndex.value];
    if (current && current.type === 'VIDEO') return;

    slideTimerId = setTimeout(() => {
        nextImage();
    }, slideIntervalMs);
}

function onVideoCanPlay(e) {
    const v = e.target;
    v.muted = true;
    setTimeout(() => {
        v.play()
            .then(() => { v.muted = false; })
            .catch(() => { v.muted = false; });
    }, 150);
}

function onVideoEnded(e) {
    const v = e.target;
    const dur = v.duration || 0;
    currentVideoPlayCount++;

    if (dur <= videoRepeatThreshold && currentVideoPlayCount < videoRepeatCount) {
        v.currentTime = 0;
        v.play().catch(() => {});
    } else {
        nextImage();
    }
}

function startVideoWatchdog() {
    watchdogIntervalId = setInterval(() => {
        const current = images.value[currentIndex.value];
        if (current && current.type === 'VIDEO') {
            const v = currentVideoRef.value;
            if (v && v.duration) {
                if (v.currentTime >= v.duration || v.ended) {
                    nextImage();
                }
            }
        }
    }, 2000);
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        }
    }
}

function onFullscreenChange() {
    isFullscreen.value = !!document.fullscreenElement;
}

function onKeyDown(e) {
    if (e.key === 'ArrowRight' || e.key === 'Right') {
        nextImage();
        keepControlsAlive();
    } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
        prevImage();
        keepControlsAlive();
    }
}

function onTouchStart(e) {
    if (!e.touches || !e.touches[0]) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isDragging = true;
    swipeOffset.value = 0;
}

function onTouchMove(e) {
    if (!isDragging || !e.touches || !e.touches[0]) return;
    const deltaX = e.touches[0].clientX - touchStartX;
    const deltaY = e.touches[0].clientY - touchStartY;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        swipeOffset.value = deltaX;
    }
}

function onTouchEnd() {
    if (!isDragging) return;
    isDragging = false;
    const threshold = 50;

    if (swipeOffset.value < -threshold) {
        nextImage();
    } else if (swipeOffset.value > threshold) {
        prevImage();
    }
    swipeOffset.value = 0;
}

async function loadSlideshowData() {
    isLoading.value = true;
    try {
        const res = await pb.send('/api/custom/slideshow', { method: 'GET' });
        if (res.settings) {
            settingsStore.setSettings(res.settings);
            slideIntervalMs = (res.settings.slide_interval || 7) * 1000;
            videoRepeatThreshold = res.settings.video_repeat_threshold || 5;
            videoRepeatCount = res.settings.video_repeat_count || 3;
            autoplayFullscreen.value = !!res.settings.autoplay_fullscreen;
        }

        // Keep only minimal necessary fields per image to minimize JavaScript heap memory
        images.value = (res.images || []).map(img => ({
            url: img.url,
            type: img.type || 'IMAGE',
            duration: img.duration || 0,
        }));

        statusText.value = res.statusText || 'Slideshow ready';
        albumName.value = res.albumName || '';
        currentIndex.value = 0;
        resetSlideTimer();
        preloadNext();
    } catch (err) {
        statusText.value = 'Failed to load slideshow data.';
        toastStore.error(err.message || 'Error loading slideshow.');
    } finally {
        isLoading.value = false;
    }
}

onMounted(() => {
    keepControlsAlive(true);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('keydown', onKeyDown);
    loadSlideshowData();
    startVideoWatchdog();
});

onUnmounted(() => {
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    window.removeEventListener('keydown', onKeyDown);
    cleanupCurrentVideo();
    if (slideTimerId) clearTimeout(slideTimerId);
    if (controlsTimeout) clearTimeout(controlsTimeout);
    if (watchdogIntervalId) clearInterval(watchdogIntervalId);
});
</script>
