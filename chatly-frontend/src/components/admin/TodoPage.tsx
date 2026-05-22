import React from "react";
import { Construction, ArrowRight } from "lucide-react";

interface TodoPageProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  todoItems: string[];
  requiredApis?: string[];
}

export const TodoPage: React.FC<TodoPageProps> = ({
  title,
  description,
  icon,
  todoItems,
  requiredApis,
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight font-outfit">
          {title}
        </h1>
        <p className="text-sm text-slate-500">{description}</p>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
        <div className="flex flex-col items-center text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#7c3aed]/10 border border-[#7c3aed]/20 flex items-center justify-center text-[#7c3aed] mb-4">
            {icon}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Construction size={18} className="text-amber-500" />
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
              Under Development
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 font-outfit mb-2">
            Feature Coming Soon
          </h2>
          <p className="text-sm text-slate-500">
            This module requires additional backend API endpoints before it can be implemented.
            The following items are tracked for development.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 mb-3">
              Implementation Tasks
            </h3>
            <ul className="space-y-2">
              {todoItems.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-slate-600">
                  <ArrowRight size={14} className="text-[#7c3aed] mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {requiredApis && requiredApis.length > 0 && (
            <div className="bg-amber-50/50 rounded-xl p-5 border border-amber-100">
              <h3 className="text-sm font-bold text-amber-700 mb-3">
                Required Backend APIs
              </h3>
              <ul className="space-y-2">
                {requiredApis.map((api, index) => (
                  <li
                    key={index}
                    className="text-xs text-amber-800 font-mono bg-amber-100/50 px-2 py-1.5 rounded-lg"
                  >
                    {api}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default TodoPage;
