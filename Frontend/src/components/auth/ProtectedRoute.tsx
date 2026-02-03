import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    let isAuthenticated = false;

    // Direct check for truthy string that isn't "null" or "undefined"
    if (userStr && userStr !== "null" && userStr !== "undefined") {
        try {
            const user = JSON.parse(userStr);
            // Must be an object with an ID or Email
            if (user && typeof user === 'object' && (user.id || user.adminId || user.email)) {
                isAuthenticated = true;
            }
        } catch (e) {
            console.error("Auth: Session corruption detected");
            isAuthenticated = false;
        }
    }

    if (!isAuthenticated) {
        console.warn("Auth: Access denied to protected route - Forcing hard redirect to login");
        window.location.href = '/';
        return null;
    }

    return <Outlet />;
};

export default ProtectedRoute;
