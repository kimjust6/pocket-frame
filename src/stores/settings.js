import { defineStore } from 'pinia';
import { ref } from 'vue';
import { pb } from '@/lib/pocketbase';

export const useSettingsStore = defineStore('settings', () => {
    const isDarkMode = ref(localStorage.getItem('theme') !== 'light'); // Default dark
    const settings = ref({
        id: '',
        color_primary: '#d9d9d9',
        color_accent: '#50fbc2',
        color_background: '#282525',
        search_engine: '',
        fallback_url: '',
        fallback_urls: [],
        active_album: '',
        randomize: false,
        prioritize_videos: false,
        latest_pin_count: 6,
        slide_interval: 7,
        video_repeat_threshold: 5,
        video_repeat_count: 3,
        autoplay_fullscreen: false,
        cache_ttl: 604800,
    });
    const albums = ref([]);

    function initTheme() {
        const saved = localStorage.getItem('theme') || 'dark';
        isDarkMode.value = saved === 'dark';
        applyTheme();
    }

    function toggleTheme() {
        isDarkMode.value = !isDarkMode.value;
        const theme = isDarkMode.value ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        applyTheme();
    }

    function applyTheme() {
        const themeToken = isDarkMode.value ? 'yellowdark' : 'bumblebee';
        document.documentElement.setAttribute('data-theme', themeToken);
        document.documentElement.classList.toggle('dark', isDarkMode.value);
        applyCustomColors();
    }

    function applyCustomColors() {
        if (!isDarkMode.value) {
            // In light mode, light theme defaults take precedence
            document.body.style.setProperty('--color-background', '#FAF6EC');
            document.body.style.setProperty('--color-primary', '#1C1917');
            document.body.style.setProperty('--color-accent', '#EAB308');
        } else {
            document.body.style.setProperty('--color-background', settings.value.color_background || '#282525');
            document.body.style.setProperty('--color-primary', settings.value.color_primary || '#d9d9d9');
            document.body.style.setProperty('--color-accent', settings.value.color_accent || '#50fbc2');
        }
    }

    function setSettings(newSettings) {
        if (!newSettings) return;
        settings.value = { ...settings.value, ...newSettings };
        applyCustomColors();
    }

    async function fetchSettingsAndAlbums() {
        const res = await pb.send('/api/custom/settings', { method: 'GET' });
        if (res.settings) {
            setSettings(res.settings);
        }
        if (res.albums) {
            albums.value = res.albums;
        }
        return res;
    }

    async function postSettingsAction(action, payload = {}) {
        return await pb.send('/api/custom/settings', {
            method: 'POST',
            body: { action, ...payload },
        });
    }

    return {
        isDarkMode,
        settings,
        albums,
        initTheme,
        toggleTheme,
        applyTheme,
        applyCustomColors,
        setSettings,
        fetchSettingsAndAlbums,
        postSettingsAction,
    };
});
