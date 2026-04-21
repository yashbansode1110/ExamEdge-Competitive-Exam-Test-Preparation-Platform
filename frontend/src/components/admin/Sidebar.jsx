import React from 'react';

export function Sidebar({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'questions', label: 'Questions' },
    { id: 'tests', label: 'Tests' },
    { id: 'cheating', label: 'Cheating Logs' }
  ];

  return (
    <aside className="w-64 bg-gray-900 text-white hidden md:flex flex-col flex-shrink-0 h-full">
      <div className="p-6">
        <h2 className="text-2xl font-bold tracking-wider">ExamEdge</h2>
        <p className="text-gray-400 text-sm mt-1">Admin Panel</p>
      </div>
      <nav className="mt-6 flex-1 px-4 space-y-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
