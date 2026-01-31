
import React from 'react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const appVersion = "1.0.1";

  return (
    <footer className="w-full py-6 px-8 border-t border-gray-200 bg-white/50 backdrop-blur-sm mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
           <p className="text-sm font-bold text-slate-600">
               &copy; {currentYear} Dimensi Suara
           </p>
           <p className="text-xs text-slate-400 mt-0.5">
               CMS Version {appVersion}
           </p>
        </div>
        
        <div className="text-xs text-slate-400 font-medium">
            Authorized Personnel Only
        </div>
      </div>
    </footer>
  );
};
