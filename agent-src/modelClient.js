const Groq = require("groq-sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Ollama } = require("ollama");

class ModelClient {
  constructor(provider = "groq", config = {}) {
    this.provider = provider;
    this.config = config;
    this.client = null;
    this.model = config.model;
     // ✅ نیا: Settings سے API keys load کریں (اگر config میں نہیں ہیں)
    this.loadApiKeysFromSettings();

    // Provider-wise token limits (free tier safe)
    this.tokenLimits = {
      groq: 8000,      // Groq free tier: 8K safe
      gemini: 16000,   // Gemini free tier: 16K safe
      ollama: 4096     // Local: depends on RAM
    };

    this.setupClient();
  }

  // ═══════════════════════════════════════════════════════
// 🔑 SETTINGS سے API KEYS LOAD کریں
// ═══════════════════════════════════════════════════════
loadApiKeysFromSettings() {
  try {
    const fs = require("fs");
    const path = require("path");
    const settingsPath = path.join(__dirname, "../memory/settings.json");
    
    if (!fs.existsSync(settingsPath)) {
      console.warn("⚠️ Settings file not found at:", settingsPath);
      return;
    }
    
    const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
    
    // Provider کو settings سے override کریں (اگر config میں نہیں ہے)
    if (!this.config.apiKey && !this.config.baseURL) {
      if (settings.provider) {
        this.provider = settings.provider;
      }
      
      // Groq API key
      if (this.provider === "groq" && settings.groqApiKey) {
        this.config.apiKey = settings.groqApiKey;
        this.config.model = settings.groqModel || this.config.model;
        console.log("✅ Groq API key loaded from settings");
      }
      
      // Gemini API key
      if (this.provider === "gemini" && settings.geminiApiKey) {
        this.config.apiKey = settings.geminiApiKey;
        this.config.model = settings.geminiModel || this.config.model;
        console.log("✅ Gemini API key loaded from settings");
      }
      
      // Ollama URL
      if (this.provider === "ollama" && settings.ollamaUrl) {
        this.config.baseURL = settings.ollamaUrl;
        this.config.model = settings.ollamaModel || this.config.model;
        console.log("✅ Ollama URL loaded from settings");
      }
    }
  } catch (error) {
    console.error("❌ Error loading settings:", error.message);
  }
}

  setupClient() {
    switch (this.provider) {
      case "groq":
        this.client = new Groq({
          apiKey: this.config.apiKey || process.env.GROQ_API_KEY,
        });
        this.model = this.config.model || "llama-3.3-70b-versatile";
        break;

      case "gemini":
        // ✅ Official Google Generative AI SDK
        const apiKey = this.config.apiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error("Gemini API key is required");
        }
        this.client = new GoogleGenerativeAI(apiKey);
        this.model = this.config.model || "gemini-1.5-flash";
        break;

      case "ollama":
        // ✅ Official Ollama SDK
        this.client = new Ollama({
          host: this.config.baseURL || "http://localhost:11434",
        });
        this.model = this.config.model || "llama3.2";
        break;

      default:
        throw new Error(`Unknown provider: ${this.provider}`);
    }
  }

  // ✅ Normal message (non-streaming)
  async sendMessage(messages) {
    try {
      switch (this.provider) {
        case "groq":
          return await this.sendGroqMessage(messages);
        case "gemini":
          return await this.sendGeminiMessage(messages);
        case "ollama":
          return await this.sendOllamaMessage(messages);
        default:
          throw new Error(`Unknown provider: ${this.provider}`);
      }
    } catch (error) {
      this.handleProviderError(error);
    }
  }

  // ✅ Message with tools (non-streaming)
  async sendMessageWithTools(messages, tools) {
    try {
      switch (this.provider) {
        case "groq":
          return await this.sendGroqMessageWithTools(messages, tools);
        case "gemini":
          return await this.sendGeminiMessageWithTools(messages, tools);
        case "ollama":
          return await this.sendOllamaMessageWithTools(messages, tools);
        default:
          throw new Error(`Unknown provider: ${this.provider}`);
      }
    } catch (error) {
      this.handleProviderError(error);
    }
  }

  // ✅ Message with tools (streaming)
  async sendMessageWithToolsStream(messages, tools, onChunk) {
    try {
      switch (this.provider) {
        case "groq":
          return await this.sendGroqStream(messages, tools, onChunk);
        case "gemini":
          return await this.sendGeminiStream(messages, tools, onChunk);
        case "ollama":
          return await this.sendOllamaStream(messages, tools, onChunk);
        default:
          throw new Error(`Unknown provider: ${this.provider}`);
      }
    } catch (error) {
      this.handleProviderError(error);
    }
  }

  // ─── GROQ METHODS ─────────────────────────────────────
  async sendGroqMessage(messages) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages,
      temperature: 0.7,
      max_tokens: this.tokenLimits.groq,
    });
    return response.choices[0].message.content;
  }

  async sendGroqMessageWithTools(messages, tools) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages,
      tools: tools.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema,
        },
      })),
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: this.tokenLimits.groq,
    });
    return response.choices[0];
  }

  async sendGroqStream(messages, tools, onChunk) {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: messages,
      tools: tools.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema,
        },
      })),
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: this.tokenLimits.groq,
      stream: true,
    });

    let fullContent = "";
    let toolCalls = [];
    let finishReason = null;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      finishReason = chunk.choices[0]?.finish_reason;

      if (delta?.content) {
        fullContent += delta.content;
        onChunk(delta.content);
      }

      if (delta?.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          const index = toolCall.index;
          if (!toolCalls[index]) {
            toolCalls[index] = {
              id: toolCall.id || "",
              type: "function",
              function: { name: "", arguments: "" },
            };
          }
          if (toolCall.id) toolCalls[index].id = toolCall.id;
          if (toolCall.function?.name)
            toolCalls[index].function.name += toolCall.function.name;
          if (toolCall.function?.arguments)
            toolCalls[index].function.arguments += toolCall.function.arguments;
        }
      }
    }

    return {
      finish_reason: finishReason,
      message: {
        content: fullContent || null,
        tool_calls: toolCalls.length > 0 ? toolCalls : null,
      },
    };
  }

  // ─── GEMINI METHODS ───────────────────────────────────
  async sendGeminiMessage(messages) {
    const model = this.client.getGenerativeModel({ model: this.model });

    // Convert OpenAI format to Gemini format
    const geminiMessages = this.convertToGeminiFormat(messages);
    const chat = model.startChat({
      history: geminiMessages.slice(0, -1),
      generationConfig: {
        maxOutputTokens: this.tokenLimits.gemini,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(geminiMessages[geminiMessages.length - 1].parts[0].text);
    return result.response.text();
  }

  async sendGeminiMessageWithTools(messages, tools) {
    const model = this.client.getGenerativeModel({
      model: this.model,
      tools: [{
        functionDeclarations: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: this.convertSchemaToGemini(tool.input_schema),
        })),
      }],
    });

    const geminiMessages = this.convertToGeminiFormat(messages);
    const chat = model.startChat({
      history: geminiMessages.slice(0, -1),
      generationConfig: {
        maxOutputTokens: this.tokenLimits.gemini,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(geminiMessages[geminiMessages.length - 1].parts[0].text);
    const response = result.response;

    // Check if model wants to call a function
    const functionCalls = response.functionCalls();
    if (functionCalls && functionCalls.length > 0) {
      return {
        finish_reason: "tool_calls",
        message: {
          content: response.text() || null,
          tool_calls: functionCalls.map((fc, idx) => ({
            id: `call_${idx}`,
            type: "function",
            function: {
              name: fc.name,
              arguments: JSON.stringify(fc.args),
            },
          })),
        },
      };
    }

    return {
      finish_reason: "stop",
      message: {
        content: response.text(),
        tool_calls: null,
      },
    };
  }

  async sendGeminiStream(messages, tools, onChunk) {
    const model = this.client.getGenerativeModel({
      model: this.model,
      tools: [{
        functionDeclarations: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: this.convertSchemaToGemini(tool.input_schema),
        })),
      }],
    });

    const geminiMessages = this.convertToGeminiFormat(messages);
    const chat = model.startChat({
      history: geminiMessages.slice(0, -1),
      generationConfig: {
        maxOutputTokens: this.tokenLimits.gemini,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessageStream(geminiMessages[geminiMessages.length - 1].parts[0].text);

    let fullContent = "";
    let toolCalls = [];

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        fullContent += text;
        onChunk(text);
      }

      const functionCalls = chunk.functionCalls();
      if (functionCalls) {
        toolCalls = functionCalls.map((fc, idx) => ({
          id: `call_${idx}`,
          type: "function",
          function: {
            name: fc.name,
            arguments: JSON.stringify(fc.args),
          },
        }));
      }
    }

    return {
      finish_reason: toolCalls.length > 0 ? "tool_calls" : "stop",
      message: {
        content: fullContent || null,
        tool_calls: toolCalls.length > 0 ? toolCalls : null,
      },
    };
  }

  // ─── OLLAMA METHODS ───────────────────────────────────
  async sendOllamaMessage(messages) {
    const response = await this.client.chat({
      model: this.model,
      messages: messages,
      options: {
        temperature: 0.7,
        num_predict: this.tokenLimits.ollama,
      },
    });
    return response.message.content;
  }

  async sendOllamaMessageWithTools(messages, tools) {
    // Ollama supports tools in newer versions
    const response = await this.client.chat({
      model: this.model,
      messages: messages,
      tools: tools.map(tool => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema,
        },
      })),
      options: {
        temperature: 0.7,
        num_predict: this.tokenLimits.ollama,
      },
    });

    if (response.message.tool_calls && response.message.tool_calls.length > 0) {
      return {
        finish_reason: "tool_calls",
        message: {
          content: response.message.content || null,
          tool_calls: response.message.tool_calls.map((tc, idx) => ({
            id: `call_${idx}`,
            type: "function",
            function: {
              name: tc.function.name,
              arguments: JSON.stringify(tc.function.arguments),
            },
          })),
        },
      };
    }

    return {
      finish_reason: "stop",
      message: {
        content: response.message.content,
        tool_calls: null,
      },
    };
  }

  async sendOllamaStream(messages, tools, onChunk) {
    const response = await this.client.chat({
      model: this.model,
      messages: messages,
      tools: tools.map(tool => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema,
        },
      })),
      stream: true,
      options: {
        temperature: 0.7,
        num_predict: this.tokenLimits.ollama,
      },
    });

    let fullContent = "";
    let toolCalls = [];
    let finishReason = "stop";

    for await (const chunk of response) {
      if (chunk.message?.content) {
        fullContent += chunk.message.content;
        onChunk(chunk.message.content);
      }

      if (chunk.message?.tool_calls) {
        finishReason = "tool_calls";
        toolCalls = chunk.message.tool_calls.map((tc, idx) => ({
          id: `call_${idx}`,
          type: "function",
          function: {
            name: tc.function.name,
            arguments: JSON.stringify(tc.function.arguments),
          },
        }));
      }
    }

    return {
      finish_reason: finishReason,
      message: {
        content: fullContent || null,
        tool_calls: toolCalls.length > 0 ? toolCalls : null,
      },
    };
  }

  // ─── HELPER METHODS ───────────────────────────────────
  convertToGeminiFormat(messages) {
    return messages
      .filter(msg => msg.role !== "system") // System message handled separately
      .map(msg => {
        if (msg.role === "user") {
          return { role: "user", parts: [{ text: msg.content }] };
        } else if (msg.role === "assistant") {
          return { role: "model", parts: [{ text: msg.content }] };
        } else if (msg.role === "tool") {
          return { role: "function", parts: [{ text: msg.content }] };
        }
        return null;
      })
      .filter(msg => msg !== null);
  }

  convertSchemaToGemini(schema) {
    // Convert JSON Schema to Gemini format
    const convert = (obj) => {
      if (!obj || typeof obj !== "object") return obj;

      const result = {};

      if (obj.type) result.type = obj.type.toUpperCase();
      if (obj.description) result.description = obj.description;

      if (obj.properties) {
        result.properties = {};
        for (const [key, value] of Object.entries(obj.properties)) {
          result.properties[key] = convert(value);
        }
      }

      if (obj.items) {
        result.items = convert(obj.items);
      }

      if (obj.required) {
        result.required = obj.required;
      }

      if (obj.enum) {
        result.enum = obj.enum;
      }

      return result;
    };

    return convert(schema);
  }

  // ✅ Available models fetch کریں
  async getAvailableModels() {
    try {
      if (!this.client) return [];

      switch (this.provider) {
        case "groq": {
          const response = await this.client.models.list();
          return response.data.map(m => ({
            id: m.id,
            name: m.id,
            description: "",
          }));
        }

        case "gemini": {
          const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models?key=" +
            (this.config.apiKey || process.env.GEMINI_API_KEY)
          );
          const data = await response.json();
          return (data.models || [])
            .filter(m => Array.isArray(m.supportedGenerationMethods) &&
                         m.supportedGenerationMethods.includes("generateContent"))
            .map(m => ({
              id: m.name?.replace("models/", "") || m.name,
              name: m.displayName || m.name || "Unknown",
              description: m.description || "",
            }));
        }

        case "ollama": {
          const response = await this.client.list();
          return (response.models || []).map(m => ({
            id: m.name,
            name: m.name,
            description: "",
          }));
        }

        default:
          return [];
      }
    } catch (error) {
      console.error("Error fetching models:", error);
      return [];
    }
  }

  // ✅ Provider-wise error handling
  handleProviderError(error) {
    const providerMessages = {
      groq: {
        401: "Groq API key invalid. Please check Settings > AI Model.",
        404: `Model "${this.model}" not found. Try: llama-3.3-70b-versatile`,
        429: "Groq rate limit reached. Please wait a moment.",
      },
      gemini: {
        400: "Gemini request error. Check API key and model name.",
        403: "Gemini API key invalid or quota exceeded.",
        404: `Model "${this.model}" not found. Try: gemini-1.5-flash`,
        429: "Gemini rate limit reached. Please wait.",
      },
      ollama: {
        ECONNREFUSED: "Ollama is not running. Start it with: ollama serve",
        ENOTFOUND: `Ollama server not found at ${this.config.baseURL}`,
      },
    };

    const messages = providerMessages[this.provider] || {};

    if (error.status && messages[error.status]) {
      throw new Error(messages[error.status]);
    }

    if (error.code && messages[error.code]) {
      throw new Error(messages[error.code]);
    }

    // Generic error
    throw new Error(
      `${this.provider} error: ${error.message}\n` +
      `Please check your ${this.provider} settings and try again.`
    );
  }
}

module.exports = ModelClient;
