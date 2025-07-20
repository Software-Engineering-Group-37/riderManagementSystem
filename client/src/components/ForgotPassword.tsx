import React, { useState } from 'react';

const ForgotPassword = () => {
    const [email, setEmail] = useState('')
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-center mt-8">Forgot Password</h1>
            <div className="flex justify-center mt-6">
                <form onSubmit={handleSubmit} className='bg-white flex gap-4'>
                    <input type="email" placeholder="Enter your email" value={email} onChange={(e) => {
                        setEmail(e.target.value);
                    }} required className="w-4/5 border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5932EA]" />
                    <button type="submit" className="w-1/2 bg-[#5932EA] hover:bg-[#4a28c2] text-white py-2 rounded-md text-sm transition">Send Reset Link</button>
                </form>
            </div>
        </div>
    );
}

export default ForgotPassword;
