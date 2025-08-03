import { useEffect, useState } from 'react';
import { FiEye, FiEyeOff } from "react-icons/fi";
import { Link, useNavigate } from 'react-router-dom';
import { useSharedValue } from './context/shareValue';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const { setUser } = useSharedValue();
    // Handle login form submission
    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // This includes cookies
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Store user data only (no tokens!)
            sessionStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
            navigate('/dashboard');

        } catch (error: unknown) {
            if (error instanceof Error) {
                setError(error.message || 'Login failed');
            } else {
                setError('Login failed');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
        if (error) setError('');
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
        if (error) setError('');
    };

    useEffect(() => {
        document.title = "Login - Rider Management System";

        // Check if already logged in
        const user = sessionStorage.getItem('user');
        if (user) {
            navigate('/dashboard');
        }
    }, [navigate]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-white px-4">
            <div className="border border-[#1680E4] p-8 rounded-2xl w-full max-w-[400px] bg-white shadow-lg space-y-6">

                {/* Logo & Title */}
                <div className="flex flex-col items-center space-y-2">
                    <img src='zippy_logo.svg' alt="Zippy Logo" className="w-14 h-14" />
                    <h2 className="text-xl font-semibold text-gray-800">Welcome to Zippy</h2>
                    <p className="text-sm text-gray-500">Sign in to continue</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={handleEmailChange}
                        required
                        disabled={loading}
                        className="w-full border border-gray-300 px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1680E4] disabled:opacity-50"
                    />

                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={handlePasswordChange}
                            required
                            disabled={loading}
                            className="w-full border border-gray-300 px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1680E4] disabled:opacity-50"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                            disabled={loading}
                        >
                            {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !email || !password}
                        className="w-full bg-[#1680E4] hover:bg-[#126dcc] text-white py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center justify-center"
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Signing in...
                            </div>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                {/* Test Credentials */}
                {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-700 font-medium mb-1">Test Credentials:</p>
                    <p className="text-xs text-blue-600">Email: superadmin@example.com</p>
                    <p className="text-xs text-blue-600">Password: superadmin123</p>
                </div> */}

                <div className="text-center">
                    <Link to="/forgot-Password" className="text-xs underline text-[#1680E4]">
                        Forgot Password?
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default Login;
