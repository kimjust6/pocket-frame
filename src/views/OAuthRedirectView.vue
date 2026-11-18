<template>
    <div class="hero min-h-screen bg-base-200">
        <div class="hero-content text-center">
            <div class="max-w-md">
                <h1 class="text-3xl font-bold">Finishing sign in...</h1>
                <p class="py-6 text-base-content/70">
                    {{ statusMessage }}
                </p>
                <div v-if="isLoading" class="flex justify-center">
                    <span class="loading loading-spinner loading-lg text-primary"></span>
                </div>
                <router-link v-if="hasError" to="/login" class="btn btn-primary">
                    Try Again
                </router-link>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const toastStore = useToastStore();

const statusMessage = ref('Please wait while we complete authentication.');
const isLoading = ref(true);
const hasError = ref(false);

onMounted(async () => {
    try {
        const state = route.query.state;
        const code = route.query.code;

        if (!state || !code) {
            throw new Error('Missing OAuth response parameters.');
        }

        await authStore.completeOAuth(state, code);
        toastStore.success('Signed in with Google!');
        router.replace('/');
    } catch (err) {
        isLoading.value = false;
        hasError.value = true;
        statusMessage.value = err.message || 'Authentication failed. Please try again.';
        toastStore.error(statusMessage.value);
    }
});
</script>
