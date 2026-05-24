/**
 * Pot App OpenAI 兼容 OCR 识别插件
 * 支持 OpenAI 及其他兼容 API 的图片文字识别
 */

// ==================== 常量定义 ====================

const DEFAULT_MODEL = "gpt-4o";
const DEFAULT_API_PATH = "https://api.openai.com";
const API_ENDPOINT = "/v1/chat/completions";
const DEFAULT_PROMPT = "Just recognize the text in the image. Do not offer unnecessary explanations.";
const ORIGINAL_IMAGE_MIME = "image/png";
const COMPRESSED_IMAGE_MIME = "image/jpeg";
const IMAGE_COMPRESSION_AUTO = "auto";
const AUTO_COMPRESSION_MIN_BYTES = 700 * 1024;
const AUTO_COMPRESSION_QUALITY = 0.85;
const AUTO_COMPRESSION_MIN_SAVING_RATIO = 0.15;

// ==================== 工具函数 ====================

/**
 * 移除 data URL 前缀，返回纯 Base64 图片数据
 * @param {string} base64 - Base64 图片数据或 data URL
 * @returns {string} 纯 Base64 图片数据
 */
function stripDataUrlPrefix(base64) {
    if (typeof base64 !== "string") {
        return "";
    }
    const trimmed = base64.trim();
    if (/^data:[^,]*;base64,/i.test(trimmed)) {
        return trimmed.slice(trimmed.indexOf(",") + 1);
    }
    return trimmed;
}

/**
 * 粗略估算 Base64 对应的原始字节数
 * @param {string} base64 - Base64 图片数据或 data URL
 * @returns {number} 估算字节数
 */
function estimateBase64Bytes(base64) {
    const normalized = stripDataUrlPrefix(base64).replace(/\s/g, "");
    if (normalized.length === 0) {
        return 0;
    }
    const paddingMatch = normalized.match(/=+$/);
    const padding = paddingMatch ? paddingMatch[0].length : 0;
    return Math.max(0, Math.floor(normalized.length * 3 / 4) - padding);
}

/**
 * 加载 Base64 图片
 * @param {string} base64 - 纯 Base64 图片数据
 * @returns {Promise<HTMLImageElement>} 图片对象
 */
function loadImage(base64) {
    if (typeof Image === "undefined") {
        return Promise.reject(new Error("Image API is not available."));
    }
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Image load failed."));
        image.src = `data:${ORIGINAL_IMAGE_MIME};base64,${base64}`;
    });
}

/**
 * 使用 Canvas 将 PNG 图片编码为 JPEG
 * @param {string} base64 - 纯 Base64 PNG 图片数据
 * @param {number} quality - JPEG 编码质量
 * @returns {Promise<string>} JPEG 图片 Base64
 */
async function encodePngToJpeg(base64, quality) {
    if (typeof document === "undefined" || typeof document.createElement !== "function") {
        throw new Error("Canvas API is not available.");
    }

    const image = await loadImage(base64);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) {
        throw new Error("Invalid image size.");
    }

    // 保留原始分辨率，只转换编码格式，不做缩放。
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context || typeof canvas.toDataURL !== "function") {
        throw new Error("Canvas encode API is not available.");
    }
    context.drawImage(image, 0, 0, width, height);
    return stripDataUrlPrefix(canvas.toDataURL(COMPRESSED_IMAGE_MIME, quality));
}

/**
 * 构造原图返回对象
 * @param {string} base64 - Base64 图片数据或 data URL
 * @returns {object} 原图信息
 */
function buildOriginalImageResult(base64) {
    const pureBase64 = stripDataUrlPrefix(base64).replace(/\s/g, "");
    const originalBytes = estimateBase64Bytes(pureBase64);
    return {
        base64: pureBase64,
        mime: ORIGINAL_IMAGE_MIME,
        compressed: false,
        originalBytes,
        finalBytes: originalBytes
    };
}

/**
 * 按需尝试压缩图片，失败时静默回退原图
 * @param {string} base64 - Base64 图片数据或 data URL
 * @param {string} imageCompression - 图片压缩模式
 * @returns {Promise<object>} 图片处理结果
 */
async function maybeCompressImage(base64, imageCompression) {
    const originalImage = buildOriginalImageResult(base64);
    if (imageCompression !== IMAGE_COMPRESSION_AUTO) {
        return originalImage;
    }
    if (originalImage.originalBytes <= AUTO_COMPRESSION_MIN_BYTES) {
        return originalImage;
    }

    try {
        const compressedBase64 = await encodePngToJpeg(originalImage.base64, AUTO_COMPRESSION_QUALITY);
        const compressedBytes = estimateBase64Bytes(compressedBase64);
        if (
            compressedBytes > 0 &&
            compressedBytes < originalImage.originalBytes * (1 - AUTO_COMPRESSION_MIN_SAVING_RATIO)
        ) {
            return {
                base64: compressedBase64,
                mime: COMPRESSED_IMAGE_MIME,
                compressed: true,
                originalBytes: originalImage.originalBytes,
                finalBytes: compressedBytes
            };
        }
        return originalImage;
    } catch (_) {
        return originalImage;
    }
}

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
 * @param {string} imageBase64 - Base64 编码的图片数据
 * @param {string} imageMime - 图片 MIME 类型
 * @param {string} prompt - 系统提示词
 * @returns {object} 请求体对象
 */
function buildRequestBody(model, imageBase64, imageMime, prompt) {
    return {
        model, messages: [{
            role: "system", content: [{type: "text", text: prompt}]
        }, {
            role: "user", content: [{
                type: "image_url", image_url: {
                    url: `data:${imageMime};base64,${imageBase64}`, detail: "high"
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
        model = DEFAULT_MODEL, apiKey, requestPath, customPrompt, imageCompression = "off"
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
    const image = await maybeCompressImage(base64, imageCompression);
    const body = buildRequestBody(model, image.base64, image.mime, prompt);
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
