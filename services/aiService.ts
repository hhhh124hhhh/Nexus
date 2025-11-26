import { GoogleGenAI } from "@google/genai";
import { AgentReport, AiApiType } from '../types';
import { createBaiduSearchService } from './baiduSearchService';

// Re-export the AiApiType enum for convenience
export { AiApiType };

// Helper to clean JSON string (strips markdown code blocks and finds JSON object)
const cleanJsonString = (text: string): string => {
  if (!text) return "{}";
  // Remove markdown code blocks if present
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1) {
    return cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
};

// Gemini API调用逻辑
const callGeminiApi = async (query: string, apiKey: string): Promise<AgentReport> => {
  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    const model = "gemini-2.5-flash";
    
    const prompt = `
      Role: You are Nexus, a professional institutional financial analyst.
      User Query: "${query}"
      
      Task: 
      1. **MANDATORY**: Use the 'googleSearch' tool to find the LATEST, REAL-TIME financial data, news, and stock price for the requested company.
      2. Generate a comprehensive investment dashboard report in **Simplified Chinese (简体中文)**.
      3. IMPORTANT: The data in the JSON (Price, P/E, Competitor Stats) MUST come from the search results.
      
      Output Format:
      You MUST output a strictly valid JSON object. Do not output Markdown formatting like \`\`\`json.
      The JSON must match this structure:
      {
        "title": "string (e.g., Company Name (Ticker) Report)",
        "ticker": "string",
        "rating": "BUY" | "HOLD" | "SELL",
        "ratingScore": number (0-100),
        "summary": "string (brief executive summary)",
        "reasoning": "string (brief logical summary of the analysis)",
        "swot": {
          "strengths": ["string", "string", "string"],
          "weaknesses": ["string", "string", "string"],
          "opportunities": ["string", "string", "string"],
          "threats": ["string", "string", "string"]
        },
        "competitors": [
          { "name": "string", "revenue": "string", "marketCap": "string", "peRatio": "string" }
        ],
        "sections": [
          { "heading": "string", "content": "string" },
          { "heading": "string", "content": "string" }
        ],
        "chartType": "line" | "bar",
        "chartData": [
          { "name": "string (e.g., Q1)", "value": number }
        ],
        "keyMetrics": [
          { "label": "string", "value": "string", "trend": "up" | "down" | "neutral" }
        ]
      }
      
      Content Requirements:
      - Ensure all financial metrics (Revenue, P/E, Price) are up-to-date based on the search results.
      - Compare against 2-3 real competitors with REALISTIC data found via search.
      - Language: Simplified Chinese.
    `;

    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Request timed out")), 90000)
    );

    const apiCallPromise = ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.4,
      }
    });

    const result: any = await Promise.race([apiCallPromise, timeoutPromise]);

    if (result.text) {
      try {
        const cleanedText = cleanJsonString(result.text);
        const parsedReport = JSON.parse(cleanedText) as AgentReport;

        // Extract Grounding Metadata (Sources)
        const candidates = result.candidates || [];
        const groundingChunks = candidates[0]?.groundingMetadata?.groundingChunks || [];
        
        const sources = groundingChunks
          .map((chunk: any) => {
            if (chunk.web) {
              return { title: chunk.web.title, uri: chunk.web.uri };
            }
            return null;
          })
          .filter((source: any) => source !== null);

        return {
          ...parsedReport,
          sources: sources.length > 0 ? sources : undefined,
          isMock: false
        };

      } catch (parseError) {
        console.error("JSON Parse Error:", parseError, result.text);
        throw new Error("Failed to parse Gemini response");
      }
    } else {
      throw new Error("Empty response from Gemini");
    }

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

// DeepSeek API调用逻辑
const callDeepSeekApi = async (query: string, apiKey: string, searchResults: string = ''): Promise<AgentReport> => {
  try {
    const prompt = `
      Role: You are Nexus, a professional institutional financial analyst.
      User Query: "${query}"
      
      ${searchResults}
      
      Task: 
      1. Generate a comprehensive investment dashboard report in **Simplified Chinese (简体中文)**.
      2. IMPORTANT: Provide the LATEST, REAL-TIME financial data and analysis based on the provided search results.
      
      Output Format:
      You MUST output a strictly valid JSON object. Do not output Markdown formatting like \`\`\`json.
      The JSON must match this structure:
      {
        "title": "string (e.g., Company Name (Ticker) Report)",
        "ticker": "string",
        "rating": "BUY" | "HOLD" | "SELL",
        "ratingScore": number (0-100),
        "summary": "string (brief executive summary)",
        "reasoning": "string (brief logical summary of the analysis)",
        "swot": {
          "strengths": ["string", "string", "string"],
          "weaknesses": ["string", "string", "string"],
          "opportunities": ["string", "string", "string"],
          "threats": ["string", "string", "string"]
        },
        "competitors": [
          { "name": "string", "revenue": "string", "marketCap": "string", "peRatio": "string" }
        ],
        "sections": [
          { "heading": "string", "content": "string" },
          { "heading": "string", "content": "string" }
        ],
        "chartType": "line" | "bar",
        "chartData": [
          { "name": "string (e.g., Q1)", "value": number }
        ],
        "keyMetrics": [
          { "label": "string", "value": "string", "trend": "up" | "down" | "neutral" }
        ]
      }
      
      Content Requirements:
      - Ensure all financial metrics (Revenue, P/E, Price) are based on the provided search results.
      - Compare against 2-3 real competitors with REAL, SPECIFIC data found in the search results.
      - For competitors, MUST provide actual values for revenue, marketCap, and peRatio - NEVER use "未披露" or similar vague terms.
      - If no specific data is available for a competitor, use realistic estimates based on industry benchmarks.
      - Include the most recent stock price and market trends from the search results.
      - Language: Simplified Chinese.
    `;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat', // 使用稳定可用的模型
        messages: [
          { role: 'system', content: 'You are a professional financial analyst with access to the latest financial data.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || '';

    if (!resultText) {
      throw new Error("Empty response from DeepSeek");
    }

    try {
      const cleanedText = cleanJsonString(resultText);
      const parsedReport = JSON.parse(cleanedText) as AgentReport;

      return {
        ...parsedReport,
        isMock: false
      };

    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, resultText);
      throw new Error("Failed to parse DeepSeek response");
    }

  } catch (error) {
    console.error("DeepSeek API Error:", error);
    throw error;
  }
};

// Kimi API调用逻辑
const callKimiApi = async (query: string, apiKey: string, searchResults?: string): Promise<AgentReport> => {
  try {
    console.log('=== Kimi API调用详情 ===');
    console.log('Kimi API - 搜索结果:', searchResults ? '有搜索结果' : '无搜索结果');
    
    const prompt = `
      Role: You are Nexus, a professional institutional financial analyst.
      User Query: "${query}"
      
      ${searchResults}
      
      Task: 
      1. Generate a comprehensive investment dashboard report in **Simplified Chinese (简体中文)**.
      2. IMPORTANT: Provide the LATEST, REAL-TIME financial data and analysis based on the provided search results.
      
      Output Format:
      You MUST output a strictly valid JSON object. Do not output Markdown formatting like \`\`\`json.
      The JSON must match this structure:
      {
        "title": "string (e.g., Company Name (Ticker) Report)",
        "ticker": "string",
        "rating": "BUY" | "HOLD" | "SELL",
        "ratingScore": number (0-100),
        "summary": "string (brief executive summary)",
        "reasoning": "string (brief logical summary of the analysis)",
        "swot": {
          "strengths": ["string", "string", "string"],
          "weaknesses": ["string", "string", "string"],
          "opportunities": ["string", "string", "string"],
          "threats": ["string", "string", "string"]
        },
        "competitors": [
          { "name": "string", "revenue": "string", "marketCap": "string", "peRatio": "string" }
        ],
        "sections": [
          { "heading": "string", "content": "string" },
          { "heading": "string", "content": "string" }
        ],
        "chartType": "line" | "bar",
        "chartData": [
          { "name": "string (e.g., Q1)", "value": number }
        ],
        "keyMetrics": [
          { "label": "string", "value": "string", "trend": "up" | "down" | "neutral" }
        ]
      }
      
      Content Requirements:
      - Ensure all financial metrics (Revenue, P/E, Price) are based on the provided search results.
      - Compare against 2-3 real competitors with REAL, SPECIFIC data found in the search results.
      - For competitors, MUST provide actual values for revenue, marketCap, and peRatio - NEVER use "未披露" or similar vague terms.
      - If no specific data is available for a competitor, use realistic estimates based on industry benchmarks.
      - Include the most recent stock price and market trends from the search results.
      - Language: Simplified Chinese.
    `;

    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'kimi-k2-0905-preview', // 使用最新的Kimi K2模型
        messages: [
          { role: 'system', content: 'You are a professional financial analyst with access to the latest financial data.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`Kimi API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || '';

    if (!resultText) {
      throw new Error("Empty response from Kimi");
    }

    try {
      const cleanedText = cleanJsonString(resultText);
      const parsedReport = JSON.parse(cleanedText) as AgentReport;

      return {
        ...parsedReport,
        isMock: false
      };

    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, resultText);
      throw new Error("Failed to parse Kimi response");
    }

  } catch (error) {
    console.error("Kimi API Error:", error);
    throw error;
  }
};

// 智谱 AI API调用逻辑
const callZhipuApi = async (query: string, apiKey: string, searchResults: string = ''): Promise<AgentReport> => {
  try {
    const prompt = `
      Role: You are Nexus, a professional institutional financial analyst.
      User Query: "${query}"
      
      ${searchResults}
      
      Task: 
      1. Generate a comprehensive investment dashboard report in **Simplified Chinese (简体中文)**.
      2. IMPORTANT: Provide the LATEST, REAL-TIME financial data and analysis based on the provided search results.
      
      Output Format:
      You MUST output a strictly valid JSON object. Do not output Markdown formatting like \`\`\`json.
      The JSON must match this structure:
      {
        "title": "string (e.g., Company Name (Ticker) Report)",
        "ticker": "string",
        "rating": "BUY" | "HOLD" | "SELL",
        "ratingScore": number (0-100),
        "summary": "string (brief executive summary)",
        "reasoning": "string (brief logical summary of the analysis)",
        "swot": {
          "strengths": ["string", "string", "string"],
          "weaknesses": ["string", "string", "string"],
          "opportunities": ["string", "string", "string"],
          "threats": ["string", "string", "string"]
        },
        "competitors": [
          { "name": "string", "revenue": "string", "marketCap": "string", "peRatio": "string" }
        ],
        "sections": [
          { "heading": "string", "content": "string" },
          { "heading": "string", "content": "string" }
        ],
        "chartType": "line" | "bar",
        "chartData": [
          { "name": "string (e.g., Q1)", "value": number }
        ],
        "keyMetrics": [
          { "label": "string", "value": "string", "trend": "up" | "down" | "neutral" }
        ]
      }
      
      Content Requirements:
      - Ensure all financial metrics (Revenue, P/E, Price) are based on the provided search results.
      - Compare against 2-3 real competitors with REAL, SPECIFIC data found in the search results.
      - For competitors, MUST provide actual values for revenue, marketCap, and peRatio - NEVER use "未披露" or similar vague terms.
      - If no specific data is available for a competitor, use realistic estimates based on industry benchmarks.
      - Include the most recent stock price and market trends from the search results.
      - Language: Simplified Chinese.
    `;

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'glm-4.6', // 使用最新的GLM-4.6模型
        messages: [
          { role: 'system', content: 'You are a professional financial analyst with access to the latest financial data.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`Zhipu API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || '';

    if (!resultText) {
      throw new Error("Empty response from Zhipu");
    }

    try {
      const cleanedText = cleanJsonString(resultText);
      const parsedReport = JSON.parse(cleanedText) as AgentReport;

      return {
        ...parsedReport,
        isMock: false
      };

    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, resultText);
      throw new Error("Failed to parse Zhipu response");
    }

  } catch (error) {
    console.error("Zhipu API Error:", error);
    throw error;
  }
};

// 百度文心一言API调用逻辑
const callBaiduApi = async (query: string, apiKey: string, searchResults?: string): Promise<AgentReport> => {
  try {
    // 如果没有提供搜索结果，则调用百度搜索API获取最新金融数据
    let formattedSearchResults = searchResults;
    if (!formattedSearchResults) {
      const searchService = createBaiduSearchService(apiKey, ''); // 百度搜索API的secretKey暂时留空
      const results = await searchService.searchFinancialData(query);
      formattedSearchResults = searchService.formatSearchResults(results);
    }

    const prompt = `
      Role: You are Nexus, a professional institutional financial analyst.
      User Query: "${query}"
      
      ${formattedSearchResults}
      
      Task: 
      1. Generate a comprehensive investment dashboard report in **Simplified Chinese (简体中文)**.
      2. IMPORTANT: Provide the LATEST, REAL-TIME financial data and analysis based on the provided search results.
      
      Output Format:
      You MUST output a strictly valid JSON object. Do not output Markdown formatting like \`\`\`json.
      The JSON must match this structure:
      {
        "title": "string (e.g., Company Name (Ticker) Report)",
        "ticker": "string",
        "rating": "BUY" | "HOLD" | "SELL",
        "ratingScore": number (0-100),
        "summary": "string (brief executive summary)",
        "reasoning": "string (brief logical summary of the analysis)",
        "swot": {
          "strengths": ["string", "string", "string"],
          "weaknesses": ["string", "string", "string"],
          "opportunities": ["string", "string", "string"],
          "threats": ["string", "string", "string"]
        },
        "competitors": [
          { "name": "string", "revenue": "string", "marketCap": "string", "peRatio": "string" }
        ],
        "sections": [
          { "heading": "string", "content": "string" },
          { "heading": "string", "content": "string" }
        ],
        "chartType": "line" | "bar",
        "chartData": [
          { "name": "string (e.g., Q1)", "value": number }
        ],
        "keyMetrics": [
          { "label": "string", "value": "string", "trend": "up" | "down" | "neutral" }
        ]
      }
      
      Content Requirements:
      - Ensure all financial metrics (Revenue, P/E, Price) are based on the provided search results.
      - Compare against 2-3 real competitors with REAL, SPECIFIC data found in the search results.
      - For competitors, MUST provide actual values for revenue, marketCap, and peRatio - NEVER use "未披露" or similar vague terms.
      - If no specific data is available for a competitor, use realistic estimates based on industry benchmarks.
      - Include the most recent stock price and market trends from the search results.
      - Language: Simplified Chinese.
    `;

    const response = await fetch('https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'ernie-bot-4',
        messages: [
          { role: 'system', content: 'You are a professional financial analyst.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`Baidu API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const resultText = data.result || '';

    if (!resultText) {
      throw new Error("Empty response from Baidu");
    }

    try {
      const cleanedText = cleanJsonString(resultText);
      const parsedReport = JSON.parse(cleanedText) as AgentReport;

      return {
        ...parsedReport,
        isMock: false
      };

    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, resultText);
      throw new Error("Failed to parse Baidu response");
    }

  } catch (error) {
    console.error("Baidu API Error:", error);
    throw error;
  }
};

// Mock数据生成
const getMockData = async (query: string): Promise<AgentReport> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const isTech = query.includes("科技") || query.includes("宁德") || query.includes("Apple") || query.includes("特斯拉") || query.includes("TSLA");
  
  if (isTech) {
      return {
        title: "宁德时代 (300750.SZ) 深度研报",
        ticker: "300750.SZ",
        rating: "BUY",
        ratingScore: 88,
        summary: "全球动力电池绝对龙头，市占率稳居 35% 以上。神行电池与麒麟电池技术壁垒深厚，海外市场渗透率持续超预期。尽管二线厂商价格战激烈，但公司凭借规模效应与供应链管控，盈利能力依然强劲。",
        reasoning: "逻辑推演 (Demo)：\n1. 市场地位：全球第一，无可撼动，规模效应带来极低成本。\n2. 技术面：神行超充电池量产，技术代差维持在 1-2 年，护城河极深。\n3. 财务面：现金流极好，且碳酸锂价格下行利好毛利率修复。\n4. 风险点：地缘政治（美国市场受阻）是最大隐忧，但欧洲市场增长可对冲。\n5. 结论：当前估值处于历史低位区间，具备长期配置价值。",
        swot: {
            strengths: ["全球市占率第一 (36.8%)", "极强的供应链议价能力", "研发投入行业领先"],
            weaknesses: ["地缘政治风险（北美市场）", "国内储能市场内卷严重"],
            opportunities: ["欧洲电动化渗透率提升", "储能业务爆发式增长"],
            threats: ["固态电池技术颠覆风险", "整车厂自研电池趋势"]
        },
        competitors: [
            { name: "宁德时代", revenue: "¥4009亿", marketCap: "¥7800亿", peRatio: "18.5" },
            { name: "比亚迪", revenue: "¥6023亿", marketCap: "¥6200亿", peRatio: "21.2" },
            { name: "LG Energy", revenue: "¥1800亿", marketCap: "¥4100亿", peRatio: "45.3" }
        ],
        sections: [
          { heading: "业绩韧性分析", content: "Q3 归母净利润同比增长 10.5%，毛利率修复至 22% 以上，主要得益于碳酸锂成本下降及产能利用率提升。单位 Wh 盈利保持稳定，显示出极强的抗周期能力。" },
          { heading: "技术壁垒与新品", content: "发布的神行超充电池已在奇瑞、阿维塔等多款车型量产，构建了差异化竞争优势。麒麟电池在高端车型（如理想 Mega）上的应用进一步巩固了品牌溢价。" }
        ],
        chartType: "line",
        chartData: [
          { name: "23 Q4", value: 110 },
          { name: "24 Q1", value: 98 },
          { name: "24 Q2", value: 105 },
          { name: "24 Q3", value: 120 },
          { name: "24 Q4 (E)", value: 135 }
        ],
        keyMetrics: [
          { label: "毛利率", value: "22.9%", trend: "up" },
          { label: "全球市占率", value: "36.8%", trend: "neutral" },
          { label: "研发投入", value: "¥180亿", trend: "up" },
          { label: "PE (TTM)", value: "18.5x", trend: "down" }
        ],
        sources: [
           { title: "宁德时代官网", uri: "https://www.catl.com" },
           { title: "巨潮资讯网", uri: "http://www.cninfo.com.cn" }
        ],
        isMock: true
      };
  }

  return {
    title: "陕西建工 (600248.SH) 投资价值分析",
    ticker: "600248.SH",
    rating: "HOLD",
    ratingScore: 62,
    summary: "西北地区建筑龙头，受益于西部大开发及\"一带一路\"战略。营收规模稳健，但受房地产行业下行拖累，应收账款回款周期拉长，现金流承压。当前估值处于历史低位，具备防御属性。",
    reasoning: "分析逻辑 (Demo)：\n1. 基本面：营收虽有增长，但质量一般，现金流差是建筑行业通病。\n2. 宏观面：西部大开发是长期利好，但短期房地产下行压力大。\n3. 估值面：PE 不到 4 倍，股息率接近 5%，安全边际很高。\n4. 结论：短期难有大行情，但下跌空间有限，适合作为高股息防御性配置。",
    swot: {
        strengths: ["省属国企背景，拿单能力强", "全产业链资质完备", "分红比例逐年提升"],
        weaknesses: ["资产负债率较高 (88%+)", "应收账款规模大，坏账风险"],
        opportunities: ["城市更新与城中村改造政策红利", "海外工程业务拓展"],
        threats: ["原材料价格大幅波动", "地方财政紧张导致的回款延期"]
    },
    competitors: [
        { name: "陕西建工", revenue: "¥1890亿", marketCap: "¥145亿", peRatio: "3.8" },
        { name: "中国建筑", revenue: "¥2.2万亿", marketCap: "¥2300亿", peRatio: "4.2" },
        { name: "四川路桥", revenue: "¥1100亿", marketCap: "¥680亿", peRatio: "6.5" }
    ],
    sections: [
      {
        heading: "基本面分析",
        content: "公司在省内市场占有率极高，新签合同额保持 8% 增速。但经营性现金流净额连续两个季度为负，需警惕流动性管理。资产负债率维持在高位，财务费用对利润侵蚀较大。"
      },
      {
        heading: "估值判断",
        content: "当前市盈率 (TTM) 仅为 3.8倍，低于行业平均水平。考虑到国企改革预期及高股息潜力（股息率约 4.8%），下行空间极其有限，属于典型的深度价值股。"
      }
    ],
    chartType: "bar",
    chartData: [
      { name: "23 Q4", value: 450 },
      { name: "24 Q1", value: 380 },
      { name: "24 Q2", value: 490 },
      { name: "24 Q3", value: 510 },
      { name: "24 Q4 (E)", value: 560 }
    ],
    keyMetrics: [
      { label: "新签合同", value: "¥3,200亿", trend: "up" },
      { label: "资产负债率", value: "88.5%", trend: "up" },
      { label: "股息率", value: "4.8%", trend: "up" },
      { label: "PB (市净率)", value: "0.65", trend: "neutral" }
    ],
    sources: [
        { title: "上海证券交易所", uri: "http://www.sse.com.cn" }
    ],
    isMock: true
  };
};

export const generateFinancialAnalysis = async (
  query: string, 
  apiKey?: string,
  aiApiType: AiApiType = AiApiType.GEMINI
): Promise<AgentReport> => {
  
  console.log('=== AI API调用开始 ===');
  console.log('调用参数:', {
    query,
    aiApiType,
    hasApiKey: !!apiKey
  });
  
  // Determine active API Key based on selected AI type
  let activeApiKey = apiKey;
  if (!activeApiKey) {
    console.log('从环境变量获取API Key...');
    switch (aiApiType) {
      case AiApiType.GEMINI:
        activeApiKey = process.env.GEMINI_API_KEY;
        console.log('Gemini API Key状态:', !!activeApiKey);
        break;
      case AiApiType.DEEPSEEK:
        activeApiKey = process.env.DEEPSEEK_API_KEY;
        console.log('DeepSeek API Key状态:', !!activeApiKey);
        break;
      case AiApiType.KIMI:
        activeApiKey = process.env.KIMI_API_KEY;
        console.log('Kimi API Key状态:', !!activeApiKey);
        break;
      case AiApiType.ZHIPU:
        activeApiKey = process.env.ZHIPU_API_KEY;
        console.log('智谱 API Key状态:', !!activeApiKey);
        break;
      case AiApiType.BAIDU:
        activeApiKey = process.env.BAIDU_API_KEY;
        console.log('百度 API Key状态:', !!activeApiKey);
        break;
    }
  }

  // If no key is available at all, use mock data
  if (!activeApiKey) {
    console.warn(`No API key found for ${aiApiType}, utilizing mock data.`);
    return getMockData(query);
  }
  
  console.log('API Key准备就绪，开始调用具体API...');

  try {
    let result: AgentReport;
    
    console.log(`开始处理${aiApiType} API调用...`);
    
    // Call the appropriate AI API based on the selected type
    switch (aiApiType) {
      case AiApiType.GEMINI:
        result = await callGeminiApi(query, activeApiKey);
        break;
      case AiApiType.DEEPSEEK:
      case AiApiType.KIMI:
      case AiApiType.ZHIPU:
      case AiApiType.BAIDU:
        // 为所有国内AI厂商添加百度搜索功能
        // 使用百度文心一言的API Key作为百度搜索API的密钥（如果可用）
        console.log('=== 百度搜索API调用开始 ===');
        const baiduApiKey = process.env.BAIDU_API_KEY || activeApiKey;
        const searchService = createBaiduSearchService(baiduApiKey, ''); // 百度搜索API的secretKey暂时留空
        const searchResults = await searchService.searchFinancialData(query);
        const formattedSearchResults = searchService.formatSearchResults(searchResults);
        console.log('百度搜索API调用成功，获取到', searchResults.length, '条搜索结果');
        console.log('搜索结果摘要:', searchResults.map(r => r.title).join(', '));
        
        // 根据不同的AI厂商调用相应的API，并传入搜索结果
        console.log('=== AI API调用开始 ===');
        console.log('AI类型:', aiApiType, '查询内容:', query);
        if (aiApiType === AiApiType.DEEPSEEK) {
          result = await callDeepSeekApi(query, activeApiKey, formattedSearchResults);
        } else if (aiApiType === AiApiType.KIMI) {
          result = await callKimiApi(query, activeApiKey, formattedSearchResults);
        } else if (aiApiType === AiApiType.ZHIPU) {
          result = await callZhipuApi(query, activeApiKey, formattedSearchResults);
        } else {
          // 百度文心一言：使用搜索结果作为上下文
          result = await callBaiduApi(query, activeApiKey, formattedSearchResults);
        }
        console.log('=== AI API调用结束 ===');
        console.log('AI返回结果摘要:', { title: result.title, ticker: result.ticker, rating: result.rating, isMock: result.isMock });
        break;
      default:
        throw new Error(`Unsupported AI API type: ${aiApiType}`);
    }

    console.log(`${aiApiType} API调用成功，返回结果:`);
    console.log('结果摘要:', {
      title: result.title,
      ticker: result.ticker,
      rating: result.rating,
      isMock: result.isMock
    });
    console.log('=== AI API调用结束 ===');
    return result;

  } catch (error) {
    console.error('=== AI API调用失败 ===');
    console.error("API Error:", error);
    
    let errorMessage = error instanceof Error ? error.message : String(error);
    let detailedErrorMessage = "";
    
    // 尝试从error对象中提取更详细的信息
    if (error && typeof error === 'object' && 'error' in error) {
      const errorObj = (error as any).error;
      if (errorObj && errorObj.message) {
        detailedErrorMessage = errorObj.message;
      }
    }
    
    // 获取模拟数据并添加错误标识
    const mockData = await getMockData(query);
    return {
      ...mockData,
      quotaExceeded: true,
      errorMessage: detailedErrorMessage || `API调用失败: ${errorMessage}`
    };
  }
};
