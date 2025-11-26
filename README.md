# Nexus - AI 金融分析平台

![GitHub](https://img.shields.io/github/license/hhhh124hhhh/Nexus)
![GitHub last commit](https://img.shields.io/github/last-commit/hhhh124hhhh/Nexus)

## 项目简介

Nexus 是一款基于人工智能的金融分析平台，支持多种AI厂商（Google Gemini、DeepSeek、Kimi、智谱AI、百度文心一言），提供实时、全面的公司财务分析与投资决策支持。平台能够自动收集市场数据，生成深度分析报告，包括投资评级、SWOT分析、财务指标对比等关键信息，帮助投资者做出更明智的决策。

### 核心优势

- **多AI厂商支持**：支持Google Gemini、DeepSeek、Kimi、智谱AI、百度文心一言
- **实时数据获取**：通过百度搜索API获取最新金融数据
- **智能投资评级**：AI驱动的BUY/HOLD/SELL投资建议
- **全面分析维度**：核心概览、SWOT分析、同业对比三个维度的详细报告
- **透明化分析过程**：展示AI思维链，让分析过程可追溯
- **财务趋势可视化**：图表展示关键财务数据趋势

### 应用界面预览

![Nexus 应用界面](nexus_app_preview.png)

> 上图展示了 Nexus 智能投研应用的实时分析界面，包含完整的用户界面和功能展示

## 主要功能

- **实时金融数据分析**：通过 Gemini API 获取最新市场数据
- **智能投资评级**：AI 驱动的 BUY/HOLD/SELL 投资建议
- **SWOT 分析**：全面评估公司优势、劣势、机会与威胁
- **同业对比**：与行业竞争对手关键财务指标对比
- **财务趋势可视化**：图表展示关键财务数据趋势
- **AI 思维链展示**：透明化 AI 分析过程与推理逻辑
- **多维度报告展示**：核心概览、SWOT分析、同业对比三个维度的详细报告

## 技术栈

- **前端框架**：React 19
- **图表库**：Recharts
- **图标库**：Lucide React
- **AI 服务**：
  - Google Gemini API
  - DeepSeek API
  - Kimi API
  - 智谱 AI API
  - 百度文心一言 API
- **搜索服务**：百度搜索 API
- **样式方案**：Tailwind CSS 
- **构建工具**：Vite 
- **开发语言**：TypeScript

## 项目结构

```
Nexus/
├── components/          # React 组件
│   ├── ProcessVisualizer.tsx  # 处理过程可视化组件
│   └── ReportDisplay.tsx      # 报告展示组件
├── services/            # 服务层
│   ├── aiService.ts          # 统一 AI 服务接口
│   └── baiduSearchService.ts  # 百度搜索服务
├── types.ts             # TypeScript 类型定义
├── public/              # 静态资源
├── .env.example         # 环境变量配置示例
├── package.json         # 项目依赖
└── README.md            # 项目文档
```

## 核心组件

### ProcessVisualizer

负责展示 AI 分析过程的可视化组件，提供实时的分析状态更新和步骤展示，支持取消操作和重新开始分析。

### ReportDisplay

核心报告展示组件，包含三个主要标签页：
- **核心概览**：展示投资评级、关键财务指标和趋势图表
- **SWOT分析**：可视化展示公司的优势、劣势、机会与威胁
- **同业对比**：与竞争对手的财务数据对比表格

同时支持 AI 思维链展示，让用户了解分析过程。

## 核心服务

### aiService

统一的 AI 服务接口，封装了与多种 AI 厂商 API 的交互逻辑，提供金融分析报告生成功能，包括：
- 多 AI 厂商支持（Google Gemini、DeepSeek、Kimi、智谱AI、百度文心一言）
- 实时数据获取（通过百度搜索 API）
- 结构化报告生成
- 数据来源追踪
- 错误处理与降级方案（模拟数据）

### baiduSearchService

封装了与百度搜索 API 的交互逻辑，为国内 AI 厂商提供最新金融数据搜索能力，包括：
- 公司最新财报搜索
- 股价走势查询
- 行业新闻动态获取
- 竞争对手数据收集

## 开发与部署

### 本地开发

**前置条件**：Node.js 16+，npm 或 yarn

1. 克隆仓库：
   ```
   git clone https://github.com/hhhh124hhhh/Nexus.git
   cd Nexus
   ```

2. 安装依赖：
   ```
   npm install
   ```

3. 配置环境变量：
   - 复制 `.env.example` 文件为 `.env.local`：
   - `cp .env.example .env.local` (Linux/macOS)
   - `copy .env.example .env.local` (Windows)
   - 在 `.env.local` 文件中设置相应的 API 密钥：
     ```
     # Google Gemini API 密钥
     GEMINI_API_KEY=your_gemini_api_key_here
     
     # DeepSeek API 密钥
     DEEPSEEK_API_KEY=your_deepseek_api_key_here
     
     # Kimi API 密钥
     KIMI_API_KEY=your_kimi_api_key_here
     
     # 智谱 AI API 密钥
     ZHIPU_API_KEY=your_zhipu_api_key_here
     
     # 百度文心一言 API 密钥
     BAIDU_API_KEY=your_baidu_api_key_here
     ```

4. 启动开发服务器：
   ```
   npm run dev
   ```

### 构建与部署

```
# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 使用说明

1. 在应用首页选择您想要使用的 AI 厂商（Google Gemini、DeepSeek、Kimi、智谱AI、百度文心一言）
2. 输入您想分析的公司名称或股票代码
3. 点击分析按钮，等待 AI 生成报告
4. 在报告页面可以查看核心概览、SWOT分析和同业对比
5. 点击"AI 深度思维链"可以查看 AI 的分析过程
6. 使用顶部的"开始新的分析"按钮可以进行新的查询

## 注意事项

- 本项目需要有效的 API 密钥才能获取实时数据
- 在没有 API 密钥的情况下，系统会使用模拟数据进行演示
- 不同 AI 厂商的 API 密钥需要单独配置
- 百度搜索 API 会自动为国内 AI 厂商提供最新金融数据
- 投资分析仅供参考，不构成投资建议

## 许可证

MIT

## 仓库信息

[GitHub Repository](https://github.com/hhhh124hhhh/Nexus)
