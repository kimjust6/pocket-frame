<template>
    <header class="navbar fixed inset-x-0 top-0 z-50 border-b border-base-300 bg-base-100/80 shadow-sm backdrop-blur-md">
        <div class="container mx-auto flex w-full justify-between px-6 py-0">
            <!-- Logo -->
            <div class="flex items-center gap-3">
                <router-link to="/" class="flex items-center gap-3 transition-opacity hover:opacity-80">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-6 w-6 text-primary"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <div class="select-none leading-tight">
                        <p class="text-xl font-bold text-base-content lg:text-2xl">
                            Pocket Frame
                        </p>
                    </div>
                </router-link>
            </div>

            <!-- Right Controls -->
            <div class="flex items-center gap-4 lg:gap-6">
                <!-- Navigation Links -->
                <router-link
                    to="/settings"
                    class="group relative text-sm font-medium tracking-wide text-base-content/80 transition-colors duration-200 hover:text-primary"
                >
                    Settings
                    <span class="absolute -bottom-1 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full"></span>
                </router-link>

                <!-- Theme Toggle Button -->
                <label class="btn btn-circle btn-ghost swap swap-rotate text-base-content" title="Toggle Theme">
                    <input type="checkbox" :checked="settingsStore.isDarkMode" @change="settingsStore.toggleTheme()" />
                    <!-- Moon Icon (Dark Mode On) -->
                    <svg class="swap-on h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>
                    </svg>
                    <!-- Sun Icon (Light Mode) -->
                    <svg class="swap-off h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"/>
                    </svg>
                </label>

                <!-- Avatar / User Profile Dropdown -->
                <div v-if="authStore.isAuthenticated" class="dropdown dropdown-end">
                    <div tabindex="0" role="button" class="avatar btn btn-circle btn-ghost">
                        <div class="w-10 overflow-hidden rounded-full ring ring-primary ring-offset-2 ring-offset-base-100 transition-all duration-200 hover:ring-accent">
                            <img
                                v-if="avatarUrl"
                                :src="avatarUrl"
                                alt="User Avatar"
                                class="h-full w-full object-cover"
                            />
                            <span v-else class="flex h-full w-full items-center justify-center bg-neutral text-xl font-bold text-neutral-content">
                                {{ userInitial }}
                            </span>
                        </div>
                    </div>
                    <ul tabindex="0" class="menu dropdown-content menu-sm z-[1] mt-3 w-52 rounded-box bg-base-100 p-2 shadow text-base-content border border-base-300">
                        <li class="menu-title px-4 py-2 text-xs text-base-content/50">
                            {{ authStore.user?.email }}
                        </li>
                        <div class="divider my-1"></div>
                        <li><router-link to="/profile">Profile</router-link></li>
                        <li><router-link to="/settings">Settings</router-link></li>
                        <li><a @click.prevent="handleLogout" class="text-error hover:bg-error/10">Logout</a></li>
                    </ul>
                </div>
            </div>
        </div>
    </header>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '@/stores/settings';
import { getFileUrl } from '@/lib/pocketbase';

const router = useRouter();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();

const userInitial = computed(() => {
    const email = authStore.user?.email || 'U';
    return email.charAt(0).toUpperCase();
});

const avatarUrl = computed(() => {
    if (!authStore.user?.avatar) return '';
    return getFileUrl(authStore.user, authStore.user.avatar);
});

function handleLogout() {
    authStore.logout();
    router.push('/login');
}
</script>
