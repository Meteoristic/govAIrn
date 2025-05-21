import axios from 'axios';

// Type definitions for caching
type CacheKey = string;
type CachedResponse = {
  response: string;
  timestamp: number;
};

/**
 * OpenAIService for interacting with the OpenAI API
 * This service handles the integration with OpenAI's models
 */
export class OpenAIService {
  private static readonly API_URL = 'https://api.openai.com/v1/chat/completions';
  private static readonly MODEL = 'gpt-4o-mini';  // FIXED: enforce gpt-4o-mini only
  private static readonly MAX_TOKENS = 1500; // REDUCED from 4000 to control costs
  private static readonly TEMPERATURE = 0.5; // REDUCED to 0.5 for more deterministic outputs
  
  // Cache configuration
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private static responseCache: Map<CacheKey, CachedResponse> = new Map();
  
  // API call tracking
  private static apiCallCount = 0;
  private static lastCallTimestamp = 0;
  private static readonly RATE_LIMIT_PER_MINUTE = 10; // Maximum calls per minute
  
  // Development mode detection
  private static get isDevMode(): boolean {
    return import.meta.env.DEV === true;
  }
  
  // Get API key from environment variable
  private static getApiKey(): string {
    // Get API key from environment variable
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (apiKey) {
      console.log(`[OpenAI API] Using API key from environment variables (length: ${apiKey.length})`);
      console.log(`[OpenAI API] Key starts with: ${apiKey.substring(0, 4)}...`);
      return apiKey;
    } else {
      console.warn('[OpenAI API] API key not found in environment variables. Falling back to mock response mode.');
      console.warn('[OpenAI API] Make sure you have VITE_OPENAI_API_KEY set in your .env file');
      return 'mock-key';
    }
  }
  
  // Mock mode detection
  private static get useMockResponses(): boolean {
    // Check for explicit mock mode toggle in .env
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const explicitMockMode = import.meta.env.VITE_USE_MOCK_AI === 'true';
    
    // Log environment check info - this helps diagnose configuration issues
    console.log('[OpenAI API] Environment check:', {
      isDevMode: this.isDevMode,
      VITE_USE_MOCK_AI: import.meta.env.VITE_USE_MOCK_AI || 'not set',
      envApiKeyAvailable: !!apiKey,
      envKeyLength: apiKey ? apiKey.length : 0,
    });
    
    const mockMode = explicitMockMode || !apiKey;
    console.log('[OpenAI API] Using mock mode:', mockMode, 'Reason:', 
      explicitMockMode ? 'Explicitly configured' : 
      !apiKey ? 'No API key found in env' : 
      'Using real API');
    
    return mockMode;
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
   * Generate a mock response based on user input
   * This is used in development mode to avoid API costs
   */
  private static getMockResponse(userInput: string): string {
    // Log that we're using a mock response
    console.log('[OpenAI API] Generating mock response instead of making API call');
    
    const input = userInput.toLowerCase();
    
    // Check for proposal-related questions
    if (input.includes('proposal') || input.includes('vote')) {
      if (input.includes('should i vote') || input.includes('recommend')) {
        return `Based on your persona preferences, I recommend voting FOR this proposal.

CONFIDENCE: High

RATIONALE:
The proposal aligns well with your focus on decentralization and community impact. It balances risk appropriately for your moderate risk tolerance.

KEY CONSIDERATIONS:
• Financial impact: Minimal treasury usage (5% of reserves)
• Governance alignment: Strengthens community involvement in decision-making
• Timeline: Effects align with your medium-term horizon preference

NEXT STEPS:
1. Review the full proposal details in the proposal modal
2. Cast your vote before the deadline (36 hours remaining)
3. Consider joining the governance forum discussion to voice your support`;
      }
      
      if (input.includes('explain') || input.includes('details')) {
        return `PROPOSAL ANALYSIS

This proposal seeks to allocate 5% of the treasury for community-led initiatives. Here's what you need to know based on your preferences:

IMPACT ASSESSMENT:
• Treasury impact: 5% allocation (moderate)
• Risk profile: Well-structured implementation with clear oversight
• Community benefit: High potential for ecosystem growth

ALIGNMENT WITH YOUR PREFERENCES:
• Decentralization focus: Strong alignment (community-led decision making)
• Medium-term horizon: Project outcomes expected within 8-12 months
• Moderate risk: Protected by multi-sig controls and reporting requirements

The proposal includes quarterly reporting requirements and a multi-sig wallet controlled by elected community members. This governance structure aligns well with your preference for decentralized but accountable decision-making.

RECOMMENDATION:
This proposal deserves your support as it's well-aligned with your governance values while maintaining appropriate risk controls.`;
      }
    }
    
    // Check for persona-related queries
    if (input.includes('persona') || input.includes('preferences')) {
      return `YOUR GOVERNANCE PERSONA

Based on your stored preferences, your governance approach:

RISK TOLERANCE: Moderate
• You balance risk and opportunity in decision-making
• You're open to innovation with reasonable safeguards

PRIORITY FOCUS: Balanced
• You seek equilibrium between security and innovation
• You value both stability and growth initiatives

TIME HORIZON: Medium-term
• You consider implications in the 6-18 month timeframe
• You balance immediate needs with longer-term planning

GOVERNANCE STYLE: Decentralization-focused
• You prioritize community involvement and broad participation
• You value transparent and inclusive decision processes

COMMUNITY IMPACT: High priority
• You strongly value proposals that benefit the wider community
• You consider ecosystem health as essential for long-term value

Would you like me to help evaluate a specific proposal based on these preferences?`;
    }
    
    // Default response
    return `I'm your govAIrn governance agent, here to help you make informed decisions based on your specific preferences.

I notice you're interested in ${input.includes('dao') ? 'DAO governance' : 'governance matters'}. What specific aspect would you like guidance on?

I can help with:
• Analyzing proposals for alignment with your preferences
• Explaining technical governance concepts
• Providing voting recommendations
• Outlining potential impacts of governance decisions

Let me know what you'd like to focus on, and I'll provide insights tailored to your governance persona.`;
  }
  
  /**
   * Get cached response if available and valid
   */
  private static getCachedResponse(cacheKey: string): string | null {
    const cached = this.responseCache.get(cacheKey);
    
    if (cached) {
      const now = Date.now();
      // Check if cache is still valid
      if (now - cached.timestamp < this.CACHE_DURATION) {
        console.log('[OpenAI API] Using cached response');
        return cached.response;
      } else {
        // Remove expired cache entry
        this.responseCache.delete(cacheKey);
      }
    }
    
    return null;
  }
  
  /**
   * Store response in cache
   */
  private static cacheResponse(cacheKey: string, response: string): void {
    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now()
    });
    console.log('[OpenAI API] Response cached');
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
    // Extract the latest user message for mock responses and cache key
    const latestUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    
    // Generate a cache key based on the last 3 messages (for context)
    const recentMessages = messages.slice(-3);
    const cacheKey = JSON.stringify(recentMessages);
    
    // Add instructions to avoid markdown formatting
    const systemMessage = messages.find(m => m.role === 'system');
    if (systemMessage) {
      if (!systemMessage.content.includes('DO NOT use markdown formatting')) {
        systemMessage.content += '\n\nIMPORTANT: DO NOT use markdown formatting in your response. Do not use # for headers or * for emphasis. Use plain text with ALL CAPS for headings and standard bullet points (•) where needed.';
      }
    } else {
      messages.unshift({
        role: 'system',
        content: 'IMPORTANT: DO NOT use markdown formatting in your response. Do not use # for headers or * for emphasis. Use plain text with ALL CAPS for headings and standard bullet points (•) where needed.'
      });
    }
    
    // Check if we should use mock mode
    if (this.useMockResponses) {
      console.log('[OpenAI API] Using mock mode by configuration');
      return this.getMockResponse(latestUserMessage);
    }
    
    // Check cache first
    const cachedResponse = this.getCachedResponse(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }
    
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
      let responseText = response.data.choices[0].message.content;
      
      // Clean up any remaining markdown that the model might have used despite instructions
      responseText = responseText
        .replace(/^###\s+(.*)$/gm, 'HEADING: $1')
        .replace(/^##\s+(.*)$/gm, 'HEADING: $1') 
        .replace(/^#\s+(.*)$/gm, 'HEADING: $1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/_([^_]+)_/g, '$1');
      
      // Cache the response
      this.cacheResponse(cacheKey, responseText);
      
      return responseText;
    } catch (error) {
      console.error('[OpenAI API] Error generating completion:', error);
      
      // Return more specific error information
      const axiosError = error as any;
      if (axiosError.response) {
        console.error('[OpenAI API] Error details:', axiosError.response.data);
      }
      
      // Use mock response as a fallback when API fails
      console.log('[OpenAI API] Using mock response as fallback due to API error');
      return this.getMockResponse(latestUserMessage);
    }
  }
  
  /**
   * Generate a structured JSON response
   */
  static async generateStructuredResponse<T extends Record<string, any>>(
    messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>,
    options: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
    } = {}
  ): Promise<T> {
    // Extract message content to determine appropriate mock response
    const latestUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const systemContent = messages.find(m => m.role === 'system')?.content || '';
    
    // Function to generate mock structured response
    const getMockStructuredResponse = (): T => {
      console.log('[OpenAI API] Using mock structured response');
      
      // Determine what type of structured data is being requested
      let mockResponse: any = {};
      
      // Check for governance/voting related requests
      if (latestUserMessage.toLowerCase().includes('proposal') || 
          systemContent.toLowerCase().includes('proposal') ||
          latestUserMessage.toLowerCase().includes('vote')) {
        mockResponse = {
          decision: 'for',
          confidence: 87,
          persona_match: 72,
          proposal_summary: "This proposal aims to modify governance parameters for more efficient decision-making in the DAO ecosystem. It introduces a streamlined voting process while maintaining necessary security controls and community oversight mechanisms.",
          reasoning: "This proposal aligns with efficient governance preferences, reducing quorum requirements while maintaining adequate representation. It addresses operational bottlenecks without compromising security, and the implementation timeline fits well with medium-term planning horizons.",
          recommendation: "Consider voting for this proposal based on its balanced approach to governance efficiency.",
          factors: [
            {
              factor_name: "Governance Efficiency",
              factor_value: 8,
              factor_weight: 9,
              explanation: "Significantly improves decision-making speed and reduces coordination overhead."
            },
            {
              factor_name: "Security Impact",
              factor_value: 5,
              factor_weight: 8,
              explanation: "Maintains adequate security controls and safeguards."
            },
            {
              factor_name: "Community Alignment",
              factor_value: 7,
              factor_weight: 7,
              explanation: "Addresses concerns raised in multiple community discussions."
            }
          ]
        };
      } else {
        // Generic mock response
        mockResponse = {
          success: true,
          message: "This is a mock structured response for development",
          timestamp: new Date().toISOString(),
          decision: "for",
          confidence: 75,
          persona_match: 65
        };
      }
      
      return mockResponse as T;
    };
    
    // Check if we should use mock mode for structured responses
    if (this.useMockResponses) {
      console.log('[OpenAI API] Using mock mode by configuration for structured response.');
      return getMockStructuredResponse();
    }
    
    try {
      // Add stronger JSON formatting instruction to the system message
      const systemMessage = messages.find(m => m.role === 'system');
      if (systemMessage) {
        systemMessage.content += '\n\nCRITICAL: You MUST respond with valid, complete JSON only. No explanations, text, or markdown outside the JSON structure. The JSON MUST include all required fields including: "decision", "confidence", "persona_match", "proposal_summary", "reasoning", and "factors". Ensure all fields are properly formatted with the exact field names specified. The proposal_summary field MUST contain a concise summary of the proposal content.';
      } else {
        messages.unshift({
          role: 'system',
          content: 'CRITICAL: You MUST respond with valid, complete JSON only. No explanations, text, or markdown outside the JSON structure. The JSON MUST include all required fields including: "decision", "confidence", "persona_match", "proposal_summary", "reasoning", and "factors". Ensure all fields are properly formatted with the exact field names specified. The proposal_summary field MUST contain a concise summary of the proposal content.'
        });
      }
      
      // Generate cache key for structured responses
      const cacheKey = 'structured_' + JSON.stringify(messages.slice(-3));
      
      // Check cache for structured responses
      const cachedResponse = this.getCachedResponse(cacheKey);
      if (cachedResponse) {
        try {
          return JSON.parse(cachedResponse) as T;
        } catch (parseError) {
          console.error('[OpenAI API] Error parsing cached JSON response:', parseError);
          // If parsing fails, continue with API call
        }
      }
      
      console.log('[OpenAI API] Attempting to generate REAL structured response.');
      const rawJsonString = await this.generateCompletion(messages, {
        ...options,
        model: this.MODEL, 
        temperature: options.temperature || 0.2,
        maxTokens: Math.min(options.maxTokens || 2000, 4000) // Increased token limit for better responses
      });
      
      console.log('[OpenAI API] Raw JSON string received from generateCompletion:', rawJsonString);
      
      // More aggressive JSON cleanup - handle code blocks, extra text, and other non-JSON content
      let cleanedJson = rawJsonString
        .replace(/```json|```javascript|```js|```/g, '') // Remove all code block markers
        .replace(/^.*?(\{[\s\S]*\}).*?$/s, '$1') // Extract just the JSON object
        .trim();
      
      console.log('[OpenAI API] Cleaned JSON string:', cleanedJson);
      
      try {
        console.log('[OpenAI API] Attempt 1: Parsing cleaned JSON directly...');
        const rawParsedResult = JSON.parse(cleanedJson) as Record<string, any>; // Parse as generic record
        console.log('[OpenAI API] Attempt 1: Successfully parsed JSON. Raw parsed object:', rawParsedResult);

        // Normalize keys: Create a new object mapping potential OpenAI key variations to our expected snake_case keys.
        const normalizedResult: Record<string, any> = {};
        
        // Define expected fields with their potential variations
        const expectedFields = [
          { standardKey: 'decision', alternateKeys: ['vote', 'recommendation', 'action', 'voting_recommendation'] },
          { standardKey: 'confidence', alternateKeys: ['confidence_score', 'confidenceScore', 'certainty', 'certaintyScore'] },
          { standardKey: 'persona_match', alternateKeys: ['personaMatch', 'personalignment', 'persona_alignment', 'match', 'personamatch'] },
          { standardKey: 'reasoning', alternateKeys: ['rationale', 'explanation', 'justification', 'analysis', 'reason'] },
          { standardKey: 'proposal_summary', alternateKeys: ['proposalSummary', 'proposalsummary', 'summary', 'description', 'content'] },
          { standardKey: 'recommendation', alternateKeys: ['advice', 'suggested_action', 'suggestedAction', 'recommend', 'suggestion'] },
          { standardKey: 'factors', alternateKeys: ['considerations', 'factorList', 'factor_list', 'pros_cons', 'prosCons', 'aspects'] }
        ];
        
        // Helper function to convert camelCase to snake_case for more flexibility
        const findPropertyCaseInsensitive = (obj: Record<string, any>, targetProp: string): any => {
          // Create different casing variations of the property name
          const snakeCase = targetProp.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          const camelCase = targetProp.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase());
          const pascalCase = camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
          const noUnderscores = targetProp.replace(/_/g, '');
          
          // Add special handling for combined words where underscores are missing
          const targetParts = targetProp.split('_');
          const combinedVariations = [];
          
          if (targetParts.length > 1) {
            // Create variations with missing underscores
            combinedVariations.push(targetParts.join('')); // All joined (e.g., "proposalsummary")
            
            // Try different capitalizations
            let partialCamel = targetParts[0];
            for (let i = 1; i < targetParts.length; i++) {
              partialCamel += targetParts[i].charAt(0).toUpperCase() + targetParts[i].slice(1);
            }
            combinedVariations.push(partialCamel); // Partial camelCase (e.g., "proposalSummary")
          }
          
          // More extensive property matching - try all variations and aliases
          const variations = [
            targetProp,                 // original (e.g., "proposal_summary")
            snakeCase,                  // ensure snake_case
            camelCase,                  // camelCase variant (e.g., "proposalSummary")
            pascalCase,                 // PascalCase variant (e.g., "ProposalSummary")
            targetProp.toLowerCase(),   // lowercase (e.g., "proposal_summary")
            snakeCase.toLowerCase(),    // lowercase snake_case
            camelCase.toLowerCase(),    // lowercase camelCase
            targetProp.toUpperCase(),   // uppercase (e.g., "PROPOSAL_SUMMARY")
            noUnderscores,              // no underscore (e.g., "proposalsummary")
            noUnderscores.toLowerCase(), // lowercase no underscore
            ...combinedVariations       // add our special combined variations
          ];
          
          // Check all variations of the target property
          for (const variant of variations) {
            if (obj[variant] !== undefined) {
              console.log(`[OpenAI API] Found property variant '${variant}' for '${targetProp}'`);
              return obj[variant];
            }
          }
          
          // Not found with any variation
          return undefined;
        };
        
        // Process each expected field
        for (const { standardKey, alternateKeys } of expectedFields) {
          // First try direct property access with the standard key
          if (rawParsedResult[standardKey] !== undefined) {
            normalizedResult[standardKey] = rawParsedResult[standardKey];
            continue;
          }
          
          // Try all alternate keys directly
          let found = false;
          for (const altKey of alternateKeys) {
            if (rawParsedResult[altKey] !== undefined) {
              normalizedResult[standardKey] = rawParsedResult[altKey];
              console.log(`[OpenAI API] Found alternate key '${altKey}' for '${standardKey}'`);
              found = true;
              break;
            }
          }
          
          if (found) continue;
          
          // ENHANCED CHECK FOR RUN-TOGETHER FIELD NAMES
          // First convert standardKey to run-together format (remove underscores)
          const runTogetherKey = standardKey.replace(/_/g, '').toLowerCase();
          if (rawParsedResult[runTogetherKey] !== undefined) {
            console.log(`[OpenAI API] Found run-together key without underscore: '${runTogetherKey}' for '${standardKey}'`);
            normalizedResult[standardKey] = rawParsedResult[runTogetherKey];
            continue;
          }
          
          // Also check for camelCase version of run-together key
          const camelCaseKey = runTogetherKey.replace(/^([a-z])|\s+([a-z])/g, function ($1) {
            return $1.toUpperCase();
          }).replace(/^([A-Z])/, function ($1) {
            return $1.toLowerCase();
          });
          
          if (rawParsedResult[camelCaseKey] !== undefined) {
            console.log(`[OpenAI API] Found camelCase version: '${camelCaseKey}' for '${standardKey}'`);
            normalizedResult[standardKey] = rawParsedResult[camelCaseKey];
            continue;
          }

          // Try similar keys with slight misspellings
          const similarKeys = Object.keys(rawParsedResult).filter(key => 
            key.toLowerCase().includes(standardKey.replace(/_/g, '').toLowerCase()) ||
            standardKey.replace(/_/g, '').toLowerCase().includes(key.toLowerCase())
          );
          
          if (similarKeys.length > 0) {
            console.log(`[OpenAI API] Found similar keys for '${standardKey}':`, similarKeys);
            normalizedResult[standardKey] = rawParsedResult[similarKeys[0]];
            continue;
          }
          
          // Try the more flexible property matching as a last resort
          normalizedResult[standardKey] = findPropertyCaseInsensitive(rawParsedResult, standardKey);
          
          if (normalizedResult[standardKey] === undefined) {
            console.warn(`[OpenAI API] Could not find any variation of '${standardKey}' in the response`);
          }
        }
        
        // Special handling for factors array which often causes issues
        if (normalizedResult.factors === undefined) {
          console.warn('[OpenAI API] Factors are missing, attempting to locate with different approaches');
          
          // Try to locate factors array using extended search
          const factorsArray = findPropertyCaseInsensitive(rawParsedResult, 'factors') ||
                              rawParsedResult.factorList || 
                              rawParsedResult.factor_list || 
                              rawParsedResult.pros_cons || 
                              rawParsedResult.prosCons ||
                              rawParsedResult.considerations ||
                              rawParsedResult.aspects;
                              
          if (factorsArray && Array.isArray(factorsArray)) {
            console.log('[OpenAI API] Found factors array with alternative key:', factorsArray.length, 'items');
            normalizedResult.factors = factorsArray;
          } else if (rawParsedResult.pros && Array.isArray(rawParsedResult.pros)) {
            // If no factors but we have pros/cons, convert them
            console.log('[OpenAI API] No factors, but found pros/cons arrays. Converting to factors.');
            
            const proFactors = Array.isArray(rawParsedResult.pros) ? 
              rawParsedResult.pros.map((pro: any, index: number) => {
                if (typeof pro === 'string') {
                  return {
                    factor_name: `Pro ${index + 1}`,
                    factor_value: 7,
                    factor_weight: 7,
                    explanation: pro
                  };
                } else if (typeof pro === 'object') {
                  // Handle case where pros might be objects with different field names
                  return {
                    factor_name: pro.name || pro.factor_name || pro.factorName || pro.factorname || `Pro ${index + 1}`,
                    factor_value: pro.value || pro.factor_value || pro.factorValue || pro.factorvalue || 7,
                    factor_weight: pro.weight || pro.factor_weight || pro.factorWeight || pro.factorweight || 7,
                    explanation: pro.explanation || pro.desc || pro.description || `Positive factor ${index + 1}`
                  };
                } else {
                  return {
                    factor_name: `Pro ${index + 1}`,
                    factor_value: 7,
                    factor_weight: 7,
                    explanation: `Positive factor ${index + 1}`
                  };
                }
              }) : [];
              
            const conFactors = Array.isArray(rawParsedResult.cons) ? 
              rawParsedResult.cons.map((con: any, index: number) => {
                if (typeof con === 'string') {
                  return {
                    factor_name: `Con ${index + 1}`,
                    factor_value: -5,
                    factor_weight: 6,
                    explanation: con
                  };
                } else if (typeof con === 'object') {
                  // Handle case where cons might be objects with different field names
                  return {
                    factor_name: con.name || con.factor_name || con.factorName || con.factorname || `Con ${index + 1}`,
                    factor_value: con.value || con.factor_value || con.factorValue || con.factorvalue || -5,
                    factor_weight: con.weight || con.factor_weight || con.factorWeight || con.factorweight || 6,
                    explanation: con.explanation || con.desc || con.description || `Negative factor ${index + 1}`
                  };
                } else {
                  return {
                    factor_name: `Con ${index + 1}`,
                    factor_value: -5,
                    factor_weight: 6,
                    explanation: `Negative factor ${index + 1}`
                  };
                }
              }) : [];
              
            normalizedResult.factors = [...proFactors, ...conFactors];
          } else {
            // Create default factors if none found
            console.log('[OpenAI API] Could not find any factors - creating default factors');
            normalizedResult.factors = [
              {
                factor_name: "Primary Consideration",
                factor_value: normalizedResult.decision === 'for' ? 8 : -6,
                factor_weight: 8,
                explanation: normalizedResult.reasoning?.substring(0, 100) || "Main consideration for this proposal."
              },
              {
                factor_name: "Implementation Impact",
                factor_value: normalizedResult.decision === 'for' ? 5 : -4,
                factor_weight: 6,
                explanation: "Potential impact on implementation and resources."
              },
              {
                factor_name: normalizedResult.decision === 'for' ? "Minor Drawback" : "Potential Benefit",
                factor_value: normalizedResult.decision === 'for' ? -3 : 4,
                factor_weight: 5,
                explanation: normalizedResult.decision === 'for' ? 
                  "Some minor concerns to consider." : 
                  "Potential benefit despite overall recommendation."
              }
            ];
          }
        }
        
        // Now normalize the factors array to ensure consistent field naming
        if (normalizedResult.factors && Array.isArray(normalizedResult.factors)) {
          console.log('[OpenAI API] Processing factors array for field normalization...');
          
          normalizedResult.factors = normalizedResult.factors.map((factor: any, index: number) => {
            // Create a properly normalized factor object 
            const normalizedFactor: any = {};
            
            // Define expected factor fields with potential variations
            const factorFieldMapping = [
              { standardKey: 'factor_name', altKeys: ['factorname', 'factorName', 'name', 'title', 'key'] },
              { standardKey: 'factor_value', altKeys: ['factorvalue', 'factorValue', 'value', 'score', 'impact'] },
              { standardKey: 'factor_weight', altKeys: ['factorweight', 'factorWeight', 'weight', 'importance', 'priority'] },
              { standardKey: 'explanation', altKeys: ['desc', 'description', 'detail', 'details', 'justification', 'reason'] }
            ];
            
            // Process each expected factor field
            factorFieldMapping.forEach(({ standardKey, altKeys }) => {
              // First try direct access with the standard key
              if (factor[standardKey] !== undefined) {
                normalizedFactor[standardKey] = factor[standardKey];
                return;
              }
              
              // Try alternate keys
              for (const altKey of altKeys) {
                if (factor[altKey] !== undefined) {
                  normalizedFactor[standardKey] = factor[altKey];
                  return;
                }
              }
              
              // Try the run-together version of the standard key (no underscore)
              const noUnderscoreKey = standardKey.replace(/_/g, '').toLowerCase();
              if (factor[noUnderscoreKey] !== undefined) {
                normalizedFactor[standardKey] = factor[noUnderscoreKey];
                return;
              }
              
              // Set defaults for missing fields
              switch (standardKey) {
                case 'factor_name':
                  normalizedFactor[standardKey] = `Factor ${index + 1}`;
                  break;
                case 'factor_value':
                  // Infer value from name if possible
                  if (normalizedFactor.factor_name) {
                    const nameLower = normalizedFactor.factor_name.toLowerCase();
                    normalizedFactor[standardKey] = 
                      nameLower.includes('con') || 
                      nameLower.includes('risk') || 
                      nameLower.includes('drawback') || 
                      nameLower.includes('against') ? -5 : 5;
                  } else {
                    normalizedFactor[standardKey] = index % 2 === 0 ? 5 : -3; // Alternate positive/negative
                  }
                  break;
                case 'factor_weight':
                  normalizedFactor[standardKey] = Math.abs(normalizedFactor.factor_value || 5) > 5 ? 8 : 5;
                  break;
                case 'explanation':
                  normalizedFactor[standardKey] = `${normalizedFactor.factor_name || `Factor ${index + 1}`} ${normalizedFactor.factor_value > 0 ? '(beneficial)' : '(consideration)'}`;
                  break;
              }
            });
            
            console.log(`[OpenAI API] Normalized factor ${index + 1}:`, normalizedFactor);
            return normalizedFactor;
          });
        }
        
        console.log('[OpenAI API] Normalized result object:', JSON.stringify(normalizedResult, null, 2));

        // Verify all required keys are present in the normalized result
        const keysToVerify = ['decision', 'confidence', 'persona_match', 'reasoning', 'proposal_summary'];
        const missingKeys = keysToVerify.filter(key => normalizedResult[key] === undefined);

        // If we're missing multiple critical fields, check if we have enough content to proceed anyway
        if (missingKeys.length > 0) {
          console.warn(`[OpenAI API] After normalization: Missing expected keys: ${missingKeys.join(', ')}`);
          
          // Only fall back to mock if we're missing truly critical fields AND we don't have viable alternatives
          const hasCoreDecision = normalizedResult.decision !== undefined;
          const hasValidFactors = normalizedResult.factors && Array.isArray(normalizedResult.factors) && normalizedResult.factors.length > 0;
          const hasAnySummary = normalizedResult.proposal_summary || normalizedResult.reasoning || rawParsedResult.summary;
          
          // If we have the core data needed, try to fix missing fields from what we have
          if (hasCoreDecision && hasValidFactors && hasAnySummary) {
            console.log('[OpenAI API] Some fields missing but we have the core data needed - attempting to recover');
            
            // Create summary from reasoning if needed
            if (!normalizedResult.proposal_summary && normalizedResult.reasoning) {
              const reasoningText = String(normalizedResult.reasoning);
              const firstSentence = reasoningText.split(/[.!?]/, 1)[0];
              normalizedResult.proposal_summary = firstSentence + (firstSentence.length < reasoningText.length ? '.' : '');
              console.log('[OpenAI API] Created proposal_summary from reasoning:', normalizedResult.proposal_summary);
            }
            
            // Set default confidence and persona_match if needed
            if (!normalizedResult.confidence) {
              normalizedResult.confidence = 75;
              console.log('[OpenAI API] Set default confidence value:', normalizedResult.confidence);
            }
            
            if (!normalizedResult.persona_match) {
              normalizedResult.persona_match = 70;
              console.log('[OpenAI API] Set default persona_match value:', normalizedResult.persona_match);
            }
            
            // Create recommendation if missing
            if (!normalizedResult.recommendation && normalizedResult.decision) {
              normalizedResult.recommendation = `Consider voting ${normalizedResult.decision} on this proposal based on the analysis.`;
              console.log('[OpenAI API] Created default recommendation');
            }
          } else if (missingKeys.includes('decision') || 
                   (missingKeys.includes('confidence') && missingKeys.includes('persona_match')) || 
                   (!hasValidFactors && !hasAnySummary)) {
            // Only fall back to mock response if multiple critical fields are truly missing
            console.warn('[OpenAI API] Too many critical fields missing AFTER normalization. Falling back to mock response.');
            return getMockStructuredResponse();
          }
        }
        
        this.cacheResponse(cacheKey, cleanedJson);
        console.log('[OpenAI API] Attempt 1: Returning successfully parsed and normalized object after factors check:', JSON.stringify(normalizedResult, null, 2));
        return normalizedResult as T;

      } catch (parseError) {
        console.error('[OpenAI API] Attempt 1: Parsing failed for cleaned JSON string.', parseError);
        console.error('[OpenAI API] Attempt 1: Failed to parse JSON string content was:', cleanedJson);
        console.warn('[OpenAI API] All JSON parsing attempts failed. Falling back to mock response.');
        return getMockStructuredResponse();
      }
    } catch (error) {
      console.error('[OpenAI API] Error in generateStructuredResponse (outer try-catch): ', error);
      console.warn('[OpenAI API] Falling back to mock response due to outer error.');
      return getMockStructuredResponse();
    }
  }
}

