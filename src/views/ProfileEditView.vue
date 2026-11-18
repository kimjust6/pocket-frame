<template>
    <div class="relative min-h-[calc(100vh-80px)] overflow-hidden pt-20">
        <!-- Background Effects -->
        <div class="absolute inset-0 bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10 pointer-events-none">
            <div class="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>

        <div class="container relative z-10 mx-auto px-4 py-12 max-w-2xl">
            <div class="card border border-base-content/10 bg-base-100/80 shadow-2xl backdrop-blur-md">
                <div class="card-body p-8">
                    <div class="flex items-center justify-between border-b border-base-content/10 pb-4 mb-6">
                        <h2 class="text-2xl font-bold tracking-tight">Edit Profile</h2>
                        <router-link to="/profile" class="btn btn-ghost btn-xs">Cancel</router-link>
                    </div>

                    <form @submit.prevent="handleSubmit" class="space-y-6">
                        <!-- Avatar Section -->
                        <div class="flex flex-col sm:flex-row items-center gap-6">
                            <div class="avatar">
                                <div class="w-24 h-24 rounded-full ring-2 ring-primary ring-offset-base-100 ring-offset-2 overflow-hidden shadow">
                                    <img
                                        v-if="previewAvatarUrl || currentAvatarUrl"
                                        :src="previewAvatarUrl || currentAvatarUrl"
                                        alt="Avatar Preview"
                                        class="w-full h-full object-cover"
                                    />
                                    <div v-else class="bg-primary text-primary-content w-full h-full flex items-center justify-center text-3xl font-bold">
                                        {{ userInitial }}
                                    </div>
                                </div>
                            </div>
                            <div class="space-y-2 text-center sm:text-left">
                                <label class="label-text text-xs font-semibold block">Change Avatar Photo</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    @change="onFileChange"
                                    class="file-input file-input-bordered file-input-sm w-full max-w-xs"
                                />
                                <p class="text-[11px] opacity-60">PNG, JPG or WebP up to 5MB</p>
                            </div>
                        </div>

                        <!-- Name -->
                        <div class="space-y-1">
                            <label class="label-text text-xs font-semibold">Display Name</label>
                            <input
                                v-model="form.name"
                                type="text"
                                placeholder="Your Name"
                                class="input input-bordered input-sm w-full bg-base-100"
                            />
                        </div>

                        <!-- Shorthand / Handle -->
                        <div class="space-y-1">
                            <label class="label-text text-xs font-semibold">Handle / Username</label>
                            <div class="relative">
                                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs opacity-50">@</span>
                                <input
                                    v-model="form.shortHand"
                                    type="text"
                                    placeholder="handle"
                                    class="input input-bordered input-sm w-full pl-7 bg-base-100"
                                />
                            </div>
                        </div>

                        <!-- Bio -->
                        <div class="space-y-1">
                            <label class="label-text text-xs font-semibold">Bio</label>
                            <textarea
                                v-model="form.bio"
                                rows="3"
                                placeholder="Tell us something about yourself..."
                                class="textarea textarea-bordered w-full bg-base-100 text-sm"
                            ></textarea>
                        </div>

                        <!-- Submit Buttons -->
                        <div class="flex justify-end gap-3 pt-4 border-t border-base-content/10">
                            <router-link to="/profile" class="btn btn-ghost btn-sm">Cancel</router-link>
                            <button type="submit" :disabled="isSaving" class="btn btn-primary btn-sm px-6">
                                <span v-if="isSaving" class="loading loading-spinner loading-xs"></span>
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { pb, getFileUrl } from '@/lib/pocketbase';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';

const router = useRouter();
const authStore = useAuthStore();
const toastStore = useToastStore();

const user = computed(() => authStore.user);
const isSaving = ref(false);
const previewAvatarUrl = ref('');
let selectedFile = null;

const form = reactive({
    name: '',
    shortHand: '',
    bio: '',
});

const userInitial = computed(() => {
    const email = user.value?.email || 'U';
    return email.charAt(0).toUpperCase();
});

const currentAvatarUrl = computed(() => {
    if (!user.value || !user.value.avatar) return '';
    return getFileUrl(user.value, user.value.avatar);
});

onMounted(() => {
    if (user.value) {
        form.name = user.value.name || '';
        form.shortHand = user.value.shortHand || '';
        form.bio = user.value.bio || '';
    }
});

function onFileChange(e) {
    const file = e.target.files && e.target.files[0];
    if (file) {
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (event) => {
            previewAvatarUrl.value = event.target.result;
        };
        reader.readAsDataURL(file);
    }
}

async function handleSubmit() {
    if (!user.value) return;
    isSaving.value = true;
    try {
        const formData = new FormData();
        formData.append('name', form.name);
        formData.append('shortHand', form.shortHand);
        formData.append('bio', form.bio);
        if (selectedFile) {
            formData.append('avatar', selectedFile);
        }

        const updated = await pb.collection('users').update(user.value.id, formData);
        authStore.user = updated;
        toastStore.success('Profile updated successfully!');
        router.push('/profile');
    } catch (err) {
        toastStore.error('Failed to update profile: ' + err.message);
    } finally {
        isSaving.value = false;
    }
}
</script>
