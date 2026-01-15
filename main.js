/**
 * Pot App OpenAI 兼容 OCR 识别插件
 * 支持 OpenAI 及其他兼容 API 的图片文字识别
 */

// ==================== 常量定义 ====================

const DEFAULT_MODEL = "gpt-4o";
const DEFAULT_API_PATH = "https://api.openai.com";
const API_ENDPOINT = "/v1/chat/completions";
const DEFAULT_PROMPT = "Just recognize the text in the image. Do not offer unnecessary explanations.";

// ==================== 工具函数 ====================

/**
 * 规范化请求路径
 * - 自动添加 https:// 前缀
 * - 移除末尾斜杠
 * - 智能补全端点路径
 * @param {string} path - 用户输入的请求路径
 * @returns {string} 规范化后的完整 API 路径
 */
function normalizeRequestPath(path) {
    if (!path || path.trim() === "") {
        return DEFAULT_API_PATH + API_ENDPOINT;
    }
    let normalized = path.trim();
    // 添加协议前缀
    if (!/^https?:\/\//i.test(normalized)) {
        normalized = `https://${normalized}`;
    }
    // 移除末尾斜杠
    normalized = normalized.replace(/\/+$/, "");
    // 智能补全端点路径
    if (normalized.endsWith("/chat/completions")) {
        // 已经是完整路径，无需处理
    } else if (normalized.endsWith("/v1")) {
        // 以 /v1 结尾，只需补全 /chat/completions
        normalized += "/chat/completions";
    } else {
        // 其他情况，补全完整端点
        normalized += API_ENDPOINT;
    }
    return normalized;
}

/**
 * 构建自定义 Prompt
 * @param {string} customPrompt - 用户自定义的 Prompt
 * @param {string} lang - 目标语言
 * @returns {string} 处理后的 Prompt
 */
function buildPrompt(customPrompt, lang) {
    if (!customPrompt || customPrompt.trim() === "") {
        return DEFAULT_PROMPT;
    }
    return customPrompt.replaceAll("$lang", lang);
}

/**
 * 构建请求体
 * @param {string} model - 模型名称
 * @param {string} base64 - Base64 编码的图片数据
 * @param {string} prompt - 系统提示词
 * @returns {object} 请求体对象
 */
function buildRequestBody(model, base64, prompt) {
    return {
        model, messages: [{
            role: "system", content: [{type: "text", text: prompt}]
        }, {
            role: "user", content: [{
                type: "image_url", image_url: {
                    url: `data:image/png;base64,${base64}`, detail: "high"
                }
            }]
        }]
    };
}

/**
 * 验证必填参数
 * @param {string} apiKey - API 密钥
 * @param {string} base64 - Base64 图片数据
 * @throws {string} 参数缺失时抛出错误
 */
function validateParams(apiKey, base64) {
    if (!apiKey || apiKey.trim() === "") {
        throw "API Key is required. Please configure your API Key.";
    }
    if (!base64 || base64.trim() === "") {
        throw "Image data is empty. Please provide a valid image.";
    }
}

/**
 * 解析 API 响应
 * @param {object} response - API 响应对象
 * @returns {string} 识别结果文本
 * @throws {string} 响应格式错误时抛出异常
 */
function parseResponse(response) {
    const content = response?.choices?.[0]?.message?.content;
    if (content === undefined || content === null) {
        throw `Invalid API response format: ${JSON.stringify(response)}`;
    }
    return content;
}

/**
 * 格式化错误信息
 * @param {object} res - 响应对象
 * @returns {string} 格式化的错误信息
 */
function formatError(res) {
    const errorData = res.data;
    const errorMessage = errorData?.error?.message || JSON.stringify(errorData);
    return `HTTP Request Error\nStatus: ${res.status}\nMessage: ${errorMessage}`;
}

// ==================== 主函数 ====================

/**
 * OCR 识别主函数
 * @param {string} base64 - Base64 编码的图片数据
 * @param {string} lang - 目标识别语言
 * @param {object} options - 配置选项
 * @param {object} options.config - 插件配置
 * @param {object} options.utils - 工具函数集
 * @returns {Promise<string>} 识别结果文本
 * @throws {string} 请求失败或参数错误时抛出异常
 */
async function recognize(base64, lang, options) {
    const {config, utils} = options;
    const {tauriFetch: fetch} = utils;
    // 解构配置参数
    const {
        model = DEFAULT_MODEL, apiKey, requestPath, customPrompt
    } = config;
    // 参数验证
    validateParams(apiKey, base64);
    // 验证模型
    if (typeof model === "string" && model.trim() === "") {
        throw "Model is required. Please specify a model name.";
    }
    // 构建请求参数
    const url = normalizeRequestPath(requestPath);
    const prompt = buildPrompt(customPrompt, lang);
    const body = buildRequestBody(model, base64, prompt);
    const headers = {
        "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}`
    };
    // 发送请求
    const res = await fetch(url, {
        method: "POST", url: url, headers: headers, body: {
            type: "Json", payload: body
        }
    });
    // 处理响应
    if (res.ok) {
        return parseResponse(res.data);
    } else {
        throw formatError(res);
    }
}
