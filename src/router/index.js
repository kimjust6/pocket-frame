import { createRouter, createWebHistory } from 'vue-router';
import { pb } from '@/lib/pocketbase';

import SlideshowView from '@/views/SlideshowView.vue';
import SettingsView from '@/views/SettingsView.vue';
import ProfileView from '@/views/ProfileView.vue';
import ProfileEditView from '@/views/ProfileEditView.vue';
import LoginView from '@/views/LoginView.vue';
import RegisterView from '@/views/RegisterView.vue';
import OAuthRedirectView from '@/views/OAuthRedirectView.vue';

const routes = [
    {
        path: '/',
        name: 'slideshow',
        component: SlideshowView,
        meta: { requiresAuth: true, hideHeader: true },
    },
    {
        path: '/settings',
        name: 'settings',
        component: SettingsView,
        meta: { requiresAuth: true },
    },
    {
        path: '/profile',
        name: 'profile',
        component: ProfileView,
        meta: { requiresAuth: true },
    },
    {
        path: '/profile/edit',
        name: 'profile-edit',
        component: ProfileEditView,
        meta: { requiresAuth: true },
    },
    {
        path: '/login',
        name: 'login',
        component: LoginView,
        meta: { guestOnly: true, hideHeader: true },
    },
    {
        path: '/register',
        name: 'register',
        component: RegisterView,
        meta: { guestOnly: true, hideHeader: true },
    },
    {
        path: '/auth/oauth/redirect',
        name: 'oauth-redirect',
        component: OAuthRedirectView,
        meta: { hideHeader: true },
    },
    {
        path: '/:pathMatch(.*)*',
        redirect: '/',
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach((to, from, next) => {
    const isAuthed = pb.authStore.isValid && !!pb.authStore.model;

    if (to.meta.requiresAuth && !isAuthed) {
        next({ path: '/login', query: { redirect: to.fullPath } });
    } else if (to.meta.guestOnly && isAuthed) {
        next('/');
    } else {
        next();
    }
});

export default router;
