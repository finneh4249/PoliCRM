// Shared Constants
export const API_URL = '';

// Toast Notification
export function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';
    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';

    toast.className = `${bgClass} text-white px-6 py-4 rounded-xl shadow-2xl transform transition-all duration-300 translate-x-full opacity-0 flex items-center gap-3 min-w-[300px]`;
    toast.innerHTML = `
        <span class="text-2xl">${icon}</span>
        <span class="font-medium flex-grow">${message}</span>
        <button onclick="this.parentElement.remove()" class="text-white/80 hover:text-white text-xl leading-none">×</button>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-x-full', 'opacity-0'), 50);
    setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Debounce Utility
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Auth Helper
export function getAuthToken() {
    return localStorage.getItem('authToken');
}

// API Helper
export async function fetchWithAuth(url, options = {}) {
    const token = getAuthToken();
    const headers = {
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }

    return response;
}
