import React, { useState } from 'react';

interface AlertProps {
    message: string;
    type?: 'success' | 'error' | 'info';
}

const Alert: React.FC<AlertProps> = ({ message, type = 'success' }) => {
    const [visible, setVisible] = useState(true);

    if (!visible) return null;

    let bgColor = 'bg-green-100';
    let textColor = 'text-green-800';
    let borderColor = 'border-green-600';
    let iconBg = 'bg-green-200';
    let icon = (
        <svg className="w-5 h-5 text-green-800" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
    );

    if (type === 'error') {
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        borderColor = 'border-red-600';
        iconBg = 'bg-red-200';
        icon = (
            <svg className="w-5 h-5 text-red-800" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
        );
    } else if (type === 'info') {
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        borderColor = 'border-blue-600';
        iconBg = 'bg-blue-200';
        icon = (
            <svg className="w-5 h-5 text-blue-800" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
        );
    }

    return (
        <div
            className={`fixed top-6 right-6 z-50 px-5 py-4 rounded-xl shadow-xl border-l-4 ${bgColor} ${textColor} ${borderColor} animate-slide-in`}
            style={{ minWidth: 280, maxWidth: 400 }}
        >
            <div className="flex items-start gap-3">
                <div className={`p-1 rounded-full ${iconBg}`}>
                    {icon}
                </div>
                <span className="text-sm font-medium mt-0.5">{message}</span>
                <button
                    onClick={() => setVisible(false)}
                    className="ml-auto text-lg font-bold leading-none opacity-70 hover:opacity-100"
                    aria-label="Close"
                >
                    ×
                </button>
            </div>
        </div>
    );
};

export default Alert;
