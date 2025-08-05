import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    // Handle form submission for password reset
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();
            if (response.ok) {
                setStatus('success');
                setMessage('If this email exists, super admins have been notified to assist with your password reset.');
            } else {
                setStatus('error');
                setMessage(data.error || 'Something went wrong. Please try again.');
            }
        } catch {
            setStatus('error');
            setMessage('Network error. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1680E4] to-[#1268ba] relative overflow-hidden">
            <Helmet>
                <title>Forgot Password - Rider Management System</title>
                <meta name="description" content="Request a password reset for your account." />
            </Helmet>
            {/* Decorative blurred circles */}
            <div className="absolute -top-20 -left-20 w-72 h-72 bg-[#1680E4] opacity-20 rounded-full blur-2xl z-0"></div>
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#1268ba] opacity-20 rounded-full blur-3xl z-0"></div>
            <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md z-10">
                <div className="flex flex-col items-center mb-6">
                    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mb-2">
                        <circle cx="40" cy="40" r="40" fill="#1680E4" fillOpacity="0.1" />
                        <rect x="20" y="30" width="40" height="28" rx="4" fill="#1680E4" />
                        <rect x="26" y="36" width="28" height="4" rx="2" fill="#fff" />
                        <rect x="26" y="44" width="18" height="4" rx="2" fill="#fff" />
                        <circle cx="54" cy="48" r="3" fill="#fff" />
                    </svg>
                    <h1 className="text-2xl font-bold text-gray-800 mb-1">Forgot Password?</h1>
                    <p className="text-gray-500 text-sm text-center">
                        Enter your email and super admins will be notified to assist with your password reset.
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="border border-gray-300 px-4 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1680E4]"
                        disabled={status === 'loading'}
                    />
                    <button
                        type="submit"
                        className="bg-[#1680E4] hover:bg-[#1268ba] text-white py-2 rounded-md text-sm font-semibold transition"
                        disabled={status === 'loading'}
                    >
                        {status === 'loading' ? 'Sending...' : 'Send Request'}
                    </button>
                </form>
                {message && (
                    <div className={`mt-4 text-center text-sm ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {message}
                    </div>
                )}
                <div className="mt-6 text-center">
                    <a href="/login" className="text-[#1680E4] hover:underline text-sm">Back to Login</a>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
