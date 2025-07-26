// src/context/ValueContext.tsx
import type { ReactNode } from "react";
import { createContext, useEffect, useState } from "react";

// Context value type: holds the current user and a setter
interface ValueContextType {
    sharedValue: User | null;
    setSharedValue: (value: User | null) => void;
}

// User object shape
interface User {
    id: number;
    name: string;
    email: string;
}

// Create context for sharing user state across the app
const ValueContext = createContext<ValueContextType | undefined>(undefined);

// Provider component: wraps app and provides user state/context
export const ValueProvider = ({ children }: { children: ReactNode }) => {
    // State to hold the current user (null if not logged in)
    const [sharedValue, setSharedValue] = useState<User | null>(() => {
        // Load user from localStorage on first load
        const stored = localStorage.getItem("loggedInUser");
        return stored ? JSON.parse(stored) : null;
    });

    // Persist user to localStorage whenever it changes
    useEffect(() => {
        if (sharedValue) {
            localStorage.setItem("loggedInUser", JSON.stringify(sharedValue));
        } else {
            localStorage.removeItem("loggedInUser");
        }
    }, [sharedValue]);

    return (
        <ValueContext.Provider value={{ sharedValue, setSharedValue }}>
            {children}
        </ValueContext.Provider>
    );
};
export { ValueContext, type ValueContextType };

