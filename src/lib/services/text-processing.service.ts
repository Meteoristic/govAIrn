import { MarkdownParser } from '../utils/markdownParser';

/**
 * TextProcessingService processes proposal text for analysis
 * This service extracts key information from proposals to make them
 * more suitable for AI analysis
 */
export class TextProcessingService {
  /**
   * Extract key information from a proposal description
   */
  static extractProposalInfo(
    description: string
  ): {
    plainText: string;
    chunks: string[];
    summary: string;
    pros: string[];
    cons: string[];
    keyPoints: string[];
  } {
    if (!description) {
      return {
        plainText: '',
        chunks: [],
        summary: '',
        pros: [],
        cons: [],
        keyPoints: []
      };
    }
    
    // Convert markdown to plain text
    const plainText = MarkdownParser.extractPlainText(description);
    
    // Split into chunks for processing
    const chunks = MarkdownParser.chunkText(plainText);
    
    // Extract summary (first paragraph or first 150 chars)
    const summary = this.extractSummary(plainText);
    
    // Extract pros and cons
    const { pros, cons } = this.extractProsAndCons(description);
    
    // Extract key points
    const keyPoints = this.extractKeyPoints(plainText);
    
    return {
      plainText,
      chunks,
      summary,
      pros,
      cons,
      keyPoints
    };
  }
  
  /**
   * Extract a summary from the text
   */
  private static extractSummary(text: string): string {
    if (!text) return '';
    
    // First paragraph or first 150 chars
    const firstParagraph = text.split('\n\n')[0] || '';
    return firstParagraph.length > 150 
      ? firstParagraph.substring(0, 147) + '...' 
      : firstParagraph;
  }
  
  /**
   * Extract pros and cons from a proposal
   */
  private static extractProsAndCons(
    text: string
  ): { pros: string[]; cons: string[] } {
    if (!text) return { pros: [], cons: [] };
    
    // Extract pros section
    const prosRegex = /(?:pros|benefits|advantages|positives)(?:\s*:|\s*\n)([\s\S]*?)(?=(?:cons|drawbacks|disadvantages|negatives)|$)/i;
    const prosMatch = text.match(prosRegex);
    const pros = prosMatch
      ? MarkdownParser.extractBulletPoints(prosMatch[1])
      : [];
    
    // Extract cons section
    const consRegex = /(?:cons|drawbacks|disadvantages|negatives)(?:\s*:|\s*\n)([\s\S]*?)(?=(?:pros|benefits|advantages|positives)|$)/i;
    const consMatch = text.match(consRegex);
    const cons = consMatch
      ? MarkdownParser.extractBulletPoints(consMatch[1])
      : [];
    
    return { pros, cons };
  }
  
  /**
   * Extract key points from a proposal
   */
  private static extractKeyPoints(text: string): string[] {
    if (!text) return [];
    
    // Look for key sections like "Key Points", "Summary", "Overview"
    const keyPointsRegex = /(?:key\s*points|summary|overview|highlights|important\s*points)(?:\s*:|\s*\n)([\s\S]*?)(?=\n\n|$)/i;
    const keyPointsMatch = text.match(keyPointsRegex);
    
    if (keyPointsMatch) {
      return MarkdownParser.extractBulletPoints(keyPointsMatch[1]);
    }
    
    // If no explicit key points section, look for bullet points in the first few paragraphs
    const firstPortion = text.split('\n\n').slice(0, 3).join('\n\n');
    const bulletPoints = MarkdownParser.extractBulletPoints(firstPortion);
    
    if (bulletPoints.length > 0) {
      return bulletPoints;
    }
    
    // If still no bullet points, extract important sentences
    return this.extractImportantSentences(text);
  }
  
  /**
   * Extract important sentences from text
   */
  private static extractImportantSentences(text: string): string[] {
    if (!text) return [];
    
    // Split text into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    
    // Filter for important sentences (those with key indicators)
    const importantIndicators = [
      'important', 'critical', 'essential', 'key', 'significant',
      'must', 'should', 'will', 'propose', 'recommend', 'suggest',
      'impact', 'effect', 'result', 'consequence', 'increase', 'decrease',
      'treasury', 'fund', 'budget', 'allocate', 'governance'
    ];
    
    const importantSentences = sentences
      .filter(sentence => {
        const lowerSentence = sentence.toLowerCase();
        return importantIndicators.some(indicator => lowerSentence.includes(indicator));
      })
      .map(sentence => sentence.trim());
    
    // Return up to 5 important sentences or empty array if none found
    return importantSentences.slice(0, 5);
  }
  
  /**
   * Identify decision-relevant financial terms in a proposal
   */
  static extractFinancialTerms(text: string): string[] {
    if (!text) return [];
    
    const lowerText = text.toLowerCase();
    const financialTerms = [
      'treasury', 'fund', 'budget', 'allocate', 'allocation',
      'spend', 'cost', 'expense', 'investment', 'return',
      'token', 'eth', 'crypto', 'dollar', 'usd', 'grant',
      'revenue', 'profit', 'loss', 'asset', 'liability'
    ];
    
    return financialTerms.filter(term => lowerText.includes(term));
  }
  
  /**
   * Score a proposal's complexity (1-10)
   */
  static scoreComplexity(text: string): number {
    if (!text) return 5; // Default medium complexity
    
    // Factors that increase complexity
    const complexityFactors = {
      length: text.length / 1000, // Length in kilobytes
      technicalTerms: (text.match(/protocol|implementation|algorithm|framework|infrastructure|architecture/gi) || []).length,
      codeBlocks: (text.match(/```[\s\S]*?```/g) || []).length,
      financialTerms: this.extractFinancialTerms(text).length,
      bullets: (text.match(/(?:^|\n)[\s]*[-*][\s]+[^\n]+/g) || []).length,
      sections: (text.match(/#{2,4}\s+[^\n]+/g) || []).length
    };
    
    // Calculate complexity score (1-10)
    const score = Math.min(10, Math.max(1, Math.floor(
      1 + // Base score
      complexityFactors.length * 0.5 + // 0.5 points per KB
      complexityFactors.technicalTerms * 0.3 + // 0.3 points per technical term
      complexityFactors.codeBlocks * 0.5 + // 0.5 points per code block
      complexityFactors.financialTerms * 0.3 + // 0.3 points per financial term
      Math.min(2, complexityFactors.bullets * 0.1) + // Up to 2 points for bullet structure
      Math.min(2, complexityFactors.sections * 0.2) // Up to 2 points for section structure
    )));
    
    return score;
  }
}
