import React from 'react';
import { FiLogOut } from 'react-icons/fi';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'warning' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    type = 'danger'
}) => {
    if (!isOpen) return null;

    const getTypeStyles = () => {
        switch (type) {
            case 'danger':
                return {
                    confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
                    icon: 'text-red-600',
                    border: 'border-red-200'
                };
            case 'warning':
                return {
                    confirmButton: 'bg-amber-600 hover:bg-amber-700 text-white',
                    icon: 'text-amber-600',
                    border: 'border-amber-200'
                };
            case 'info':
                return {
                    confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white',
                    icon: 'text-blue-600',
                    border: 'border-blue-200'
                };
            default:
                return {
                    confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
                    icon: 'text-red-600',
                    border: 'border-red-200'
                };
        }
    };

    const styles = getTypeStyles();

    return (
        <div className="fixed inset-0 bg-[#ffffff74] bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className={`px-6 py-4 border-b ${styles.border} rounded-t-xl`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center ${styles.icon}`}>
                            <FiLogOut className="w-4 h-4" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-4">
                    <p className="text-gray-600 leading-relaxed">{message}</p>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-2 ${styles.confirmButton}`}
                    >
                        <FiLogOut className="w-4 h-4" />
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;