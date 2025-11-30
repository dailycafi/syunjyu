'use client';

import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />
      
      {/* Modal Card - iOS Style Alert */}
      <div className="relative w-full max-w-[270px] bg-white/85 dark:bg-slate-800/85 backdrop-blur-xl rounded-[14px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transform">
        <div className="p-5 text-center">
          <h3 className="text-[17px] font-semibold text-slate-900 dark:text-white mb-1 leading-snug font-rounded">
            {title}
          </h3>
          <p className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed font-rounded">
            {message}
          </p>
        </div>
        
        <div className="grid grid-cols-2 border-t border-slate-300/30 dark:border-slate-600/50">
          <button
            onClick={onCancel}
            className="py-3 text-[17px] font-normal text-blue-500 dark:text-blue-400 hover:bg-slate-100/50 dark:hover:bg-slate-700/50 active:bg-slate-200/50 transition-colors font-rounded border-r border-slate-300/30 dark:border-slate-600/50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`py-3 text-[17px] font-semibold hover:bg-slate-100/50 dark:hover:bg-slate-700/50 active:bg-slate-200/50 transition-colors font-rounded ${
              isDestructive ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
