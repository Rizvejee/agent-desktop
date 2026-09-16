const Groq = require("groq-sdk");

class ModelClient {
  constructor(provider = "groq", config = {}) {
    this.provider = provider;
    this.config = config;
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
        // Gemini OpenAI compatible API استعمال کریں
        this.client = new Groq({
          apiKey: this.config.apiKey || process.env.GEMINI_API_KEY,
          baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
        });
        this.model = this.config.model || "gemini-2.0-flash";
        break;

      case "ollama":
        // Ollama OpenAI compatible API
        this.client = new Groq({
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
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 4096,
    });
    return response.choices[0].message.content;
  }

  async sendMessageWithTools(messages, tools) {
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
  }

  async sendMessageWithToolsStream(messages, tools, onChunk) {
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
  }
}

module.exports = ModelClient;
