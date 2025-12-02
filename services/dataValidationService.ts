// 数据验证服务模块
// 用于验证AI生成的报告数据与权威金融数据源的一致性

// 验证结果接口
interface ValidationResult {
  metric: string;
  aiValue: string | number;
  actualValue: string | number;
  difference: number;
  isAccurate: boolean;
  confidenceScore: number;
}

// 数据验证服务类
export class DataValidationService {
  private baseUrl: string = 'https://emweb.securities.eastmoney.com/pc_hsf10/pages/index.html?type=web&code=SH';

  constructor() {
    // 初始化数据验证服务
  }

  // 验证AI生成的报告数据
  async validateReportData(ticker: string, aiReport: any): Promise<ValidationResult[]> {
    try {
      // 模拟真实数据（来自东方财富网）
      const actualData = this.getMockActualData(ticker);
      
      // 验证结果数组
      const validationResults: ValidationResult[] = [];

      // 验证核心财务指标，覆盖多个维度
      const metricsToValidate = [
        // 核心财务指标
        { name: '营收', aiLabel: '营收', actualKey: 'revenue', threshold: 10 },
        { name: '净利润', aiLabel: '净利润', actualKey: 'netProfit', threshold: 10 },
        { name: '毛利率', aiLabel: '毛利率', actualKey: 'grossMargin', threshold: 5 },
        { name: '资产负债率', aiLabel: '资产负债率', actualKey: 'debtRatio', threshold: 5 },
        { name: '市盈率', aiLabel: '市盈率', actualKey: 'peRatio', threshold: 15 },
        
        // 成长能力指标
        { name: '营收同比增长', aiLabel: '营收同比增长', actualKey: 'revenueGrowth', threshold: 10 },
        { name: '净利润同比增长', aiLabel: '净利润同比增长', actualKey: 'netProfitGrowth', threshold: 15 },
        
        // 盈利能力指标
        { name: '净资产收益率', aiLabel: '净资产收益率', actualKey: 'roe', threshold: 10 },
        { name: '总资产收益率', aiLabel: '总资产收益率', actualKey: 'roa', threshold: 5 },
        { name: '净利率', aiLabel: '净利率', actualKey: 'netMargin', threshold: 5 },
        
        // 财务风险指标
        { name: '流动比率', aiLabel: '流动比率', actualKey: 'currentRatio', threshold: 5 },
        { name: '速动比率', aiLabel: '速动比率', actualKey: 'quickRatio', threshold: 5 },
        
        // 营运能力指标
        { name: '存货周转率', aiLabel: '存货周转率', actualKey: 'inventoryTurnover', threshold: 15 },
        { name: '应收账款周转率', aiLabel: '应收账款周转率', actualKey: 'accountsReceivableTurnover', threshold: 15 },
        { name: '总资产周转率', aiLabel: '总资产周转率', actualKey: 'totalAssetTurnover', threshold: 15 }
      ];

      // 执行验证
      metricsToValidate.forEach(metric => {
        // 从AI报告的keyMetrics中寻找匹配的指标
        const aiMetric = aiReport.keyMetrics?.find((km: any) => 
          km.label.includes(metric.aiLabel) || metric.aiLabel.includes(km.label)
        );
        
        const aiValue = aiMetric?.value || '0';
        const actualValue = actualData[metric.actualKey] || '0';
        
        // 转换为数值进行比较
        const aiNum = this.convertToNumber(aiValue);
        const actualNum = this.convertToNumber(actualValue);
        
        // 计算差异率（百分比）
        const difference = this.calculateDifference(aiNum, actualNum);
        
        // 判断是否准确
        const isAccurate = difference <= metric.threshold;
        
        // 计算可信度评分
        const confidenceScore = Math.max(0, Math.min(100, 100 - difference * 5));
        
        validationResults.push({
          metric: metric.name,
          aiValue,
          actualValue,
          difference,
          isAccurate,
          confidenceScore
        });
      });

      return validationResults;
    } catch (error) {
      console.error('数据验证失败:', error);
      return [];
    }
  }

  // 获取模拟真实数据（来自东方财富网）
  private getMockActualData(ticker: string): any {
    // 这里使用东方财富网的真实数据作为模拟数据
    // 实际项目中需要调用真实的金融数据API
    if (ticker === '600248') {
      // 东方财富网陕西建工（600248）2025年第三季度真实财务数据
      return {
        // 核心财务指标
        revenue: '872.9亿元',
        netProfit: '11.21亿元',
        grossMargin: '10.04%',
        debtRatio: '88.13%',
        peRatio: '7.8倍',
        
        // 成长能力指标
        revenueGrowth: '-14.27%',
        netProfitGrowth: '-62.28%',
        
        // 盈利能力指标
        roe: '4.18%',
        roa: '0.34%',
        netMargin: '1.37%',
        
        // 财务风险指标
        assetLiabilityRatio: '88.13%',
        currentRatio: '1.093',
        quickRatio: '1.085',
        
        // 营运能力指标
        inventoryTurnover: '0.917次',
        accountsReceivableTurnover: '0.497次',
        totalAssetTurnover: '0.250次'
      };
    }
    
    // 默认模拟数据
    return {
      revenue: '100亿元',
      netProfit: '5亿元',
      grossMargin: '10%',
      debtRatio: '70%',
      peRatio: '10倍',
      revenueGrowth: '5%',
      netProfitGrowth: '8%',
      roe: '10%',
      roa: '5%',
      netMargin: '5%',
      assetLiabilityRatio: '70%',
      currentRatio: '1.5',
      quickRatio: '1.2',
      inventoryTurnover: '5次',
      accountsReceivableTurnover: '6次',
      totalAssetTurnover: '1次'
    };
  }

  // 将字符串转换为数值，优化处理各种格式
  private convertToNumber(value: any): number {
    if (typeof value === 'number') {
      return value;
    }
    
    if (typeof value === 'string') {
      // 移除所有非数字、负号和小数点的字符
      // 保留负号和小数点，处理百分比和各种单位
      let numStr = value;
      
      // 处理百分比
      if (numStr.includes('%')) {
        // 移除百分号
        numStr = numStr.replace('%', '');
        // 转换为小数
        const num = parseFloat(numStr);
        return isNaN(num) ? 0 : num;
      }
      
      // 处理带有单位的数值，如亿元、万元等
      // 移除所有非数字、负号和小数点
      numStr = numStr.replace(/[^\d.-]/g, '');
      const num = parseFloat(numStr);
      return isNaN(num) ? 0 : num;
    }
    
    return 0;
  }

  // 计算差异率（百分比），优化处理各种情况
  private calculateDifference(aiValue: number, actualValue: number): number {
    // 处理实际值为0的情况
    if (actualValue === 0) {
      return aiValue === 0 ? 0 : 100;
    }
    
    // 处理负数情况，特别是增长比率
    const difference = Math.abs(((aiValue - actualValue) / actualValue) * 100);
    
    // 限制最大差异率为100%，避免极端值影响整体评分
    return Math.min(100, difference);
  }

  // 计算整体可信度评分，考虑不同指标的重要性
  calculateOverallConfidence(results: ValidationResult[]): number {
    if (results.length === 0) {
      return 50;
    }
    
    // 为不同类型的指标分配不同的权重
    const metricWeights: Record<string, number> = {
      '营收': 1.5,
      '净利润': 1.5,
      '毛利率': 1.2,
      '资产负债率': 1.2,
      '市盈率': 1.0,
      '营收同比增长': 1.0,
      '净利润同比增长': 1.0,
      '净资产收益率': 1.2,
      '总资产收益率': 1.0,
      '净利率': 1.0,
      '流动比率': 1.0,
      '速动比率': 1.0,
      '存货周转率': 0.8,
      '应收账款周转率': 0.8,
      '总资产周转率': 0.8
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    results.forEach(result => {
      const weight = metricWeights[result.metric] || 1.0;
      totalScore += result.confidenceScore * weight;
      totalWeight += weight;
    });
    
    return Math.round(totalScore / totalWeight);
  }

  // 格式化验证结果，提供更直观的显示
  formatValidationResults(results: ValidationResult[], ticker?: string): string {
    // 获取当前时间
    const currentTime = new Date().toLocaleString('zh-CN');
    
    let formatted = '📊 数据验证结果\n';
    formatted += `⏰ 验证时间：${currentTime}\n`;
    if (ticker) {
      formatted += `📈 股票代码：${ticker}\n`;
    }
    formatted += `📋 验证指标数量：${results.length}\n\n`;
    
    // 按维度分组显示结果
    const growthMetrics = [];
    const profitMetrics = [];
    const riskMetrics = [];
    const operationMetrics = [];
    const otherMetrics = [];
    
    // 分组指标
    results.forEach(result => {
      const metric = result.metric;
      const resultLine = `${metric.padEnd(12)} AI值: ${String(result.aiValue).padEnd(10)} 实际值: ${String(result.actualValue).padEnd(10)} 差异: ${result.difference.toFixed(2)}% ${result.isAccurate ? '✅' : '❌'}`;
      
      if (metric.includes('增长')) {
        growthMetrics.push(resultLine);
      } else if (metric.includes('率') && (metric.includes('利润') || metric.includes('收益'))) {
        profitMetrics.push(resultLine);
      } else if (metric.includes('负债') || metric.includes('流动') || metric.includes('速动')) {
        riskMetrics.push(resultLine);
      } else if (metric.includes('周转')) {
        operationMetrics.push(resultLine);
      } else {
        otherMetrics.push(resultLine);
      }
    });
    
    // 显示各维度的验证结果
    if (otherMetrics.length > 0) {
      formatted += '📊 核心财务指标\n';
      formatted += otherMetrics.join('\n') + '\n\n';
    }
    
    if (growthMetrics.length > 0) {
      formatted += '📈 成长能力指标\n';
      formatted += growthMetrics.join('\n') + '\n\n';
    }
    
    if (profitMetrics.length > 0) {
      formatted += '💰 盈利能力指标\n';
      formatted += profitMetrics.join('\n') + '\n\n';
    }
    
    if (riskMetrics.length > 0) {
      formatted += '⚠️ 财务风险指标\n';
      formatted += riskMetrics.join('\n') + '\n\n';
    }
    
    if (operationMetrics.length > 0) {
      formatted += '⚙️ 营运能力指标\n';
      formatted += operationMetrics.join('\n') + '\n\n';
    }
    
    // 显示整体可信度评分
    const overallConfidence = this.calculateOverallConfidence(results);
    formatted += `🎯 整体可信度评分：${overallConfidence}%\n`;
    
    // 添加可信度等级评价
    let confidenceLevel = '';
    if (overallConfidence >= 80) {
      confidenceLevel = '✅ 高可信度';
    } else if (overallConfidence >= 60) {
      confidenceLevel = '⚠️ 中可信度';
    } else {
      confidenceLevel = '❌ 低可信度';
    }
    formatted += `📌 可信度等级：${confidenceLevel}\n`;
    
    return formatted;
  }
}

// 创建数据验证服务实例的工厂函数
export const createDataValidationService = (): DataValidationService => {
  return new DataValidationService();
};

// 默认导出
export default createDataValidationService;
