import React from 'react';
import { Step } from '../types';
import { Check } from 'lucide-react';

interface Props {
  currentStep: number;
}

const steps = [
  { id: Step.INFO, label: "Info", desc: "Basic Details" },
  { id: Step.TRACKS, label: "Tracks", desc: "Audio Files" },
  { id: Step.DETAILS, label: "Details", desc: "Dates & UPC" },
  { id: Step.REVIEW, label: "Review", desc: "Finalize" },
];

export const StepIndicator: React.FC<Props> = ({ currentStep }) => {
  return (
    <div className="w-full mb-12 px-2">
      <div className="flex items-center justify-between relative">
        {/* Connecting Line Background */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-100 rounded-full -z-10"></div>
        
        {/* Active Line (Dynamic width based on step) */}
        <div 
          className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full -z-10 transition-all duration-500 ease-out"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        ></div>

        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;

          return (
            <div key={step.id} className="flex flex-col items-center group cursor-default">
               <div 
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition-all duration-300 border-4 
                    ${isActive 
                      ? 'bg-white border-blue-500 text-blue-600 scale-110' 
                      : isCompleted 
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-500 border-white text-white' 
                        : 'bg-white border-white text-gray-300'}`}
               >
                  {isCompleted ? <Check size={20} strokeWidth={3} /> : step.id}
               </div>
               <div className={`mt-3 text-center transition-all duration-300 ${isActive ? 'transform translate-y-0 opacity-100' : 'transform translate-y-1 opacity-70'}`}>
                 <h4 className={`text-sm font-bold ${isActive ? 'text-blue-900' : 'text-gray-400'}`}>
                   {step.label}
                 </h4>
                 <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium hidden sm:block">
                   {step.desc}
                 </p>
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};