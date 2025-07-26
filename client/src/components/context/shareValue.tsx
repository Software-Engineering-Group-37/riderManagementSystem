import { useContext } from "react";
import type { ValueContextType } from "./valueContext";
import { ValueContext } from "./valueContext";

/**
 * Custom hook to access the shared ValueContext.
 * Throws an error if used outside of a ValueProvider.
 */
export const useSharedValue = (): ValueContextType => {
    const context = useContext(ValueContext);
    if (!context) {
        throw new Error("useSharedValue must be used within a ValueProvider");
    }
    return context;
};