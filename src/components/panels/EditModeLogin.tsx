/**
 * Edit Mode Login Modal
 *
 * Password-protected access to edit mode.
 */

import React, { useState, useCallback } from 'react';
import { useUIStore } from '../../store/uiStore';

interface EditModeLoginProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditModeLogin: React.FC<EditModeLoginProps> = ({ isOpen, onClose }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const setMode = useUIStore((state) => state.setMode);
  const editModePassword = useUIStore((state) => state.editModePassword);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (password === editModePassword) {
      setMode('draw');
      setPassword('');
      setError('');
      onClose();
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  }, [password, editModePassword, setMode, onClose]);

  const handleClose = useCallback(() => {
    setPassword('');
    setError('');
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-80">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Enter Edit Mode</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter password"
              autoFocus
            />
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditModeLogin;
