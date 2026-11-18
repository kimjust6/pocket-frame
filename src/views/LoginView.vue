<template>
    <div class="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] min-h-screen bg-base-100">
        <!-- Left panel (Quote panel, md and up) -->
        <div class="hidden md:flex flex-col justify-between p-14 bg-base-200 border-r border-base-content/10">
            <div class="flex items-center gap-2.5 text-lg font-bold text-base-content">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" class="text-primary">
                    <path d="M6 2a2 2 0 0 0-2 2v18l8-5 8 5V4a2 2 0 0 0-2-2H6z"/>
                </svg>
                <span>Pocket Frame</span>
            </div>
            <div class="text-3xl font-serif leading-snug max-w-[420px] text-base-content">
                Every photo, album, and memory worth keeping — <span class="text-primary italic font-serif">framed, not lost.</span>
            </div>
            <div class="text-xs text-base-content/50">
                Trusted by users who never want to forget a moment again.
            </div>
        </div>

        <!-- Right panel (Auth form) -->
        <div class="flex items-center justify-center p-8 sm:p-10 bg-base-100">
            <div class="w-full max-w-[380px] flex flex-col">
                <!-- Mobile Brand Header -->
                <div class="flex md:hidden items-center gap-2.5 text-base font-bold text-base-content mb-8">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="text-primary">
                        <path d="M6 2a2 2 0 0 0-2 2v18l8-5 8 5V4a2 2 0 0 0-2-2H6z"/>
                    </svg>
                    <span>Pocket Frame</span>
                </div>

                <p class="text-[12.5px] tracking-wider uppercase text-base-content/50 mb-2 font-semibold">
                    Sign in
                </p>
                <h1 class="text-3xl font-bold text-base-content mb-2 tracking-tight">
                    Welcome back
                </h1>
                <p class="text-sm text-base-content/70 mb-8 leading-relaxed">
                    Sign in to manage your photo frame.
                </p>

                <!-- Google Sign-in Button -->
                <button
                    type="button"
                    @click="handleGoogleLogin"
                    :disabled="isGoogleLoading"
                    class="btn btn-block bg-base-content text-base-100 hover:bg-base-content/90 border-none font-semibold text-[14.5px] py-3.5 h-auto normal-case rounded-lg shadow-sm flex items-center justify-center gap-3 transition-transform active:scale-[0.99]"
                >
                    <svg class="h-5 w-5" viewBox="0 0 24 24">
                        <path
                            fill="currentColor"
                            d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.16-7.27 1.94 0 3.73.53 5.3 2.07l1.96-1.96C16.91 2.97 14.76 2 12.16 2 6.6 2 2.08 6.53 2.08 12.2S6.6 22.41 12.16 22.41c4.42 0 8.12-2.31 9.75-5.9 1.16-2.55 1.16-5.41.93-5.41z"
                        />
                    </svg>
                    <span>{{ isGoogleLoading ? 'Connecting...' : 'Continue with Google' }}</span>
                </button>

                <div class="divider text-xs text-base-content/40 my-6">or</div>

                <!-- Email/Password Form -->
                <form @submit.prevent="handleEmailLogin" class="space-y-4">
                    <div class="space-y-1">
                        <label class="label-text text-xs font-semibold text-base-content/70">Email Address</label>
                        <input
                            v-model="email"
                            type="email"
                            required
                            placeholder="you@example.com"
                            class="input input-bordered input-sm w-full bg-base-100 text-base-content rounded-lg"
                        />
                    </div>
                    <div class="space-y-1">
                        <label class="label-text text-xs font-semibold text-base-content/70">Password</label>
                        <input
                            v-model="password"
                            type="password"
                            required
                            placeholder="••••••••"
                            class="input input-bordered input-sm w-full bg-base-100 text-base-content rounded-lg"
                        />
                    </div>
                    <button
                        type="submit"
                        :disabled="isLoading"
                        class="btn btn-primary btn-sm w-full rounded-lg font-bold text-[color:var(--color-background)] mt-2"
                    >
                        <span v-if="isLoading" class="loading loading-spinner loading-xs"></span>
                        Sign in with Password
                    </button>
                </form>

                <div class="flex items-center justify-between mt-6 pt-4 border-t border-base-content/10">
                    <router-link to="/" class="flex items-center gap-1 text-base-content/60 hover:text-base-content text-xs font-medium">
                        ← Back to home
                    </router-link>
                    <router-link to="/register" class="text-primary hover:underline text-xs font-semibold">
                        Create account →
                    </router-link>
                </div>

                <p class="text-[11px] text-base-content/50 leading-relaxed mt-6">
                    By signing in, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';

const router = useRouter();
const authStore = useAuthStore();
const toastStore = useToastStore();

const email = ref('');
const password = ref('');
const isLoading = ref(false);
const isGoogleLoading = ref(false);

async function handleGoogleLogin() {
    isGoogleLoading.value = true;
    try {
        await authStore.startGoogleOAuth();
    } catch (err) {
        toastStore.error(err.message || 'Google OAuth failed to initialize.');
        isGoogleLoading.value = false;
    }
}

async function handleEmailLogin() {
    isLoading.value = true;
    try {
        await authStore.login(email.value, password.value);
        toastStore.success('Signed in successfully!');
        router.push('/');
    } catch (err) {
        toastStore.error(err.message || 'Invalid email or password.');
    } finally {
        isLoading.value = false;
    }
}
</script>
