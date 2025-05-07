import axios from 'axios';

/**
 * OpenAIService for interacting with the OpenAI API
 * This service handles the integration with OpenAI's models
 */
export class OpenAIService {
  private static readonly API_URL = 'https://api.openai.com/v1/chat/completions';
  private static readonly MODEL = 'gpt-4o-mini';  // FIXED: enforce gpt-4o-mini only
  private static readonly MAX_TOKENS = 1500; // REDUCED from 4000 to control costs
  private static readonly TEMPERATURE = 0.7;
  
  // API call tracking
  private static apiCallCount = 0;
  private static lastCallTimestamp = 0;
  private static readonly RATE_LIMIT_PER_MINUTE = 10; // Maximum calls per minute
  
  private static getApiKey(): string {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OpenAI API key not found. Please set VITE_OPENAI_API_KEY in your environment.');
      throw new Error('OpenAI API key not configured');
    }
    return apiKey;
  }
  
  /**
   * Track API call rate and implement rate limiting
   */
  private static trackApiCall(): void {
    const now = Date.now();
    this.apiCallCount++;
    
    // Log every API call
    console.log(`[OpenAI API] Call #${this.apiCallCount} - Using model: ${this.MODEL}`);
    
    // Check rate limiting (within a minute window)
    if (now - this.lastCallTimestamp < 60000) {
      if (this.apiCallCount > this.RATE_LIMIT_PER_MINUTE) {
        console.warn(`[OpenAI API] Rate limit exceeded: ${this.apiCallCount} calls in the last minute`);
        // Don't throw, but log warning
      }
    } else {
      // Reset counter for new minute
      this.apiCallCount = 1;
      this.lastCallTimestamp = now;
    }
  }
  
  /**
   * Generate a chat completion from OpenAI
   */
  static async generateCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>,
    options: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
    } = {}
  ): Promise<string> {
    try {
      this.trackApiCall();
      const apiKey = this.getApiKey();
      
      // CRITICAL FIX: Force gpt-4o-mini regardless of what's passed in
      // This prevents accidental use of more expensive models
      const model = this.MODEL;
      const maxTokens = Math.min(options.maxTokens || this.MAX_TOKENS, this.MAX_TOKENS);
      
      console.log(`[OpenAI API] Making API call with ${messages.length} messages, max tokens: ${maxTokens}`);
      
      const response = await axios.post(
        this.API_URL,
        {
          model: model, // FIXED: Always use our specified model
          messages,
          max_tokens: maxTokens,
          temperature: options.temperature !== undefined ? options.temperature : this.TEMPERATURE,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      
      console.log(`[OpenAI API] Response received: ${response.data.usage?.total_tokens || 'unknown'} tokens used`);
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('[OpenAI API] Error generating completion:', error);
      
      // Return more specific error information
      const axiosError = error as any;
      if (axiosError.response) {
        console.error('[OpenAI API] Error details:', axiosError.response.data);
        throw new Error(`OpenAI API error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
      }
      
      throw new Error('Failed to generate text with OpenAI');
    }
  }
  
  /**
   * Generate a structured JSON response
   */
  static async generateStructuredResponse<T>(
    messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>,
    options: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
    } = {}
  ): Promise<T> {
    try {
      // Add JSON formatting instruction to the system message
      const systemMessage = messages.find(m => m.role === 'system');
      if (systemMessage) {
        systemMessage.content += '\nYou must respond with valid JSON only. No explanations or text outside the JSON structure.';
      } else {
        messages.unshift({
          role: 'system',
          content: 'You must respond with valid JSON only. No explanations or text outside the JSON structure.'
        });
      }
      
      // CRITICAL FIX: Force model to gpt-4o-mini regardless of what's passed in options
      const jsonString = await this.generateCompletion(messages, {
        ...options,
        model: this.MODEL, // FIXED: Always use our specified model
        temperature: options.temperature || 0.2, // Lower temperature for structured outputs
        maxTokens: Math.min(options.maxTokens || 1500, this.MAX_TOKENS) // Ensure we don't exceed our limit
      });
      
      // Clean up the response in case the model included markdown code blocks
      const cleanedJson = jsonString.replace(/```json|```/g, '').trim();
      
      try {
        return JSON.parse(cleanedJson) as T;
      } catch (parseError) {
        console.error('[OpenAI API] Error parsing JSON response:', parseError);
        console.error('[OpenAI API] Raw response:', jsonString);
        throw new Error('Failed to parse JSON response from OpenAI');
      }
    } catch (error) {
      console.error('[OpenAI API] Error generating structured response:', error);
      throw new Error('Failed to generate structured response with OpenAI');
    }
  }
}
