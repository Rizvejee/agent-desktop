const Groq = require("groq-sdk");

class ModelClient {
  constructor() {
    this.client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
    this.model = "openai/gpt-oss-120b";
  }

  // simple message بھیجیں
  async sendMessage(messages) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 8192,
    });

    return response.choices[0].message.content;
  }

  // tools کے ساتھ message بھیجیں
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
      max_tokens: 4096,
    });

    return response.choices[0];
  }
  
    // sendMessageWithToolsStream
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
