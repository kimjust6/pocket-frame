<template>
    <div class="toast toast-end toast-bottom z-[200] pointer-events-auto">
        <transition-group
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="transform translate-y-4 opacity-0"
            enter-to-class="transform translate-y-0 opacity-100"
            leave-active-class="transition duration-200 ease-in"
            leave-from-class="transform translate-y-0 opacity-100"
            leave-to-class="transform translate-y-4 opacity-0"
        >
            <div
                v-for="toast in toastStore.toasts"
                :key="toast.id"
                :class="['alert shadow-lg flex items-center justify-between gap-3 text-sm py-2 px-4 rounded-xl', alertClass(toast.type)]"
            >
                <span>{{ toast.message }}</span>
                <button
                    @click="toastStore.removeToast(toast.id)"
                    class="btn btn-ghost btn-xs btn-circle text-current hover:bg-black/10"
                >
                    ✕
                </button>
            </div>
        </transition-group>
    </div>
</template>

<script setup>
import { useToastStore } from '@/stores/toast';

const toastStore = useToastStore();

function alertClass(type) {
    if (type === 'success') return 'alert-success text-success-content';
    if (type === 'warning') return 'alert-warning text-warning-content';
    if (type === 'error') return 'alert-error text-error-content';
    return 'alert-info text-info-content';
}
</script>
