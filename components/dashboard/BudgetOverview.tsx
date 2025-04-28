import React from 'react';

interface BudgetOverviewProps {
  totalBudget?: number;
  budgetUsed?: number;
}

const BudgetOverview: React.FC<BudgetOverviewProps> = ({ totalBudget = 0, budgetUsed = 0 }) => {
  const percent = totalBudget > 0 ? Math.min((budgetUsed / totalBudget) * 100, 100) : 0;
  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900">Budget Overview</h3>
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600">
            <span>${budgetUsed.toLocaleString()}</span>
            <span>${totalBudget.toLocaleString()}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div className="bg-blue-600 h-2 rounded-full progress-fill" />
          </div>
          <div className="text-sm text-gray-800 mt-1">
            {percent.toFixed(0)}% used
          </div>
        </div>
      </div>
      <style jsx>{` .progress-fill { width: ${percent}%; } `}</style>
    </>
  );
};

export default BudgetOverview;
