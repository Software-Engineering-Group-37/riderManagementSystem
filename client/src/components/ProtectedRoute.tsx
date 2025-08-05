import type { ReactNode } from 'react';
import { useSharedValue } from './context/shareValue';

interface ProtectedRouteProps {
    children: ReactNode;
    requiredRoles: string[];
    fallback?: ReactNode;
}

const ProtectedRoute = ({ children, requiredRoles, fallback }: ProtectedRouteProps) => {
    const { isSuperAdmin, isRegularAdmin, isRider } = useSharedValue();

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
                        onClick={() => window.history.back()}
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