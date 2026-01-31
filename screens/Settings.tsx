
import React, { useState } from 'react';
import { Settings as SettingsIcon, Plus, Trash2, Save, Globe } from 'lucide-react';

interface Props {
  aggregators: string[];
  setAggregators: (list: string[]) => void;
}

export const Settings: React.FC<Props> = ({ aggregators, setAggregators }) => {
  const [newAgg, setNewAgg] = useState('');

  const handleAdd = () => {
    if (newAgg.trim()) {
        setAggregators([...aggregators, newAgg.trim()]);
        setNewAgg('');
    }
  };

  const handleRemove = (index: number) => {
    const newList = aggregators.filter((_, i) => i !== index);
    setAggregators(newList);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen">
       <div className="mb-8 border-b border-gray-200 pb-6">
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                <SettingsIcon size={32} className="text-slate-400" />
                Settings
            </h1>
            <p className="text-slate-500 mt-1 ml-11">Configure your CMS parameters.</p>
       </div>

       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2bg-purple-50 rounded-lg text-purple-600">
                    <Globe size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Release Configuration</h2>
                    <p className="text-sm text-slate-500">Manage distribution partners (Aggregators).</p>
                </div>
            </div>

            <div className="max-w-md">
                <label className="block text-sm font-bold text-slate-700 mb-3">Active Aggregators</label>
                
                <div className="flex gap-2 mb-4">
                    <input 
                        value={newAgg}
                        onChange={(e) => setNewAgg(e.target.value)}
                        placeholder="Add new aggregator (e.g. Tunecore)"
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                    />
                    <button 
                        onClick={handleAdd}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                <div className="bg-slate-50 rounded-xl border border-gray-200 overflow-hidden">
                    {aggregators.length === 0 && (
                        <div className="p-4 text-center text-slate-400 text-sm">No aggregators defined.</div>
                    )}
                    <ul className="divide-y divide-gray-200">
                        {aggregators.map((agg, idx) => (
                            <li key={idx} className="px-4 py-3 flex justify-between items-center bg-white">
                                <span className="font-medium text-slate-700">{agg}</span>
                                <button 
                                    onClick={() => handleRemove(idx)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                <p className="text-xs text-slate-400 mt-3">These options will appear when changing a release status to "Processing".</p>
            </div>
       </div>
    </div>
  );
};
