import React from 'react';
import { User, UserRole } from '../types';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  onSwitchRole: () => void; // For demo purposes
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, onSwitchRole }) => {
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                A
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900">
                AshrafCodeAcademy <span className="text-brand-600">AI</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <>
                 <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                  {user.role === UserRole.ADMIN ? 'Admin Mode' : 'Student Mode'}
                </span>
                <button
                  onClick={onSwitchRole}
                  className="text-xs text-slate-500 hover:text-brand-600 underline cursor-pointer"
                >
                  (Switch Role)
                </button>
                <div className="h-6 w-px bg-slate-200 mx-2"></div>
                <div className="flex flex-col items-end mr-2">
                    <span className="text-sm font-medium text-slate-900">{user.name}</span>
                </div>
                <button
                  onClick={onLogout}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Log out
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};