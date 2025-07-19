// src/context/ValueContext.tsx
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";

// Define the shape of the data
interface ValueContextType {
    sharedValue: User | null;
    setSharedValue: (value: User | null) => void;
}

interface User {
    id: number;
    name: string;
    email: string;
}

// Create the actual context
const ValueContext = createContext<ValueContextType | undefined>(undefined);

// Provider component with children
export const ValueProvider = ({ children }: { children: ReactNode }) => {
    //state to hold object not array
    const [sharedValue, setSharedValue] = useState<User | null>(() => {
        // load from localStorage on first load
        const stored = localStorage.getItem("loggedInUser");
        return stored ? JSON.parse(stored) : null;
    });
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

// Hook to use the context safely
export const useSharedValue = () => {
    const context = useContext(ValueContext);
    if (!context) {
        throw new Error("useSharedValue must be used within a ValueProvider");
    }
    return context;
};
