import React from 'react';
import { BarChart3, Construction } from 'lucide-react';

const AnalyticsPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="bg-white rounded-2xl shadow-sm p-12 text-center max-w-md">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <BarChart3 className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Analytics & Report</h2>
        <div className="flex items-center justify-center gap-2 text-gray-500 mb-4">
          <Construction className="w-4 h-4" />
          <span className="text-sm">In arrivo</span>
        </div>
        <p className="text-gray-500 text-sm">
          Questa sezione sarà disponibile presto con grafici avanzati,
          report di performance, trend storici e analisi predittive.
        </p>
      </div>
    </div>
  );
};

export default AnalyticsPage;
