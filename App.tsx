
import React, { useState, useEffect, useRef } from 'react';
import { Search, BarChart3, Key, Info, Check, X } from 'lucide-react';
import ProcessVisualizer from './components/ProcessVisualizer';
import ReportDisplay from './components/ReportDisplay';
import { generateFinancialAnalysis } from './services/geminiService';
import { AgentReport, ProcessStage, ProcessStep } from './types';

const INITIAL_STEPS: ProcessStep[] = [
  { id: '1', agentName: 'SearchAgent', label: '系统就绪', status: 'pending' },
  { id: '2', agentName: 'Analyst', label: '等待指令...', status: 'pending' },
  { id: '3', agentName: 'RiskModel', label: '等待指令...', status: 'pending' },
  { id: '4', agentName: 'ReportGen', label: '等待指令...', status: 'pending' },
];

const LOADING_MESSAGES = [
  "正在深挖最近 3 个月的财报会议纪要...",
  "正在交叉验证市场传闻与官方公告...",
  "正在构建现金流折现模型 (DCF)...",
  "正在进行 SWOT 竞争格局推演...",
  "正在对比同行业竞争对手数据...",
  "正在最终排版与渲染可视化图表..."
];

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<ProcessStage>(ProcessStage.IDLE);
  const [steps, setSteps] = useState<ProcessStep[]>(INITIAL_STEPS);
  const [report, setReport] = useState<AgentReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // API Key Management
  const [apiKey, setApiKey] = useState('');
  const [tempApiKey, setTempApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [hasEnvKey, setHasEnvKey] = useState(false);

  // Interval ref for clearing the loading message cycler
  // Use ReturnType<typeof setInterval> to handle both browser (number) and Node (Timeout) environments
  const messageIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const hasKey = !!process.env.API_KEY;
    setHasEnvKey(hasKey);
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
    };
  }, []);

  const handleSaveKey = () => {
    setApiKey(tempApiKey);
    setShowKeyInput(false);
  };

  const isConnected = hasEnvKey || !!apiKey;

  // Automatically show input if not connected on load (and no env key)
  useEffect(() => {
    if (!isConnected) {
        setShowKeyInput(true);
    }
  }, [isConnected]);

  const runSimulation = async (userQuery: string) => {
    setStage(ProcessStage.PROCESSING);
    setReport(null);
    setError(null);
    if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);

    // Initial State
    setSteps([
      { id: '1', agentName: 'SearchAgent', label: '正在连接 Google 实时索引库...', status: 'active' },
      { id: '2', agentName: 'Analyst', label: '等待数据...', status: 'pending' },
      { id: '3', agentName: 'RiskModel', label: '等待分析...', status: 'pending' },
      { id: '4', agentName: 'ReportGen', label: '等待生成...', status: 'pending' },
    ]);

    try {
      // 1. Start the API call immediately in background
      const analysisPromise = generateFinancialAnalysis(userQuery, apiKey);

      // 2. Play the "Pre-computation" animation (Steps 1-3)
      //    We make these fast enough to feel responsive, but not instant.
      
      // Step 1 Finish
      await new Promise(r => setTimeout(r, 1000));
      setSteps(prev => [
        { ...prev[0], status: 'complete', label: '已获取最新市场数据' },
        { ...prev[1], status: 'active', label: '正在识别关键财务指标...' },
        prev[2], prev[3]
      ]);

      // Step 2 Finish
      await new Promise(r => setTimeout(r, 1200)); 
      setSteps(prev => [
        prev[0],
        { ...prev[1], status: 'complete', label: '基本面逻辑推演完成' },
        { ...prev[2], status: 'active', label: '正在评估宏观与地缘风险...' },
        prev[3]
      ]);

      // Step 3 Finish -> Move to Final Wait State
      await new Promise(r => setTimeout(r, 1200));
      setSteps(prev => [
        prev[0], prev[1],
        { ...prev[2], status: 'complete', label: '风险量化模型构建完成' },
        { ...prev[3], status: 'active', label: '正在整合数据生成最终报告...' }, // Initial label
      ]);

      // 3. The "Long Wait" Phase
      //    If the API hasn't finished yet, we start cycling messages on the last step
      //    so the user knows the AI is still "thinking" and not frozen.
      let msgIndex = 0;
      messageIntervalRef.current = setInterval(() => {
        setSteps(prev => {
          // IMPORTANT: Create a NEW array and NEW object for the updated step
          // to ensure React detects the state change and re-renders.
          return prev.map((step, index) => {
            if (index === 3 && step.status === 'active') {
              return { 
                ...step, 
                label: LOADING_MESSAGES[msgIndex % LOADING_MESSAGES.length] 
              };
            }
            return step;
          });
        });
        msgIndex++;
      }, 2000); // Update status every 2 seconds

      // 4. Await the actual result
      const data = await analysisPromise;

      // 5. Cleanup and Finish
      if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);

      setSteps(prev => [
        prev[0], prev[1], prev[2],
        { ...prev[3], status: 'complete', label: '报告生成完毕' },
      ]);

      setReport(data);
      setStage(ProcessStage.COMPLETE);

    } catch (err) {
      console.error(err);
      if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
      
      // Mark current active step as failed
      setSteps(prev => prev.map(s => s.status === 'active' ? { ...s, status: 'active' } : s)); 
      setError("网络请求超时或 API 配额不足，已自动切换至演示数据模式。");
      setStage(ProcessStage.ERROR);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    runSimulation(query);
  };

  return (
    <div className="min-h-screen font-sans text-slate-600 pb-20 bg-[#f8fafc]">
      
      {/* API Key & Status Banner */}
      <div className="bg-white/80 backdrop-blur border-b border-slate-100 px-4 py-3 transition-all">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <div className={`w-2 h-2 rounded-full ${!isConnected ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`}></div>
            <span>
              {!isConnected ? (
                <span className="flex items-center gap-1">
                  <Info className="w-4 h-4 text-amber-500" />
                  <strong>演示模式：</strong> 请输入 Gemini API Key 以使用真实数据
                </span>
              ) : (
                 <strong>已连接至 Gemini AI (支持 Google Search 实时联网)</strong>
              )}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {showKeyInput ? (
              <div className="flex items-center gap-2 animate-fade-in-up">
                  <input 
                    type="password" 
                    placeholder="粘贴 Google Gemini API Key"
                    className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 w-48 md:w-72 bg-slate-50"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                  />
                  <button onClick={handleSaveKey} className="p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm transition-colors">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowKeyInput(false)} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowKeyInput(true)}
                className={`text-xs px-4 py-1.5 rounded-full font-bold border transition-all flex items-center gap-2 ${apiKey ? 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100' : 'bg-blue-600 border-transparent text-white hover:bg-blue-700 shadow-md shadow-blue-500/20'}`}
              >
                <Key className="w-3 h-3" />
                {apiKey ? "更换 API Key" : "配置 API Key"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navbar */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100/50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-slate-800 leading-tight">Nexus</h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide">FINANCIAL INTELLIGENCE</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        
        {/* Hero Section */}
        <div className={`text-center transition-all duration-700 ease-in-out ${stage !== ProcessStage.IDLE ? 'mb-8 opacity-0 h-0 overflow-hidden' : 'mb-16 mt-8 opacity-100'}`}>
          <h1 className="text-4xl md:text-6xl font-bold text-slate-800 mb-6 tracking-tight leading-tight">
            洞察金融市场的<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">每一个细微信号</span>
          </h1>
          <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-light">
            基于 Google Gemini 实时联网搜索，融合深度推理，为您提供机构级的投资研报。
            <br className="hidden md:block" />
            请输入股票代码或公司名称开始分析。
          </p>
        </div>

        {/* Search Interface */}
        <div className={`transition-all duration-500 ${stage === ProcessStage.COMPLETE ? 'hidden' : 'block'}`}>
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="relative z-20">
              
              <div className="relative flex items-center bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-2 gap-2 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] focus-within:ring-4 focus-within:ring-blue-500/10 border border-slate-100">
                
                <div className="pl-4 pr-2 flex items-center">
                   <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded-lg">Gemini 2.5 Flash</span>
                </div>
                
                <div className="w-px h-8 bg-slate-100 mx-1"></div>

                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="输入股票代码或公司名称 (e.g., TSLA, 茅台)..."
                  className="flex-1 bg-transparent border-none text-slate-800 text-lg placeholder-slate-300 focus:ring-0 focus:outline-none font-bold"
                />
                <button 
                  type="submit"
                  disabled={!query.trim()}
                  className="hidden md:flex items-center justify-center w-12 h-12 bg-slate-900 text-white rounded-2xl hover:bg-black disabled:opacity-50 disabled:hover:bg-slate-900 transition-all shadow-lg shadow-slate-900/20"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </form>

            {/* Suggestions */}
            <div className="flex justify-center gap-3 mt-6 flex-wrap">
              {['分析特斯拉 (TSLA)', '贵州茅台 vs 五粮液', '英伟达 SWOT'].map((item) => (
                <button 
                  key={item}
                  onClick={() => { setQuery(item); runSimulation(item); }}
                  className="px-4 py-2 text-xs font-bold text-slate-400 bg-white border border-slate-100 rounded-xl hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm hover:shadow-md cursor-pointer"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Processing State */}
        {(stage === ProcessStage.PROCESSING || stage === ProcessStage.ERROR) && (
          <div className="mt-12 animate-fade-in-up">
             <ProcessVisualizer stage={stage} steps={steps} />
             {/* Hint for long waits */}
             {stage === ProcessStage.PROCESSING && (
               <p className="text-center text-xs text-slate-400 mt-6 animate-pulse">
                 正在进行实时全网搜索与深度推理，可能需要 15-30 秒，请耐心等待...
               </p>
             )}
          </div>
        )}

        {/* Error State Message */}
        {error && (
          <div className="max-w-md mx-auto mt-8 bg-white border border-red-100 text-slate-600 p-6 rounded-3xl shadow-xl shadow-red-500/5 flex items-start gap-4">
             <div className="bg-red-50 p-2 rounded-full shrink-0">
               <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
             </div>
             <div>
               <h3 className="font-bold text-slate-800">分析中断</h3>
               <p className="text-sm mt-1 opacity-80">{error}</p>
               <button 
                 onClick={() => setStage(ProcessStage.IDLE)}
                 className="mt-3 text-xs font-bold text-red-600 hover:underline"
               >
                 返回重试
               </button>
             </div>
          </div>
        )}

        {/* Result Display */}
        {report && stage === ProcessStage.COMPLETE && (
           <div className="mt-4 animate-fade-in-up">
             <ReportDisplay data={report} onReset={() => { setStage(ProcessStage.IDLE); setQuery(''); }} />
           </div>
        )}

      </main>
    </div>
  );
};

export default App;
