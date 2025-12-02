
// Chart data structure for Recharts
export interface ChartPoint {
  name: string;
  value: number;
  secondaryValue?: number;
}

export interface CompetitorData {
  name: string;
  revenue: string;
  marketCap: string;
  peRatio: string; // P/E Ratio
}

export interface SwotAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

// Structure of the full report returned by the AI
export interface AgentReport {
  title: string;
  ticker: string; // e.g., 600248.SH
  rating: 'BUY' | 'HOLD' | 'SELL';
  ratingScore: number; // 0-100
  summary: string;
  
  // AI Chain of Thought Trace
  reasoning: string; 

  // Deep Dive Data
  swot: SwotAnalysis;
  competitors: CompetitorData[];
  
  sections: {
    heading: string;
    content: string;
  }[];
  
  chartType: 'bar' | 'line' | 'area';
  chartData: ChartPoint[];
  keyMetrics: {
    label: string;
    value: string;
    trend: 'up' | 'down' | 'neutral';
  }[];
  
  // Grounding / Search Sources
  sources?: {
    title: string;
    uri: string;
  }[];
  
  // Error and quota handling
  quotaExceeded?: boolean;
  errorMessage?: string;
  
  // Data validation
  confidenceScore?: number; // 0-100, data validation confidence score
  
  isMock?: boolean;
}

// AI API类型枚举
export enum AiApiType {
  GEMINI = 'gemini',
  DEEPSEEK = 'deepseek',
  DEEPSEEK_REASONER = 'deepseek_reasoner',
  KIMI = 'kimi',
  ZHIPU = 'zhipu',
  BAIDU = 'baidu'
}

// State of the processing pipeline
export enum ProcessStage {
  IDLE = 'IDLE',
  STARTING = 'STARTING',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}

// Individual log steps for visualization
export interface ProcessStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete';
  agentName: 'DataAgent' | 'StrategyAgent' | 'RiskAgent' | 'MarketAgent' | 'ReportAgent' | string;
}
