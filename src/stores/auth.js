import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { pb } from '@/lib/pocketbase';

export const useAuthStore = defineStore('auth', () => {
    const user = ref(pb.authStore.model);
    const token = ref(pb.authStore.token);

    const isAuthenticated = computed(() => {
        return pb.authStore.isValid && !!user.value;
    });

    pb.authStore.onChange((newToken, newModel) => {
        token.value = newToken;
        user.value = newModel;
    });

    async function refreshAuth() {
        if (pb.authStore.isValid) {
            try {
                const refreshed = await pb.collection('users').authRefresh();
                user.value = refreshed.record;
                token.value = refreshed.token;
            } catch (err) {
                logout();
            }
        }
    }

    async function login(email, password) {
        const authData = await pb.collection('users').authWithPassword(email, password);
        user.value = authData.record;
        token.value = authData.token;
        return authData;
    }

    async function register(email, password) {
        await pb.collection('users').create({
            email,
            password,
            passwordConfirm: password,
        });
        return await login(email, password);
    }

    async function startGoogleOAuth() {
        const methods = await pb.collection('users').listAuthMethods();
        const providers = methods?.oauth2?.providers || [];
        const provider = providers.find(p => p.name === 'google');
        if (!provider) {
            throw new Error('Google OAuth provider is not configured.');
        }

        const isProdHost = window.location.hostname === 'frame.jkim.win';
        const canonicalOrigin = isProdHost ? 'https://frame.jkim.win' : window.location.origin;
        const redirectURL = `${canonicalOrigin}/auth/oauth/redirect`;
        const authUrl = provider.authURL + encodeURIComponent(redirectURL);

        localStorage.setItem(
            'pp_oauth_state',
            JSON.stringify({
                name: provider.name,
                state: provider.state,
                codeVerifier: provider.codeVerifier,
                redirectURL,
            })
        );

        window.location.assign(authUrl);
    }

    async function completeOAuth(state, code) {
        const stored = JSON.parse(localStorage.getItem('pp_oauth_state') || 'null');
        if (!stored) throw new Error('Missing stored OAuth session state.');
        if (stored.state !== state) throw new Error('OAuth state mismatch. Please try again.');

        const authData = await pb.collection('users').authWithOAuth2Code(
            stored.name,
            code,
            stored.codeVerifier,
            stored.redirectURL,
            { emailVisibility: false }
        );

        user.value = authData.record;
        token.value = authData.token;
        localStorage.removeItem('pp_oauth_state');
        return authData;
    }

    function logout() {
        pb.authStore.clear();
        user.value = null;
        token.value = '';
    }

    return {
        user,
        token,
        isAuthenticated,
        refreshAuth,
        login,
        register,
        startGoogleOAuth,
        completeOAuth,
        logout,
    };
});
