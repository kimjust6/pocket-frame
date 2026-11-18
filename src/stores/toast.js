import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useToastStore = defineStore('toast', () => {
    const toasts = ref([]);
    let counter = 0;

    function addToast(message, type = 'info', timeout = 3500) {
        const id = ++counter;
        toasts.value.push({ id, message, type });

        if (timeout > 0) {
            setTimeout(() => {
                removeToast(id);
            }, timeout);
        }
    }

    function removeToast(id) {
        toasts.value = toasts.value.filter(t => t.id !== id);
    }

    function success(msg, timeout) {
        addToast(msg, 'success', timeout);
    }

    function error(msg, timeout) {
        addToast(msg, 'error', timeout);
    }

    function warning(msg, timeout) {
        addToast(msg, 'warning', timeout);
    }

    function info(msg, timeout) {
        addToast(msg, 'info', timeout);
    }

    return {
        toasts,
        addToast,
        removeToast,
        success,
        error,
        warning,
        info
    };
});
