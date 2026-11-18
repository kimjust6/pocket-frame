import PocketBase from 'pocketbase';

// Determine PB URL: In dev proxy or same origin
const pbUrl = window.location.origin;

export const pb = new PocketBase(pbUrl);

// Synchronize PocketBase auth state with cookie so SSR / Goja hooks can read it if needed
pb.authStore.onChange((token, model) => {
    if (token) {
        document.cookie = `pb_auth=${encodeURIComponent(JSON.stringify({ token }))}; Path=/; SameSite=Lax; Max-Age=1209600`;
    } else {
        document.cookie = 'pb_auth=; Path=/; SameSite=Lax; Max-Age=0';
    }
});

// Helper to get file URL
export function getFileUrl(record, filename, query = {}) {
    if (!record || !filename) return '';
    return pb.files.getUrl(record, filename, query);
}
