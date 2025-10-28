import React from 'react';
import { Users, Activity } from 'lucide-react';

const PageHeader: React.FC = () => {
  return (
    <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Crowd Management</h1>
              <p className="text-blue-100 mt-1">Real-time occupancy monitoring and predictions</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 rounded-xl p-3">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <div className="text-white font-medium">Live Monitoring</div>
              <div className="text-blue-100 text-sm">Auto-refresh: 10s</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
