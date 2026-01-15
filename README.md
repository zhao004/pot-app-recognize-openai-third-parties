# Pot App OpenAI 第三方 OCR 识别插件

一个用于 [Pot App](https://pot-app.com/) 的 OCR 文字识别插件，支持 OpenAI 及其他兼容 OpenAI API 的第三方服务。

## 功能特性

- 支持 OpenAI 官方 API（GPT-4o 等视觉模型）
- 支持任何 OpenAI 兼容的第三方 API
- 自定义 Prompt 支持
- 支持 30+ 种语言识别
- 自动 URL 规范化处理

## 安装

1. 前往 [Releases](https://github.com/zhao004/pot-app-recognize-openai-third-parties/releases) 下载最新版本的 `.potext`
   文件
2. 打开 Pot App，进入 `设置` -> `服务设置` -> `文字识别` -> `添加外部插件`
3. 选择下载的 `.potext` 文件进行安装

## 配置说明

| 配置项        | 说明       | 必填 | 默认值                                          |
|------------|----------|----|----------------------------------------------|
| 模型         | 使用的模型名称  | 否  | `gpt-4o`                                     |
| 请求地址       | API 请求地址 | 否  | `https://api.openai.com/v1/chat/completions` |
| API Key    | API 密钥   | 是  | -                                            |
| 自定义 Prompt | 自定义系统提示词 | 否  | 内置默认 Prompt                                  |

### 请求地址说明

插件会智能处理请求地址，以下格式均可正常工作：

```
api.openai.com                              -> https://api.openai.com/v1/chat/completions
https://api.openai.com                      -> https://api.openai.com/v1/chat/completions
https://api.openai.com/v1/chat/completions  -> https://api.openai.com/v1/chat/completions
https://api.siliconflow.cn/v1               -> https://api.siliconflow.cn/v1/chat/completions
your-proxy.com/v1                           -> https://your-proxy.com/v1/chat/completions
```

### 自定义 Prompt

在自定义 Prompt 中可以使用 `$lang` 变量，会自动替换为当前选择的目标语言。

示例：

```
请识别图片中的文字，并翻译成 $lang。
```

## 支持的服务商

本插件支持任何兼容 OpenAI API 格式的服务，包括但不限于：

- [OpenAI](https://openai.com/)
- [SiliconFlow](https://siliconflow.cn/)
- [Azure OpenAI](https://azure.microsoft.com/en-us/products/ai-services/openai-service)
- [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/)
- [OpenRouter](https://openrouter.ai/)
- 各类代理服务

## 支持的语言

支持以下 30+ 种语言的识别：

| 语言代码  | 语言名称     | 语言代码  | 语言名称     |
|-------|----------|-------|----------|
| auto  | 自动检测     | zh_cn | 简体中文     |
| zh_tw | 繁体中文     | yue   | 粤语       |
| en    | 英语       | ja    | 日语       |
| ko    | 韩语       | fr    | 法语       |
| de    | 德语       | es    | 西班牙语     |
| ru    | 俄语       | it    | 意大利语     |
| pt_pt | 葡萄牙语     | pt_br | 巴西葡萄牙语   |
| ar    | 阿拉伯语     | hi    | 印地语      |
| th    | 泰语       | vi    | 越南语      |
| id    | 印尼语      | ms    | 马来语      |
| tr    | 土耳其语     | pl    | 波兰语      |
| nl    | 荷兰语      | uk    | 乌克兰语     |
| sv    | 瑞典语      | fa    | 波斯语      |
| mn_mo | 蒙古语      | mn_cy | 蒙古语(西里尔) |
| km    | 高棉语      | nb_no | 挪威语(书面)  |
| nn_no | 挪威语(新挪威) | -     | -        |

## 开发

### 项目结构

```
├── main.js        # 插件主逻辑
├── info.json      # 插件配置信息
├── openai.svg     # 插件图标
└── .github/
    └── workflows/
        └── build.yml  # 自动构建配置
```

### 本地开发

1. 克隆仓库

```bash
git clone https://github.com/zhao004/pot-app-recognize-openai-third-parties.git
```

2. 修改代码后，手动打包测试

```bash
zip -r plugin.potext info.json main.js openai.svg
```

3. 在 Pot App 中安装测试

### 发布新版本

推送以 `v` 开头的标签会自动触发 GitHub Actions 构建并发布 Release：

```bash
git tag v1.0.0
git push origin v1.0.0
```

## 许可证

MIT License

## 相关链接

- [Pot App 官网](https://pot-app.com/)
- [Pot App GitHub](https://github.com/pot-app/pot-desktop)
- [插件开发文档](https://pot-app.com/plugin.html)
