
import React, { useState } from 'react';
import { AgentReport, SwotAnalysis, CompetitorData } from '../types';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
  ArrowUpRight, ArrowDownRight, Minus, AlertCircle, 
  CheckCircle2, Zap, Shield, Target, Search, BrainCircuit, 
  ChevronDown, ChevronUp, ExternalLink, Globe, AlertTriangle
} from 'lucide-react';

interface ReportDisplayProps {
  data: AgentReport;
  onReset: () => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
        <p className="text-slate-400 text-xs mb-1 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-slate-800 font-bold text-xl font-mono">
          {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

// --- Sub-Components ---

const SwotCard = ({ title, items, type }: { title: string, items: string[], type: 'strength' | 'weakness' | 'opportunity' | 'threat' }) => {
  const styles = {
    strength: { bg: 'bg-emerald-50/50', text: 'text-emerald-800', iconBg: 'bg-emerald-100', icon: <Zap className="w-4 h-4 text-emerald-600" /> },
    weakness: { bg: 'bg-rose-50/50', text: 'text-rose-800', iconBg: 'bg-rose-100', icon: <AlertCircle className="w-4 h-4 text-rose-600" /> },
    opportunity: { bg: 'bg-blue-50/50', text: 'text-blue-800', iconBg: 'bg-blue-100', icon: <Target className="w-4 h-4 text-blue-600" /> },
    threat: { bg: 'bg-amber-50/50', text: 'text-amber-800', iconBg: 'bg-amber-100', icon: <Shield className="w-4 h-4 text-amber-600" /> }
  };
  
  const style = styles[type];

  return (
    <div className={`p-6 rounded-[2rem] ${style.bg} h-full transition-all hover:scale-[1.02] duration-300 border border-transparent hover:border-slate-100/50`}>
      <div className="flex items-center gap-3 mb-5">
        <div className={`${style.iconBg} p-2 rounded-xl`}>
          {style.icon}
        </div>
        <h4 className={`text-base font-bold tracking-tight ${style.text}`}>{title}</h4>
      </div>
      <ul className="space-y-4">
        {items.map((item, idx) => (
          <li key={idx} className="text-sm text-slate-600 leading-relaxed flex items-start gap-3">
            <div className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${type === 'strength' ? 'bg-emerald-400' : type === 'weakness' ? 'bg-rose-400' : type === 'opportunity' ? 'bg-blue-400' : 'bg-amber-400'}`}></div>
            <span className="opacity-90">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const CompetitorTable = ({ data }: { data: CompetitorData[] }) => (
  <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="bg-slate-50/80 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <th className="p-5 pl-8">公司名称</th>
          <th className="p-5 text-right">营收 (Revenue)</th>
          <th className="p-5 text-right">市值 (Market Cap)</th>
          <th className="p-5 text-right pr-8">市盈率 (P/E)</th>
        </tr>
      </thead>
      <tbody className="text-sm divide-y divide-slate-50">
        {data.map((comp, idx) => (
          <tr key={idx} className={`hover:bg-slate-50/50 transition-colors group ${idx === 0 ? 'bg-blue-50/30' : ''}`}>
            <td className="p-5 pl-8 font-semibold text-slate-700 flex items-center gap-3">
              {idx === 0 && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>}
              {comp.name}
              {idx === 0 && <span className="text-[10px] text-blue-600 bg-blue-100 px-2 py-1 rounded-lg ml-2 font-bold">当前标的</span>}
            </td>
            <td className="p-5 text-right text-slate-500 font-mono group-hover:text-slate-800 transition-colors">{comp.revenue}</td>
            <td className="p-5 text-right text-slate-500 font-mono group-hover:text-slate-800 transition-colors">{comp.marketCap}</td>
            <td className="p-5 pr-8 text-right font-mono font-bold text-slate-700 bg-slate-50/50 rounded-lg">{comp.peRatio}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// --- Main Component ---

const ReportDisplay = ({ data, onReset }: ReportDisplayProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'swot' | 'competitors'>('overview');
  const [isReasoningOpen, setIsReasoningOpen] = useState(true);

  // 显示配额超限提示
  if (data.quotaExceeded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 max-w-2xl w-full text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-amber-800 mb-2">API 配额已超限</h3>
          <p className="text-amber-700 mb-6">当前正在显示演示数据。Gemini API 配额已用完，请稍后再试或查看您的计费详情。</p>
          <div className="text-sm text-amber-600 bg-white/50 rounded-xl p-4 mb-6 text-left">
            {data.errorMessage || '配额超限，请检查您的计划和计费详情。'}
          </div>
          <div className="text-xs text-amber-500">
            提示：您可以通过设置自己的 API 密钥来避免配额限制。
          </div>
        </div>
      </div>
    );
  }

  const renderTrendIcon = (trend: string) => {
    if (trend === 'up') return <ArrowUpRight className="w-5 h-5 text-emerald-500" />;
    if (trend === 'down') return <ArrowDownRight className="w-5 h-5 text-rose-500" />;
    return <Minus className="w-5 h-5 text-slate-300" />;
  };

  const getRatingStyle = (r: string) => {
    if (r === 'BUY') return 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30';
    if (r === 'SELL') return 'bg-rose-500 text-white shadow-lg shadow-rose-500/30';
    return 'bg-amber-400 text-white shadow-lg shadow-amber-400/30';
  };

  return (
    <div className="w-full space-y-8">
      
      {/* Action Bar */}
      <div className="flex justify-end mb-2">
         <button 
            onClick={onReset} 
            className="group text-sm text-slate-400 hover:text-slate-900 flex items-center gap-2 transition-all bg-white px-5 py-2.5 rounded-full shadow-sm hover:shadow-md border border-slate-100"
         >
           <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
           开始新的分析
         </button>
      </div>

      {/* Thinking Box (Chain of Thought) */}
      {data.reasoning && (
        <div className="bg-white rounded-[2rem] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100">
          <button 
            onClick={() => setIsReasoningOpen(!isReasoningOpen)}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors"
          >
             <div className="flex items-center gap-4">
               <div className="bg-indigo-50 p-2.5 rounded-2xl text-indigo-600">
                  <BrainCircuit className="w-5 h-5" />
               </div>
               <span className="text-sm font-bold text-slate-700">AI 深度思维链 (Chain of Thought)</span>
             </div>
             <div className={`p-1 rounded-full bg-slate-100 transition-transform duration-300 ${isReasoningOpen ? 'rotate-180' : ''}`}>
                <ChevronDown className="w-4 h-4 text-slate-400" />
             </div>
          </button>
          
          {isReasoningOpen && (
            <div className="px-6 pb-6 pt-0">
              <div className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 text-sm text-slate-600 leading-8 font-mono tracking-tight whitespace-pre-wrap">
                {data.reasoning}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.05)] relative overflow-hidden border border-slate-50">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-50 via-indigo-50 to-white rounded-full blur-3xl -z-10 opacity-80 translate-x-1/3 -translate-y-1/3"></div>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
          <div className="flex-1 space-y-5">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold tracking-wide">
                {data.ticker || "TICKER: N/A"}
              </span>
              {data.isMock && (
                <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-lg font-bold border border-amber-100">
                   <AlertCircle className="w-3 h-3" /> 演示数据
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">{data.title}</h1>
            <p className="text-slate-500 leading-relaxed text-base md:text-lg max-w-3xl font-light">{data.summary}</p>
          </div>

          {/* Rating Box */}
          <div className="flex-shrink-0 flex flex-col items-center md:items-end gap-4">
             <div className={`px-8 py-6 rounded-[2rem] text-center min-w-[140px] ${getRatingStyle(data.rating)}`}>
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">投资评级</div>
                <div className="text-3xl font-black tracking-wide">{data.rating}</div>
             </div>
             <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                <span className="text-xs text-slate-400 font-bold">AI 置信度</span>
                <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                   <div className="h-full bg-slate-800 rounded-full" style={{width: `${data.ratingScore}%`}}></div>
                </div>
                <span className="font-mono text-xs font-bold text-slate-700">{data.ratingScore}%</span>
             </div>
             {/* 数据可信度评分 */}
             {data.confidenceScore !== undefined && (
               <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
                  <span className="text-xs text-blue-500 font-bold">数据可信度</span>
                  <div className="w-16 h-2 bg-blue-200 rounded-full overflow-hidden">
                     <div 
                       className="h-full rounded-full transition-all duration-500 ease-out"
                       style={{ 
                         width: `${data.confidenceScore}%`,
                         backgroundColor: data.confidenceScore > 70 ? '#10b981' : data.confidenceScore > 40 ? '#f59e0b' : '#ef4444' 
                       }}
                     ></div>
                  </div>
                  <span className="font-mono text-xs font-bold" style={{ 
                    color: data.confidenceScore > 70 ? '#10b981' : data.confidenceScore > 40 ? '#f59e0b' : '#ef4444' 
                  }}>{data.confidenceScore}%</span>
               </div>
             )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex bg-slate-100 p-1.5 rounded-[1.5rem] gap-1 shadow-inner shadow-slate-200/50">
          {[
            { id: 'overview', label: '核心概览' },
            { id: 'swot', label: 'SWOT 分析' },
            { id: 'competitors', label: '同业对比' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 text-sm font-bold rounded-[1.2rem] transition-all duration-300 ${
                activeTab === tab.id 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px] animate-fade-in-up">
        
        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {data.keyMetrics.map((metric, idx) => (
                <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-50 hover:shadow-md transition-shadow">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-3">{metric.label}</span>
                  <div className="flex items-end justify-between">
                    <span className="text-2xl font-bold text-slate-800 font-mono tracking-tight">{metric.value}</span>
                    <div className="bg-slate-50 p-1.5 rounded-full">
                      {renderTrendIcon(metric.trend)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart */}
              <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-50">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-base font-bold text-slate-800">核心财务趋势</h3>
                  <div className="flex gap-2 items-center">
                     <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                     <span className="text-xs text-slate-400 font-medium">预测值 (E)</span>
                  </div>
                </div>
                <div className="h-[400px] w-full min-w-[300px] flex items-center justify-center relative">
                  <ResponsiveContainer 
                    width="100%" 
                    height="100%"
                    minWidth={300}
                    minHeight={400}
                    style={{ width: '100%', height: '100%', minHeight: '400px' }}
                  >
                    {data.chartType === 'line' ? (
                      <LineChart data={data.chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" stroke="#cbd5e1" tick={{fontSize: 12, fill: '#94a3b8'}} tickLine={false} axisLine={false} dy={10} />
                        <YAxis stroke="#cbd5e1" tick={{fontSize: 12, fill: '#94a3b8'}} tickLine={false} axisLine={false} dx={-10} />
                        <Tooltip content={<CustomTooltip />} cursor={{stroke: '#e2e8f0', strokeWidth: 1}} />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#3b82f6" 
                          strokeWidth={4} 
                          dot={{r: 0}} 
                          activeDot={{r: 8, fill: '#3b82f6', stroke: '#fff', strokeWidth: 4}} 
                        />
                      </LineChart>
                    ) : (
                      <BarChart data={data.chartData} barSize={32}>
                         <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" stroke="#cbd5e1" tick={{fontSize: 12, fill: '#94a3b8'}} tickLine={false} axisLine={false} dy={10} />
                        <YAxis stroke="#cbd5e1" tick={{fontSize: 12, fill: '#94a3b8'}} tickLine={false} axisLine={false} dx={-10} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                        <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                          {data.chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === data.chartData.length - 1 ? '#3b82f6' : '#e2e8f0'} />
                          ))}
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Text Analysis */}
              <div className="space-y-4">
                 {data.sections.slice(0, 2).map((sec, idx) => (
                   <div key={idx} className="bg-white p-7 rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-50 h-fit">
                     <h4 className="text-slate-900 text-sm font-bold mb-3 flex items-center gap-2">
                       <span className="w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></span>
                       {sec.heading}
                     </h4>
                     <p className="text-slate-500 text-sm leading-relaxed">{sec.content}</p>
                   </div>
                 ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: SWOT */}
        {activeTab === 'swot' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SwotCard title="优势 (Strengths)" items={data.swot?.strengths || []} type="strength" />
            <SwotCard title="劣势 (Weaknesses)" items={data.swot?.weaknesses || []} type="weakness" />
            <SwotCard title="机会 (Opportunities)" items={data.swot?.opportunities || []} type="opportunity" />
            <SwotCard title="威胁 (Threats)" items={data.swot?.threats || []} type="threat" />
          </div>
        )}

        {/* TAB: COMPETITORS */}
        {activeTab === 'competitors' && (
          <div className="space-y-6">
             <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 rounded-[2.5rem] text-white shadow-lg shadow-blue-500/20 flex items-start gap-5">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                   <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-bold">行业对标洞察</h4>
                  <p className="text-white/80 text-sm mt-2 leading-relaxed max-w-2xl">
                    数据显示，当前标的在<strong>市值营收比</strong>上具有显著优势。虽然 P/E 略高于行业平均，但考虑到其高于同行的净利润增速，当前估值仍处于合理区间。
                  </p>
                </div>
             </div>
            <CompetitorTable data={data.competitors || []} />
          </div>
        )}

        {/* SOURCES SECTION - Required for Google Search Grounding */}
        {data.sources && data.sources.length > 0 && (
          <div className="mt-12 border-t border-slate-100 pt-8">
             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
               <Globe className="w-3 h-3" /> 数据来源 / 参考资料 (Sources)
             </h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               {data.sources.map((source, idx) => (
                 <a 
                   key={idx} 
                   href={source.uri} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="group flex items-center justify-between p-4 rounded-xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all"
                 >
                   <span className="text-sm font-medium text-slate-600 truncate group-hover:text-blue-600 pr-4">
                     {source.title}
                   </span>
                   <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-blue-400" />
                 </a>
               ))}
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ReportDisplay;
