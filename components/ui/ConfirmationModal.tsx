'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, HelpCircle } from 'lucide-react';
import { Button } from './Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  confirmText?: string;
  confirmVariant?: 'danger' | 'primary';
}

export const ConfirmationModal = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  loading,
  confirmText,
  confirmVariant = 'danger'
}: ConfirmationModalProps) => {
  const isDanger = confirmVariant === 'danger';
  const defaultConfirmText = isDanger ? 'Confirmar Exclusão' : 'Confirmar';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8 text-center"
          >
            <div className={`w-16 h-16 ${isDanger ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'} rounded-full flex items-center justify-center mx-auto mb-6`}>
              {isDanger ? <AlertCircle className="w-8 h-8" /> : <HelpCircle className="w-8 h-8" />}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-500 mb-8">{message}</p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={onCancel} className="flex-1 cursor-pointer" disabled={loading}>
                Cancelar
              </Button>
              <Button 
                onClick={onConfirm} 
                className={`flex-1 cursor-pointer ${isDanger ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`} 
                disabled={loading}
              >
                {loading ? 'Processando...' : (confirmText || defaultConfirmText)}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
