import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";

interface User {
    id: string;
    name: string;
    email: string;
    role_id?: string;
    role_name: string;
    photo_url?: string;
    created_at?: string;
}

interface SharedValueContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    isSuperAdmin: boolean;
    isRegularAdmin: boolean;
    isAnyAdmin: boolean;
    isRider: boolean;
    logout: () => Promise<void>;
    isLoading: boolean;
}

const SharedValueContext = createContext<SharedValueContextType | undefined>(undefined);

export const SharedValueProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUserState] = useState<User | null>(() => {
        const savedUser = sessionStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [isLoading, setIsLoading] = useState(false);

    // Role helpers
    const isSuperAdmin = user?.role_name?.toLowerCase() === 'superadmin';
    // If not superadmin and user exists, treat as regular admin
    const isRegularAdmin = !!user && !!user.role_name && !isSuperAdmin;
    const isAnyAdmin = !!user && !!user.role_name;
    // Rider: user exists and does NOT have a role_name property
    const isRider = !!user && !user.role_name;

    // Set user and sync with sessionStorage
    const setUser = (newUser: User | null) => {
        setUserState(newUser);
        if (newUser) {
            sessionStorage.setItem('user', JSON.stringify(newUser));
        } else {
            sessionStorage.removeItem('user');
        }
    };

    // Logout function
    const logout = async () => {
        setIsLoading(true);
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/admin/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            // Ignore backend errors, always clear local state
            console.error('Logout failed:', error);
        } finally {
            sessionStorage.clear(); // Clears all sessionStorage keys
            setUserState(null);
            setIsLoading(false);
            window.location.href = '/login';
        }
    };

    return (
        <SharedValueContext.Provider value={{
            user,
            setUser,
            isSuperAdmin,
            isRegularAdmin,
            isAnyAdmin,
            isRider, // <-- add this
            logout,
            isLoading
        }}>
            {children}
        </SharedValueContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSharedValue = () => {
    const context = useContext(SharedValueContext);
    if (context === undefined) {
        throw new Error('useSharedValue must be used within a SharedValueProvider');
    }
    return context;
};