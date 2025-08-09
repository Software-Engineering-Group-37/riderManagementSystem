import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import './App.css';
import Admin from './components/Admin';
import Dashboard from './components/Dashboard';
import ForgotPassword from './components/ForgotPassword';
import History from './components/History';
import Login from './components/Login';
import Notification from './components/Notification';
import Profile from './components/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import Rider from './components/Rider';
import RiderDashboard from './components/RiderDashboard';
import Shift from './components/Shift';
import SystemSettings from './components/SystemSetting';


const App = () => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Initialize app and handle any startup errors
        const initializeApp = async () => {
            try {
                // Add any initialization logic here
                await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to ensure context is ready
                setIsInitialized(true);
            } catch (err) {
                console.error('App initialization error:', err);
                setError('Failed to initialize application');
                setIsInitialized(true); // Still set to true to show error UI
            }
        };

        initializeApp();
    }, []);

    // Show loading screen during initialization
    if (!isInitialized) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-white">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Show error screen if initialization failed
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-white">
                <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">
                        Application Error
                    </h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        );
    }

    return (
        <Routes>
            {/* Default route - redirect to login */}
            <Route path="/" element={<Login />} />

            {/* Public routes */}
            <Route path="/login" element={<Login />} />

            {/* Rider Dashboard - only for riders */}
            <Route path="/rider-dashboard" element={
                <ProtectedRoute requiredRoles={['rider']}>
                    <RiderDashboard />
                </ProtectedRoute>
            } />

            {/* Protected routes - Both Admin types */}
            <Route path="/dashboard" element={
                <ProtectedRoute requiredRoles={['superadmin', 'admin']}>
                    <Dashboard />
                </ProtectedRoute>
            } />

            <Route path="/riders" element={
                <ProtectedRoute requiredRoles={['superadmin', 'admin']}>
                    <Rider />
                </ProtectedRoute>
            } />

            <Route path="/shifts" element={
                <ProtectedRoute requiredRoles={['superadmin', 'admin']}>
                    <Shift />
                </ProtectedRoute>
            } />

            <Route path="/history" element={
                <ProtectedRoute requiredRoles={['superadmin', 'admin']}>
                    <History />
                </ProtectedRoute>
            } />

            <Route path="/profile" element={
                <ProtectedRoute requiredRoles={['superadmin', 'admin']}>
                    <Profile />
                </ProtectedRoute>
            } />

            {/* superadmin ONLY routes */}
            <Route path="/admins" element={
                <ProtectedRoute requiredRoles={['superadmin']}>
                    <Admin />
                </ProtectedRoute>
            } />


            <Route path="/system-settings" element={
                <ProtectedRoute requiredRoles={['superadmin']}>
                    <SystemSettings />
                </ProtectedRoute>
            } />

            <Route path="/notifications" element={
                <ProtectedRoute requiredRoles={['superadmin', 'admin']}>
                    <Notification />
                </ProtectedRoute>
            } />

            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Fallback for any unmatched routes */}
            <Route path="*" element={
                <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-white">
                    <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
                        <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-2xl">🔍</span>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">
                            Page Not Found
                        </h2>
                        <p className="text-gray-600 mb-4">
                            The page you're looking for doesn't exist.
                        </p>
                        <button
                            onClick={() => window.location.href = '/login'}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            Go to Login
                        </button>
                    </div>
                </div>
            } />
        </Routes>
    );
}

export default App;
