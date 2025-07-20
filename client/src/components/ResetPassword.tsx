import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
const ResetPassword = () => {
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        document.title = "Reset Password - Rider Management System";
    }, []);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        const { id } = user;


        const res = await fetch(`http://localhost:3000/users/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },

            body: JSON.stringify({
                password,
            })
        });
        if (!res.ok) {
            console.log("Rider not found!");
            return;
        }
        navigate("/login")
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-center mt-8">Reset Password</h1>
            <div className="flex justify-center mt-6">
                <form className='bg-white flex gap-4' onSubmit={handleSubmit}>
                    <input type="password" placeholder="New Password" required className="w-4/5 border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5932EA]" value={password} onChange={(e) => { setPassword(e.target.value) }} />
                    <button type="submit" className="w-1/2 bg-[#5932EA] hover:bg-[#4a28c2] text-white py-2 rounded-md text-sm transition">
                        Reset Password
                    </button>
                </form>
            </div>
        </div>
    );
}

export default ResetPassword;
