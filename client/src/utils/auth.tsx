export const logout = async () => {
    try {
        // Call backend logout endpoint to clear cookies
        await fetch('http://localhost:4000/admin/logout', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Error during logout:', error);
    } finally {
        // Clear local storage regardless of backend response
        sessionStorage.removeItem('user');
        localStorage.removeItem('readNotifications');

        // Redirect to login
        window.location.href = '/login';
    }
};