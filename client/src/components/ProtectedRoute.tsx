import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useSharedValue } from './context/shareValue';

interface ProtectedRouteProps {
    children: ReactNode;
    requiredRoles: string[];
    fallback?: ReactNode;
}

const ProtectedRoute = ({ children, requiredRoles, fallback }: ProtectedRouteProps) => {
    const { isSuperAdmin, isRegularAdmin, isRider } = useSharedValue();
    const navigate = useNavigate();
    const [isChecking, setIsChecking] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Add a small delay to ensure context is fully loaded
        const checkAccess = async () => {
            try {
                await new Promise(resolve => setTimeout(resolve, 100));
                setIsChecking(false);
            } catch (err) {
                console.error('Error checking access:', err);
                setError('Failed to verify access permissions');
                setIsChecking(false);
            }
        };

        checkAccess();
    }, []);

    // Show loading while checking permissions
    if (isChecking) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-600">Checking permissions...</p>
                </div>
            </div>
        );
    }

    // Show error if permission check failed
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">
                        Permission Error
                    </h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <div className="space-y-2">
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            Go to Login
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    let hasAccess = false;
    if (requiredRoles.includes('superadmin') && isSuperAdmin) {
        hasAccess = true;
    } else if (requiredRoles.includes('admin') && isRegularAdmin) {
        hasAccess = true;
    } else if (requiredRoles.includes('rider') && isRider) {
        hasAccess = true;
    }

    if (!hasAccess) {
        return fallback || (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl">🚫</span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">
                        Access Denied
                    </h2>
                    <p className="text-gray-600 mb-4">
                        You don't have permission to access this page.
                    </p>
                    <p className="text-sm text-gray-500">
                        Required role: {requiredRoles.join(' or ')}
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="mt-4 px-4 py-2 bg-[#1680E4] text-white rounded-lg hover:bg-[#126dcc] transition"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default ProtectedRoute;