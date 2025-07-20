import { useContext } from "react";
import type { ValueContextType } from "./valueContext";
import { ValueContext } from "./valueContext";
// Hook to use the context safely
export const useSharedValue = (): ValueContextType => {
    const context = useContext(ValueContext);
    if (!context) {
        throw new Error("useSharedValue must be used within a ValueProvider");
    }
    return context;
};