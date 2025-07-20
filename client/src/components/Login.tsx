import { useEffect, useState } from 'react';
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

    const navigate = useNavigate();
    const { setSharedValue } = useSharedValue();

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        const response = await fetch('http://localhost:3000/users');
        const data = await response.json();
        const user = data.find((user: User) => user.email === email && user.password === password);
        console.log("Login attempt:", { email, password, user });
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
        <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
            <div className="border border-[#5932EA] p-6 rounded-lg w-full max-w-[400px] mx-auto bg-white shadow-sm">
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5932EA]"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5932EA]"
                    />
                    <button
                        type="submit"
                        className="w-full bg-[#5932EA] hover:bg-[#4a28c2] text-white py-2 rounded-md text-sm transition"
                    >
                        Sign In
                    </button>
                    <Link to="/forgotPassword" className="text-xs underline text-center cursor-pointer text-[#5932EA]">
                        Forgot Password?
                    </Link>
                </form>
            </div>
        </div>
    );
}
export default Login;
