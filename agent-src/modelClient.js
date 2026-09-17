const Groq = require("groq-sdk");
const OpenAI = require("openai");

class ModelClient {
  constructor(provider = "groq", config = {}) {
    this.provider = provider;
    this.config = config;
    this.client = null;
    this.model = config.model;
    this.setupClient();
  }

  setupClient() {
    switch (this.provider) {
      case "groq":
        this.client = new Groq({
          apiKey: this.config.apiKey || process.env.GROQ_API_KEY,
        });
        this.model = this.config.model || "openai/gpt-oss-120b";
        break;

      case "gemini":
        // ✅ OpenAI SDK استعمال کریں Gemini کے لیے
        this.client = new OpenAI({
          apiKey: this.config.apiKey || process.env.GEMINI_API_KEY,
          baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
        });
        this.model = this.config.model || "gemini-2.5-flash";
        break;

      case "ollama":
        // Ollama OpenAI compatible API
        this.client = new OpenAI({
          apiKey: "ollama",
          baseURL: this.config.baseURL || "http://localhost:11434/v1",
        });
        this.model = this.config.model || "llama3.2";
        break;

      default:
        throw new Error(`Unknown provider: ${this.provider}`);
    }
  }



  async sendMessage(messages) {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 4096,
      });
      return response.choices[0].message.content;
    } catch (error) {
      // ✅ Better error message
      if (error.status === 404) {
        throw new Error(
          `Model "${this.model}" not found or deprecated.\n\n` +
          `Please go to Settings > AI Model and select a different model.\n\n` +
          `For Gemini, try: gemini-2.5-flash or gemini-2.5-pro\n\n` +
          `Error details: ${error.message}`
        );
      }
      throw error;
    }
  }

  async sendMessageWithTools(messages, tools) {
    try {
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
        max_tokens: 8192,
      });
      return response.choices[0];
    } catch (error) {
      if (error.status === 404) {
        throw new Error(
          `Model "${this.model}" not available.\n\n` +
          `Please update the model in Settings.`
        );
      }
      throw error;
    }
  }

  async sendMessageWithToolsStream(messages, tools, onChunk) {
    try {
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
        max_tokens: 8192,
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
    } catch (error) {
      if (error.status === 404) {
        throw new Error(
          ` Model "${this.model}" not found!\n\n` +
          `🔧 Solution:\n` +
          `1. Go to Settings (click "Rizwan" button)\n` +
          `2. Click "AI Model" tab\n` +
          `3. Select a different model or enter custom model name\n\n` +
          `💡 Recommended Gemini models:\n` +
          `- gemini-2.5-flash (fast & smart)\n` +
          `- gemini-2.5-pro (most capable)\n\n` +
          `Error: ${error.message}`
        );
      }
      throw error;
    }
  }

  // ✅ Available models fetch کریں
  async getAvailableModels() {
    try {
      if (!this.client) return [];

      if (this.provider === "groq") {
        // Groq OpenAI SDK سپورٹ کرتا ہے
        const response = await this.client.models.list();
        return response.data.map(m => ({
          id: m.id,
          name: m.id, // Groq میں name اور id ایک ہی ہوتے ہیں
          description: ""
        }));
      }

      if (this.provider === "gemini") {
        // Gemini کے لیے models list
        const response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models?key=" +
          (this.config.apiKey || process.env.GEMINI_API_KEY)
        );
        const data = await response.json();
        return data.models
          .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
          .map(m => ({
            id: m.name.replace("models/", ""),
            name: m.displayName || m.name,
            description: m.description || ""
          }));
      } else if (this.provider === "groq") {
        // Groq کے لیے models
        const response = await this.client.models.list();
        return response.data.map(m => ({
          id: m.id,
          name: m.id,
          description: ""
        }));
      } else if (this.provider === "ollama") {
        // Ollama کے لیے local models
        const response = await fetch(this.config.baseURL || "http://localhost:11434/api/tags");
        const data = await response.json();
        return data.models.map(m => ({
          id: m.name,
          name: m.name,
          description: ""
        }));
      }
    } catch (error) {
      console.error("Error fetching models:", error);
      return [];
    }
    return [];
  }
}



module.exports = ModelClient;
