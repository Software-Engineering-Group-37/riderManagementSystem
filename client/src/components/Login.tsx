import { useEffect, useState } from 'react';
import { FiEye, FiEyeOff } from "react-icons/fi";
import { Link, useNavigate } from 'react-router-dom';
import { useSharedValue } from './context/shareValue';

interface User {
    id: number;
    name: string;
    email: string;
    password: string;
}

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();
    const { setSharedValue } = useSharedValue();

    // Handle login form submission and authentication
    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        const response = await fetch('http://localhost:4000/users');
        const data = await response.json();
        const user = data.find((user: User) => user.email === email && user.password === password);
        setSharedValue(user);
        if (!user) {
            alert('Invalid email or password');
            return;
        }
        sessionStorage.setItem('user', JSON.stringify(user.id));
        navigate('/dashboard');
    };

    useEffect(() => {
        document.title = "Login - Rider Management System";
    }, []);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-white px-4">
            <div className="border border-[#1680E4] p-8 rounded-2xl w-full max-w-[400px] bg-white shadow-lg space-y-6">

                {/* Logo & Title */}
                <div className="flex flex-col items-center space-y-2">
                    <img src='zippy_logo.svg' alt="Zippy Logo" className="w-14 h-14" />
                    <h2 className="text-xl font-semibold text-gray-800">Welcome to Zippy</h2>
                    <p className="text-sm text-gray-500">Sign in to continue</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    {/* Email Input */}
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        className="w-full border border-gray-300 px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1680E4]"
                    />

                    {/* Password Input with show/hide toggle */}
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            className="w-full border border-gray-300 px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1680E4]"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            tabIndex={-1}
                        >
                            {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                        </button>
                    </div>

                    {/* Sign In Button */}
                    <button
                        type="submit"
                        className="w-full bg-[#1680E4] hover:bg-[#126dcc] text-white py-2 rounded-lg text-sm font-medium transition"
                    >
                        Sign In
                    </button>
                </form>

                {/* Forgot Password Link */}
                <div className="text-center">
                    <Link
                        to="/forgotPassword"
                        className="text-xs underline text-[#1680E4] hover:text-[#0f5db1] transition"
                    >
                        Forgot Password?
                    </Link>
                </div>
            </div>
        </div>
    );
}
export default Login;
