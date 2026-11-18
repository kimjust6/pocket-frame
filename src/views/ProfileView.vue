<template>
    <div class="relative min-h-[calc(100vh-80px)] overflow-hidden pt-20">
        <!-- Background Effects -->
        <div class="absolute inset-0 bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10 pointer-events-none">
            <div class="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-base-100 via-base-100/50 to-transparent"></div>
            <div class="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[120px] opacity-50"></div>
        </div>

        <div class="container relative z-10 mx-auto px-4 py-12 max-w-4xl">
            <!-- Profile Card -->
            <div class="card border border-base-content/10 bg-base-100/60 shadow-2xl backdrop-blur-md">
                <div class="card-body p-8 md:p-10">
                    <div class="flex flex-col md:flex-row gap-8 md:gap-12 items-center md:items-start">
                        <!-- Avatar -->
                        <div class="flex-shrink-0">
                            <div class="avatar placeholder">
                                <div class="w-32 md:w-40 rounded-full ring-4 ring-primary/20 ring-offset-base-100 ring-offset-4 overflow-hidden shadow-xl shadow-primary/10 transition-transform hover:scale-105 duration-300">
                                    <img
                                        v-if="avatarUrl"
                                        :src="avatarUrl"
                                        alt="Avatar"
                                        class="w-full h-full object-cover"
                                    />
                                    <div
                                        v-else
                                        class="bg-gradient-to-br from-primary to-secondary text-primary-content w-full h-full flex items-center justify-center text-5xl font-bold"
                                    >
                                        {{ userInitial }}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right Info -->
                        <div class="flex-grow space-y-6 w-full text-center md:text-left">
                            <div class="space-y-2">
                                <div class="flex flex-col md:flex-row items-center gap-4">
                                    <h2 class="text-2xl md:text-3xl font-bold bg-gradient-to-r from-base-content to-base-content/70 bg-clip-text text-transparent">
                                        {{ user?.name || user?.email?.split('@')[0] }}
                                    </h2>
                                    <router-link
                                        to="/profile/edit"
                                        class="btn btn-secondary btn-sm gap-2 shadow-lg shadow-secondary/20 hover:scale-105 transition-all duration-300"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                        Edit Profile
                                    </router-link>
                                </div>
                                <p class="text-base-content/60">{{ user?.email }}</p>
                            </div>

                            <!-- Bio -->
                            <div v-if="user?.bio" class="p-4 bg-base-200/50 rounded-xl border border-base-content/5 text-left">
                                <p class="text-base-content/80 leading-relaxed">{{ user.bio }}</p>
                            </div>

                            <!-- Stats Row -->
                            <div class="flex flex-wrap gap-4 justify-center md:justify-start">
                                <div class="stat bg-base-200/50 rounded-xl p-4 min-w-[140px]">
                                    <div class="stat-title text-xs">Member Since</div>
                                    <div class="stat-value text-lg text-primary">
                                        {{ memberSinceDate }}
                                    </div>
                                </div>
                                <div v-if="user?.shortHand" class="stat bg-base-200/50 rounded-xl p-4 min-w-[140px]">
                                    <div class="stat-title text-xs">Handle</div>
                                    <div class="stat-value text-lg text-secondary">
                                        @{{ user.shortHand }}
                                    </div>
                                </div>
                            </div>

                            <!-- Quick Actions -->
                            <div class="flex flex-wrap gap-3 justify-center md:justify-start pt-2">
                                <router-link
                                    to="/"
                                    class="btn btn-ghost btn-sm gap-2 border border-base-content/10 hover:border-primary/30 hover:bg-primary/5"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                    </svg>
                                    Slideshow
                                </router-link>
                                <router-link
                                    to="/settings"
                                    class="btn btn-ghost btn-sm gap-2 border border-base-content/10 hover:border-primary/30 hover:bg-primary/5"
                                >
                                    Settings
                                </router-link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { getFileUrl } from '@/lib/pocketbase';

const authStore = useAuthStore();
const user = computed(() => authStore.user);

const userInitial = computed(() => {
    const email = user.value?.email || 'U';
    return email.charAt(0).toUpperCase();
});

const avatarUrl = computed(() => {
    if (!user.value || !user.value.avatar) return '';
    return getFileUrl(user.value, user.value.avatar);
});

const memberSinceDate = computed(() => {
    if (!user.value?.created) return 'Recent';
    try {
        const d = new Date(user.value.created);
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return user.value.created;
    }
});

onMounted(() => {
    authStore.refreshAuth();
});
</script>
