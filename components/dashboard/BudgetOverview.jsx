import { useState } from 'react';

export default function BudgetOverview({ totalBudget, budgetUsed }) {
  const percentUsed = Math.round((budgetUsed / totalBudget) * 100);
  const remaining = totalBudget - budgetUsed;
  
  // Format numbers as currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  // Determine color based on budget usage
  const getStatusColor = (percent) => {
    if (percent < 70) return 'bg-green-500';
    if (percent < 90) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Budget Overview</h2>
      
      <div className="mb-6">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">Budget Usage</span>
          <span className="text-sm font-medium">{percentUsed}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${getStatusColor(percentUsed)}`} 
            style={{ width: `${percentUsed}%` }}
          ></div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">Total Budget</p>
          <p className="text-2xl font-bold">{formatCurrency(totalBudget)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">Remaining</p>
          <p className="text-2xl font-bold">{formatCurrency(remaining)}</p>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between">
          <div>
            <p className="text-sm text-gray-500">Used</p>
            <p className="text-lg font-semibold">{formatCurrency(budgetUsed)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Last Updated</p>
            <p className="text-sm">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}