import Avatar from '@mui/material/Avatar';
import ButtonBase from '@mui/material/ButtonBase';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Profile = () => {

    const navigate = useNavigate();
    document.title = "Profile - Rider Management System";
    const [CurrentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [password, setPassword] = useState("")

    useEffect(() => {
        interface User {
            password: string;
        }


        const fetchUsers = async () => {
            try {
                const response = await fetch(`http://localhost:3000/users`);
                if (!response.ok) throw new Error('Network response was not ok');

                const data = await response.json();
                const user = data.find((user: User) => user.password === CurrentPassword);

                if (user) {
                    console.log("Password match found:", user.password, CurrentPassword);
                } else {
                    console.log("No match found");
                }
            } catch (error) {
                console.error("Fetch error:", error);
            }
        };

        if (CurrentPassword) {
            fetchUsers();
        }
    }, [CurrentPassword]);

    const handleChangePassword = async (event: React.FormEvent) => {
        event.preventDefault();
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');


        const res = await fetch(`http://localhost:3000/users/${user}`, {
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
    }
    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <div className="flex items-center justify-center h-16">
                <img src="dashboard.png" alt="arrow" className="right-6/7 fixed" />
                <h1 className="text-2xl font-bold text-center m-auto">Profile</h1>
            </div>
            <div className='flex justify-around items-center'>
                <div className='flex w-1/2 h-screen justify-center items-center'>
                    <UploadAvatars />
                </div>
                <div className='border-gray-300 m-0 p-2 border-l-1 w-1/2 h-3/4 flex justify-center items-center'>
                    <div className="border border-[#5932EA] p-6 rounded-lg w-3/4 bg-white shadow-sm">
                        <form onSubmit={handleChangePassword} className="flex flex-col w-full gap-4">
                            <input
                                type="password"
                                placeholder='Current Password'
                                value={CurrentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                autoComplete="current-password"
                                className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5932EA]"
                            />
                            <input
                                type="password"
                                placeholder="New Password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                autoComplete="new-password"
                                className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5932EA]"
                            />
                            <input
                                type="password"
                                placeholder="Confirm Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="confirm-password"
                                className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#5932EA]"
                            />
                            <button
                                type="submit"
                                className="w-full bg-[#5932EA] hover:bg-[#4a28c2] text-white py-2 rounded-md text-sm transition"
                            >
                                Sign In
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Profile;

const UploadAvatars: React.FC = () => {
    const [avatarSrc, setAvatarSrc] = React.useState<string | undefined>(undefined);

    const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Read the file as a data URL
            const reader = new FileReader();
            reader.onload = () => {
                setAvatarSrc(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <ButtonBase
            component="label"
            role={undefined}
            tabIndex={-1} // prevent label from tab focus
            aria-label="Avatar image"
            sx={{
                borderRadius: '40px',
                '&:has(:focus-visible)': {
                    outline: '2px solid',
                    outlineOffset: '2px',
                },
            }}
        >
            <Avatar alt="Upload new avatar" src={avatarSrc} sx={{ width: 250, height: 250, marginBottom: 5 }} />
            <input
                type="file"
                accept="image/*"
                style={{
                    border: 0,
                    clip: 'rect(0 0 0 0)',
                    height: '1px',
                    margin: '-1px',
                    overflow: 'hidden',
                    padding: 0,
                    position: 'absolute',
                    whiteSpace: 'nowrap',
                    width: '1px',
                }}
                onChange={handleAvatarChange}
            />
        </ButtonBase>
    );
}
