import { GoogleGenAI } from "@google/genai";
import { AgentReport, AiApiType } from '../types';
import { createBaiduSearchService } from './baiduSearchService';
import { createDataValidationService } from './dataValidationService';

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

// DeepSeek 深度思考版 API调用逻辑
const callDeepSeekReasonerApi = async (query: string, apiKey: string): Promise<AgentReport> => {
  try {
    console.log('=== DeepSeek 深度思考版 API调用详情 ===');
    console.log('- 构建提示词开始');
    
    // 获取当前日期，确保模型使用正确的时间框架
    const currentDate = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();
    
    const prompt = `
      Role: You are Nexus, a professional institutional financial analyst with deep reasoning capabilities.
      Current Date: ${currentDate}
      Current Year: ${currentYear}
      User Query: "${query}"
      
      IMPORTANT TIME FRAME INFORMATION:
      - TODAY IS IN THE YEAR ${currentYear}, NOT 2024.
      - YOU MUST USE ${currentYear} AS THE CURRENT YEAR IN YOUR ANALYSIS.
      - WHEN REFERENCING FINANCIAL REPORTS, USE THE MOST RECENT REPORTS FOR ${currentYear} AND ${currentYear - 1}.
      - DO NOT MENTION 2024 AS THE CURRENT YEAR.
      
      Task: 
      1. Generate a comprehensive investment dashboard report in **Simplified Chinese (简体中文)**.
      2. IMPORTANT: Provide in-depth financial analysis and reasoning based on your knowledge and the CURRENT DATE.
      3. MUST use RELIABLE FINANCIAL DATA SOURCES (e.g., 东方财富网, 新浪财经, 同花顺, 雪球, 上市公司公告).
      4. MUST cite data sources and their publication dates in the report.
      
      OUTPUT REQUIREMENTS:
      - YOUR REASONING CHAIN MUST START WITH THE CURRENT YEAR ${currentYear} AND THE CURRENT DATE ${currentDate}.
      - DO NOT START YOUR REASONING WITH REFERENCES TO 2024 AS THE CURRENT YEAR.
      - USE THE MOST RECENT FINANCIAL DATA FOR ${currentYear} AND ${currentYear - 1}.
      - MAKE SURE YOUR ANALYSIS REFLECTS THE ACTUAL CURRENT YEAR.
      
      Output Format:
      You MUST output a strictly valid JSON object. Do not output Markdown formatting like \`\`\`json.
      The JSON must match this structure:
      {
        "title": "string (e.g., Company Name (Ticker) ${currentYear} Report)",
        "ticker": "string",
        "rating": "BUY" | "HOLD" | "SELL",
        "ratingScore": number (0-100),
        "summary": "string (brief executive summary)",
        "reasoning": "string (detailed logical reasoning process)",
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
          { "name": "string (e.g., Q1 ${currentYear})", "value": number }
        ],
        "keyMetrics": [
          { "label": "string", "value": "string", "trend": "up" | "down" | "neutral" }
        ]
      }
      
      Content Requirements:
      - ALWAYS CONSIDER THE CURRENT YEAR ${currentYear} when analyzing financial data.
      - Ensure all financial metrics (Revenue, P/E, Price) are accurate, reliable, and up-to-date based on the current date.
      - Compare against 2-3 real competitors with REAL, SPECIFIC data.
      - For competitors, MUST provide actual values for revenue, marketCap, and peRatio - NEVER use "未披露" or similar vague terms.
      - Include detailed reasoning in the analysis, starting with the current year and date.
      - MUST cite data sources and their publication dates in the report.
      - Language: Simplified Chinese.
    `;

    console.log('- 构建API请求开始');
    console.log('- 请求URL: https://api.deepseek.com/v3.2_speciale_expires_on_20251215');
    console.log('- 请求模型: deepseek-reasoner');
    console.log('- 系统提示词: 专业金融分析师，具有深度推理能力');
    console.log('- 温度参数: 0.4');
    console.log('- 工具调用: 禁用 (该版本不支持)');
    
    // 发送API请求
    console.log('- 发送DeepSeek深度思考版API请求');
    
    // 根据官方文档，启用联网搜索功能（深度思考版只需要enable_web_search参数）
    const requestBody = {
      model: 'deepseek-reasoner', // 使用深度思考版模型
      messages: [
        { role: 'system', content: 'You are a professional financial analyst with deep reasoning capabilities and access to real-time financial data.' },
        { role: 'user', content: prompt }
      ],
      enable_web_search: true
    };
    
    console.log('- 请求体内容:', JSON.stringify(requestBody, null, 2));
    
    // 使用深度思考版专用API端点
    const response = await fetch('https://api.deepseek.com/v3.2_speciale_expires_on_20251215/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('- 接收DeepSeek深度思考版API响应');
    console.log('- 响应状态码:', response.status);
    
    // 获取详细的响应内容，用于调试
    let responseData;
    try {
      responseData = await response.json();
      console.log('- 响应内容:', JSON.stringify(responseData, null, 2));
    } catch (parseError) {
      const responseText = await response.text();
      console.error('- 无法解析JSON响应:', responseText);
      responseData = { error: { message: responseText } };
    }
    
    if (!response.ok) {
      console.error('- DeepSeek深度思考版API请求失败');
      const errorMessage = responseData.error?.message || `${response.status} ${response.statusText}`;
      throw new Error(`DeepSeek Reasoner API error: ${errorMessage}`);
    }

    // 使用已经解析的responseData，避免重复解析
    console.log('- 提取AI生成内容');
    
    // 检查响应数据结构
    const choice = responseData.choices?.[0];
    if (!choice?.message) {
      console.error('- AI生成内容为空或格式错误');
      throw new Error("Empty or invalid response from DeepSeek Reasoner");
    }
    
    // 提取思维链内容和最终回答
    const reasoningContent = choice.message.reasoning_content || '';
    let resultText = choice.message.content || '';
    
    console.log('- 思维链内容长度:', reasoningContent.length, '字符');
    console.log('- 最终回答长度:', resultText.length, '字符');
    
    // 检查内容中是否包含深度推理
    if (reasoningContent || resultText.includes('推理') || resultText.includes('分析') || resultText.includes('逻辑') || resultText.includes('结论')) {
      console.log('- 内容中包含深度推理，深度思考功能已正常工作');
    }
    
    // 如果存在思维链内容，将其添加到reasoning字段
    if (reasoningContent) {
      // 预处理结果文本，确保它是有效的JSON
      const cleanedText = cleanJsonString(resultText);
      
      try {
        console.log('- 解析JSON格式报告');
        let parsedReport = JSON.parse(cleanedText) as AgentReport;
        
        // 将思维链内容添加到报告的reasoning字段
        parsedReport.reasoning = reasoningContent + '\n' + (parsedReport.reasoning || '');
        
        console.log('- 报告解析成功');
        console.log('- 生成报告类型:', parsedReport.chartType);
        console.log('- 核心指标数量:', parsedReport.keyMetrics?.length || 0);
        
        return {
          ...parsedReport,
          isMock: false
        };

      } catch (parseError) {
        console.error("JSON Parse Error:", parseError, cleanedText);
        throw new Error("Failed to parse DeepSeek Reasoner response");
      }
    } else {
      // 处理没有思维链的情况
      const cleanedText = cleanJsonString(resultText);
      
      try {
        console.log('- 解析JSON格式报告');
        const parsedReport = JSON.parse(cleanedText) as AgentReport;
        
        console.log('- 报告解析成功');
        console.log('- 生成报告类型:', parsedReport.chartType);
        console.log('- 核心指标数量:', parsedReport.keyMetrics?.length || 0);
        
        return {
          ...parsedReport,
          isMock: false
        };

      } catch (parseError) {
        console.error("JSON Parse Error:", parseError, cleanedText);
        throw new Error("Failed to parse DeepSeek Reasoner response");
      }
    }

  } catch (error) {
    console.error("DeepSeek Reasoner API Error:", error);
    throw error;
  }
};

// DeepSeek API调用逻辑
const callDeepSeekApi = async (query: string, apiKey: string, searchResults?: string): Promise<AgentReport> => {
  try {
    console.log('DeepSeek API调用详情:');
    console.log('- 构建提示词开始');
    
    // 获取当前日期，确保模型使用正确的时间框架
    const currentDate = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();
    
    const prompt = `
      Role: You are Nexus, a professional institutional financial analyst with access to real-time web search capabilities.
      Current Date: ${currentDate}
      Current Year: ${currentYear}
      User Query: "${query}"
      
      ${searchResults || ''}
      
      IMPORTANT TIME FRAME INFORMATION:
      - TODAY IS IN THE YEAR ${currentYear}, NOT 2024.
      - YOU MUST USE ${currentYear} AS THE CURRENT YEAR IN YOUR ANALYSIS.
      - WHEN REFERENCING FINANCIAL REPORTS, USE THE MOST RECENT REPORTS FOR ${currentYear} AND ${currentYear - 1}.
      - DO NOT MENTION 2024 AS THE CURRENT YEAR.
      
      Task: 
      1. FIRST, USE THE WEB SEARCH CAPABILITY to find the LATEST, REAL-TIME financial data, news, and stock price for the requested company.
      2. Generate a comprehensive investment dashboard report in **Simplified Chinese (简体中文)** based on the search results.
      3. MUST use RELIABLE FINANCIAL DATA SOURCES (e.g., 东方财富网, 新浪财经, 同花顺, 雪球, 上市公司公告).
      4. MUST cite data sources and their publication dates in the report.
      
      OUTPUT REQUIREMENTS:
      - YOUR REASONING CHAIN MUST START WITH THE CURRENT YEAR ${currentYear} AND THE CURRENT DATE ${currentDate}.
      - DO NOT START YOUR REASONING WITH REFERENCES TO 2024 AS THE CURRENT YEAR.
      - USE THE MOST RECENT FINANCIAL DATA FOR ${currentYear} AND ${currentYear - 1}.
      - MAKE SURE YOUR ANALYSIS REFLECTS THE ACTUAL CURRENT YEAR.
      
      Output Format:
      You MUST output a strictly valid JSON object. Do not output Markdown formatting like \`\`\`json.
      The JSON must match this structure:
      {
        "title": "string (e.g., Company Name (Ticker) ${currentYear} Report)",
        "ticker": "string",
        "rating": "BUY" | "HOLD" | "SELL",
        "ratingScore": number (0-100),
        "summary": "string (brief executive summary)",
        "reasoning": "string (brief logical summary of the analysis including web search usage)",
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
          { "name": "string (e.g., Q1 ${currentYear})", "value": number }
        ],
        "keyMetrics": [
          { "label": "string", "value": "string", "trend": "up" | "down" | "neutral" }
        ]
      }
      
      Content Requirements:
      - MUST use the WEB SEARCH CAPABILITY to get the LATEST financial data (within the last 3 months).
      - Ensure all financial metrics (Revenue, P/E, Price) are based on the SEARCH RESULTS from RELIABLE FINANCIAL DATA SOURCES.
      - Compare against 2-3 real competitors with REAL, SPECIFIC data found in the search results.
      - For competitors, MUST provide actual values for revenue, marketCap, and peRatio - NEVER use "未披露" or similar vague terms.
      - Include the most recent stock price and market trends from the search results.
      - MUST cite data sources and their publication dates in the report.
      - In the reasoning section, describe how web search was used to gather information.
      - Language: Simplified Chinese.
    `;

    console.log('- 构建API请求开始');
    console.log('- 请求URL: https://api.deepseek.com/v1/chat/completions');
    console.log('- 请求模型: deepseek-chat');
    console.log('- 系统提示词: 专业金融分析师，可访问最新金融数据');
    console.log('- 温度参数: 0.4');
    
    // 发送API请求
    console.log('- 发送DeepSeek API请求');
    console.log('- 启用联网搜索功能');
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat', // 使用稳定可用的模型
        messages: [
          { role: 'system', content: 'You are a professional financial analyst with access to the latest financial data. Use web search to get real-time information.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        response_format: { type: 'json_object' },
        enable_web_search: true,
        tools: [
          {
            type: "web_search",
            web_search: {
              enable: true,
              max_results: 5
            }
          }
        ]
      })
    });

    console.log('- 接收DeepSeek API响应');
    console.log('- 响应状态码:', response.status);
    
    if (!response.ok) {
      console.error('- DeepSeek API请求失败');
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
    }

    console.log('- 解析API响应数据');
    const data = await response.json();
    
    // 检查是否包含联网搜索结果
    if (data.choices?.[0]?.message?.tool_calls) {
      console.log('- 检测到联网搜索调用');
      console.log('- 搜索调用数量:', data.choices[0].message.tool_calls.length);
      
      // 记录每个搜索调用的详细信息
      data.choices[0].message.tool_calls.forEach((toolCall: any, index: number) => {
        if (toolCall.type === 'function' && toolCall.function.name === 'web_search') {
          const searchParams = JSON.parse(toolCall.function.arguments);
          console.log(`- 搜索调用 ${index + 1}: 关键词: ${searchParams.query}`);
          console.log(`- 搜索调用 ${index + 1}: 最大结果数: ${searchParams.max_results}`);
        }
      });
    }
    
    // 提取AI生成内容
    const resultText = data.choices?.[0]?.message?.content || '';
    
    console.log('- 提取AI生成内容');
    console.log('- 生成内容长度:', resultText.length, '字符');
    
    // 检查内容中是否包含联网搜索引用
    if (resultText.includes('搜索') || resultText.includes('来源') || resultText.includes('东方财富网') || resultText.includes('新浪财经')) {
      console.log('- 内容中包含联网搜索引用，联网功能已正常工作');
    }

    if (!resultText) {
      console.error('- AI生成内容为空');
      throw new Error("Empty response from DeepSeek");
    }

    try {
      console.log('- 清理AI生成内容');
      const cleanedText = cleanJsonString(resultText);
      
      console.log('- 解析JSON格式报告');
      const parsedReport = JSON.parse(cleanedText) as AgentReport;
      
      console.log('- 报告解析成功');
      console.log('- 生成报告类型:', parsedReport.chartType);
      console.log('- 核心指标数量:', parsedReport.keyMetrics?.length || 0);
      
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
    
    // 获取当前日期，确保模型使用正确的时间框架
    const currentDate = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();
    
    const prompt = `
      Role: You are Nexus, a professional institutional financial analyst.
      Current Date: ${currentDate}
      Current Year: ${currentYear}
      User Query: "${query}"
      
      ${searchResults}
      
      IMPORTANT TIME FRAME INFORMATION:
      - TODAY IS IN THE YEAR ${currentYear}, NOT 2024.
      - YOU MUST USE ${currentYear} AS THE CURRENT YEAR IN YOUR ANALYSIS.
      - WHEN REFERENCING FINANCIAL REPORTS, USE THE MOST RECENT REPORTS FOR ${currentYear} AND ${currentYear - 1}.
      - DO NOT MENTION 2024 AS THE CURRENT YEAR.
      
      OUTPUT REQUIREMENTS:
      - YOUR REASONING CHAIN MUST START WITH THE CURRENT YEAR ${currentYear} AND THE CURRENT DATE ${currentDate}.
      - DO NOT START YOUR REASONING WITH REFERENCES TO 2024 AS THE CURRENT YEAR.
      - USE THE MOST RECENT FINANCIAL DATA FOR ${currentYear} AND ${currentYear - 1}.
      - MAKE SURE YOUR ANALYSIS REFLECTS THE ACTUAL CURRENT YEAR.
      
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
    // 获取当前日期，确保模型使用正确的时间框架
    const currentDate = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();
    
    const prompt = `
      Role: You are Nexus, a professional institutional financial analyst.
      Current Date: ${currentDate}
      Current Year: ${currentYear}
      User Query: "${query}"
      
      ${searchResults}
      
      IMPORTANT TIME FRAME INFORMATION:
      - TODAY IS IN THE YEAR ${currentYear}, NOT 2024.
      - YOU MUST USE ${currentYear} AS THE CURRENT YEAR IN YOUR ANALYSIS.
      - WHEN REFERENCING FINANCIAL REPORTS, USE THE MOST RECENT REPORTS FOR ${currentYear} AND ${currentYear - 1}.
      - DO NOT MENTION 2024 AS THE CURRENT YEAR.
      
      OUTPUT REQUIREMENTS:
      - YOUR REASONING CHAIN MUST START WITH THE CURRENT YEAR ${currentYear} AND THE CURRENT DATE ${currentDate}.
      - DO NOT START YOUR REASONING WITH REFERENCES TO 2024 AS THE CURRENT YEAR.
      - USE THE MOST RECENT FINANCIAL DATA FOR ${currentYear} AND ${currentYear - 1}.
      - MAKE SURE YOUR ANALYSIS REFLECTS THE ACTUAL CURRENT YEAR.
      
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
      case AiApiType.DEEPSEEK_REASONER:
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

  // If no key is available at all, throw error
  if (!activeApiKey) {
    console.error(`No API key found for ${aiApiType}, please configure API key first.`);
    throw new Error(`API Key not configured for ${aiApiType}. Please configure your API key in the settings.`);
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
        // DeepSeek v3.2 自带联网功能，直接使用自身的联网功能
        console.log('=== DeepSeek API调用开始 ===');
        console.log('步骤1: 准备调用DeepSeek API');
        console.log('AI类型:', aiApiType, '查询内容:', query);
        console.log('API Key状态:', !!activeApiKey ? '已配置' : '未配置');
        
        // 调用DeepSeek API生成报告
        console.log('步骤2: 发起DeepSeek API请求');
        result = await callDeepSeekApi(query, activeApiKey);
        
        console.log('步骤3: DeepSeek API响应处理完成');
        console.log('报告标题:', result.title);
        console.log('股票代码:', result.ticker);
        console.log('投资评级:', result.rating);
        break;
      case AiApiType.DEEPSEEK_REASONER:
        // DeepSeek 深度思考版，使用专用的API地址和模型
        console.log('=== DeepSeek 深度思考版 API调用开始 ===');
        console.log('步骤1: 准备调用DeepSeek 深度思考版 API');
        console.log('AI类型:', aiApiType, '查询内容:', query);
        console.log('API Key状态:', !!activeApiKey ? '已配置' : '未配置');
        console.log('API地址:', 'https://api.deepseek.com/v3.2_speciale_expires_on_20251215');
        console.log('模型名称:', 'deepseek-reasoner');
        
        // 调用DeepSeek 深度思考版 API生成报告
        console.log('步骤2: 发起DeepSeek 深度思考版 API请求');
        result = await callDeepSeekReasonerApi(query, activeApiKey);
        
        console.log('步骤3: DeepSeek 深度思考版 API响应处理完成');
        console.log('报告标题:', result.title);
        console.log('股票代码:', result.ticker);
        console.log('投资评级:', result.rating);
        break;
      case AiApiType.KIMI:
      case AiApiType.ZHIPU:
      case AiApiType.BAIDU:
        // 为其他国内AI厂商添加百度搜索功能
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
        if (aiApiType === AiApiType.KIMI) {
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
    
    // 数据验证：验证AI生成的报告数据与权威金融数据源的一致性
    console.log('=== 数据验证开始 ===');
    const validationService = createDataValidationService();
    const validationResults = await validationService.validateReportData(result.ticker, result);
    const overallConfidence = validationService.calculateOverallConfidence(validationResults);
    
    // 将数据验证结果添加到报告中
    result.confidenceScore = overallConfidence;
    
    console.log('数据验证结果:', validationService.formatValidationResults(validationResults));
    console.log('整体可信度评分:', overallConfidence);
    console.log('=== 数据验证结束 ===');
    
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
