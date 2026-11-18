<template>
    <div class="relative min-h-screen flex flex-col">
        <Header v-if="!route.meta.hideHeader" />
        <main class="relative flex-grow">
            <router-view />
        </main>
        <Toast />
    </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Header from '@/components/Header.vue';
import Toast from '@/components/Toast.vue';
import { useSettingsStore } from '@/stores/settings';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const settingsStore = useSettingsStore();
const authStore = useAuthStore();

onMounted(async () => {
    settingsStore.initTheme();
    if (authStore.isAuthenticated) {
        try {
            await settingsStore.fetchSettingsAndAlbums();
        } catch (e) {}
    }
});
</script>
