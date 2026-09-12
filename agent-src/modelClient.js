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
}

module.exports = ModelClient;