import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

export function Topbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);

  const handleLogout = () => {
    dispatch({ type: 'auth/clearToken' }); 
    dispatch({ type: 'auth/clearUser' });
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between px-6 md:px-8 py-4">
        <h1 className="text-xl font-bold text-secondary-900">Admin Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="font-medium text-sm text-secondary-700 hidden sm:block">
            {user?.name || 'Administrator'}
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden shadow-sm">
            {user?.name ? user.name[0].toUpperCase() : 'A'}
          </div>
          <button 
            onClick={handleLogout}
            className="text-sm font-medium px-4 py-2 rounded-lg text-secondary-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
