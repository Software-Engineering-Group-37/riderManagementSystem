import { Route, Routes } from 'react-router-dom';
import './App.css';
import Dashboard from './components/Dashboard';
import ForgotPassword from './components/ForgotPassword';
import History from './components/History';
import Login from './components/Login';
import Notification from './components/Notification';
import Profile from './components/Profile';
import ResetPassword from './components/ResetPassword';
import Rider from './components/Rider';
import Shift from './components/Shift';
const App = () => {
    return (
        <div>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/riders" element={<Rider />} />
                <Route path="/shifts" element={<Shift />} />
                <Route path="/history" element={<History />} />
                <Route path="/notifications" element={<Notification />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/forgotPassword" element={<ForgotPassword />} />
                <Route path="/resetPassword" element={<ResetPassword />} />
            </Routes>
        </div>
    );
}

export default App;
