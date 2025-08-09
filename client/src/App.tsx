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
    return (
        <Routes>
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

            {/* Fallback */}
            <Route path="*" element={<Login />} />
        </Routes>
    );
}

export default App;
