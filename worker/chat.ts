import OpenAI from 'openai';
import type { Message, ToolCall } from './types';
import { getToolDefinitions, executeTool } from './tools';
import { ChatCompletionMessageFunctionToolCall } from 'openai/resources/index.mjs';
import { delay } from './utils';
/**
 * ChatHandler - Handles all chat-related operations
 *
 * This class encapsulates the OpenAI integration and tool execution logic,
 * making it easy for AI developers to understand and extend the functionality.
 */
export class ChatHandler {
  private client?: OpenAI;
  private model: string;
  private isConfigured: boolean;
  constructor(aiGatewayUrl: string, apiKey: string, model: string) {
    this.model = model;
    if (!aiGatewayUrl || !apiKey || !aiGatewayUrl.includes('https://')) {
        console.error('AI Gateway URL or API Key is missing/invalid. AI features will be disabled.');
        this.isConfigured = false;
    } else {
        this.client = new OpenAI({
            baseURL: aiGatewayUrl,
            apiKey: apiKey
        });
        this.isConfigured = true;
        console.log("ChatHandler initialized with AI Gateway:", aiGatewayUrl);
    }
  }
  /**
   * Process a user message and generate AI response with optional tool usage
   */
  async processMessage(
    message: string,
    conversationHistory: Message[],
    onChunk?: (chunk: string) => void
  ): Promise<{
    content: string;
    toolCalls?: ToolCall[];
  }> {
    if (!this.isConfigured || !this.client) {
        throw new Error('AI Gateway is not configured. Cannot process message.');
    }
    const messages = this.buildConversationMessages(message, conversationHistory);
    const toolDefinitions = await getToolDefinitions();
    const useTools = this.model.includes('voither') || this.model.includes('openai');
    const requestOptions: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
        model: this.model,
        messages,
        max_tokens: 4096,
        ...(useTools && { tools: toolDefinitions, tool_choice: 'auto' }),
    };
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            if (onChunk) {
                const stream = await this.client.chat.completions.create({ ...requestOptions, stream: true });
                return this.handleStreamResponse(stream, message, conversationHistory, onChunk);
            }
            const completion = await this.client.chat.completions.create({ ...requestOptions, stream: false });
            return this.handleNonStreamResponse(completion, message, conversationHistory);
        } catch (error: any) {
            console.error(`Chat completion failed on attempt ${attempt + 1}:`, error.message);
            if (attempt === 2 || (error.status !== 500 && error.status !== 429)) {
                throw error; // Rethrow on final attempt or for non-retriable errors
            }
            await delay(1000 * Math.pow(2, attempt)); // Exponential backoff
        }
    }
    // This should not be reached if the loop logic is correct
    throw new Error('Failed to process message after multiple retries.');
  }
  private async handleStreamResponse(
    stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
    message: string,
    conversationHistory: Message[],
    onChunk: (chunk: string) => void
  ) {
    let fullContent = '';
    const accumulatedToolCalls: ChatCompletionMessageFunctionToolCall[] = [];
    try {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          fullContent += delta.content;
          onChunk(delta.content);
        }
        // Accumulate tool calls from streaming chunks
        if (delta?.tool_calls) {
          for (let i = 0; i < delta.tool_calls.length; i++) {
            const deltaToolCall = delta.tool_calls[i];
            if (!accumulatedToolCalls[i]) {
              accumulatedToolCalls[i] = {
                id: deltaToolCall.id || `tool_${Date.now()}_${i}`,
                type: 'function',
                function: {
                  name: deltaToolCall.function?.name || '',
                  arguments: deltaToolCall.function?.arguments || ''
                }
              };
            } else {
              // Append to existing tool call
              if (deltaToolCall.function?.name && !accumulatedToolCalls[i].function.name) {
                accumulatedToolCalls[i].function.name = deltaToolCall.function.name;
              }
              if (deltaToolCall.function?.arguments) {
                accumulatedToolCalls[i].function.arguments += deltaToolCall.function.arguments;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream processing error:', error);
      throw new Error('Stream processing failed');
    }
    if (accumulatedToolCalls.length > 0) {
      const executedTools = await this.executeToolCalls(accumulatedToolCalls);
      const finalResponse = await this.generateToolResponse(message, conversationHistory, accumulatedToolCalls, executedTools);
      return { content: finalResponse, toolCalls: executedTools };
    }
    return { content: fullContent };
  }
  private async handleNonStreamResponse(
    completion: OpenAI.Chat.Completions.ChatCompletion,
    message: string,
    conversationHistory: Message[]
  ) {
    const responseMessage = completion.choices[0]?.message;
    if (!responseMessage) {
      return { content: 'I apologize, but I encountered an issue processing your request.' };
    }
    if (!responseMessage.tool_calls) {
      return {
        content: responseMessage.content || 'I apologize, but I encountered an issue.'
      };
    }
    const toolCalls = await this.executeToolCalls(responseMessage.tool_calls as ChatCompletionMessageFunctionToolCall[]);
    const finalResponse = await this.generateToolResponse(
      message,
      conversationHistory,
      responseMessage.tool_calls,
      toolCalls
    );
    return { content: finalResponse, toolCalls };
  }
  /**
   * Execute all tool calls from OpenAI response
   */
  private async executeToolCalls(openAiToolCalls: ChatCompletionMessageFunctionToolCall[]): Promise<ToolCall[]> {
    return Promise.all(
      openAiToolCalls.map(async (tc) => {
        try {
          const args = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
          const result = await executeTool(tc.function.name, args);
          return {
            id: tc.id,
            name: tc.function.name,
            arguments: args,
            result
          };
        } catch (error) {
          console.error(`Tool execution failed for ${tc.function.name}:`, error);
          return {
            id: tc.id,
            name: tc.function.name,
            arguments: {},
            result: { error: `Failed to execute ${tc.function.name}: ${error instanceof Error ? error.message : 'Unknown error'}` }
          };
        }
      })
    );
  }
  /**
   * Generate final response after tool execution
   */
  private async generateToolResponse(
    userMessage: string,
    history: Message[],
    openAiToolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[],
    toolResults: ToolCall[]
  ): Promise<string> {
    if (!this.client) throw new Error('AI client not configured');
    const followUpCompletion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant. Respond naturally to the tool results.' },
        ...history.slice(-3).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
        {
          role: 'assistant',
          content: null,
          tool_calls: openAiToolCalls
        },
        ...toolResults.map((result, index) => ({
          role: 'tool' as const,
          content: JSON.stringify(result.result),
          tool_call_id: openAiToolCalls[index]?.id || result.id
        }))
      ],
      max_tokens: 4096
    });
    return followUpCompletion.choices[0]?.message?.content || 'Tool results processed successfully.';
  }
  /**
   * Build conversation messages for OpenAI API
   */
  private buildConversationMessages(userMessage: string, history: Message[]) {
    return [
      {
        role: 'system' as const,
        content: 'You are a helpful AI assistant that helps users build and deploy web applications. You provide clear, concise guidance on development, deployment, and troubleshooting. Keep responses practical and actionable.'
      },
      ...history.slice(-5).map(m => ({
        role: m.role,
        content: m.content
      })),
      { role: 'user' as const, content: userMessage }
    ];
  }
  /**
   * Update the model for this chat handler
   */
  updateModel(newModel: string): void {
    this.model = newModel;
  }
}