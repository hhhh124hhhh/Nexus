import React from 'react';
import { ProcessStage, ProcessStep } from '../types';
import { Database, Layers, BrainCircuit, FileBarChart, CheckCircle2, Loader2, BarChart3, XCircle } from 'lucide-react';

interface ProcessVisualizerProps {
  stage: ProcessStage;
  steps: ProcessStep[];
}

const ProcessVisualizer: React.FC<ProcessVisualizerProps> = ({ stage, steps }) => {
  
  const getIcon = (agentName: string) => {
    if (agentName === 'DataAgent') return <Database className="w-4 h-4" />;
    if (agentName === 'Reasoning' || agentName === 'DeepThink') return <BrainCircuit className="w-4 h-4" />;
    if (agentName === 'RiskModel') return <Layers className="w-4 h-4" />;
    if (agentName === 'Benchmark') return <BarChart3 className="w-4 h-4" />;
    return <FileBarChart className="w-4 h-4" />;
  };

  return (
    <div className="w-full max-w-xl mx-auto my-12">
      <div className="bg-white rounded-[2rem] p-10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] border border-slate-50">
        <div className="flex items-center justify-between mb-10">
          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-3">
            {stage === ProcessStage.ERROR ? (
              <span className="flex h-3 w-3 rounded-full bg-red-500"></span>
            ) : (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            )}
            
            {stage === ProcessStage.ERROR ? (
              <span className="text-red-500 flex items-center gap-2">
                分析已终止
              </span>
            ) : (
              "智能体实时分析中"
            )}
          </h3>
          <span className={`text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full ${stage === ProcessStage.ERROR ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-500'}`}>
            {stage === ProcessStage.ERROR ? 'Error' : 'AI Active'}
          </span>
        </div>

        <div className="space-y-1 relative pl-2">
          {/* Connecting Line */}
          <div className="absolute left-[27px] top-3 bottom-8 w-0.5 bg-slate-100 -z-10"></div>

          {steps.map((step, index) => {
            const isActive = step.status === 'active';
            const isComplete = step.status === 'complete';
            const isPending = step.status === 'pending';
            
            // If the whole stage is ERROR and this was the active step, mark it as error
            const isError = stage === ProcessStage.ERROR && isActive;

            return (
              <div 
                key={step.id}
                className={`flex items-center gap-6 py-3 transition-all duration-500 ${isPending ? 'opacity-40' : 'opacity-100'}`}
              >
                <div className={`
                  w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 z-10 shadow-sm
                  ${isActive && !isError ? 'bg-slate-900 text-white scale-110 shadow-lg shadow-slate-900/30' : ''}
                  ${isComplete ? 'bg-emerald-500 text-white' : ''}
                  ${isError ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110' : ''}
                  ${isPending ? 'bg-white border border-slate-100 text-slate-300' : ''}
                `}>
                  {isComplete ? <CheckCircle2 className="w-5 h-5" /> : 
                   isError ? <XCircle className="w-5 h-5" /> :
                   isActive ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                   getIcon(step.agentName)}
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-bold ${isActive ? 'text-slate-900' : isError ? 'text-red-600' : 'text-slate-500'}`}>
                      {step.agentName}
                    </span>
                  </div>
                  <div className={`text-xs mt-0.5 font-medium ${isError ? 'text-red-400' : 'text-slate-400'}`}>
                    {isError ? '步骤执行失败' : step.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProcessVisualizer;