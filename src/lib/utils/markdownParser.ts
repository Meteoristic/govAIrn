/**
 * Utility class for parsing and processing markdown content
 */
export class MarkdownParser {
  /**
   * Extract plain text from markdown
   */
  static extractPlainText(markdown: string): string {
    if (!markdown) return '';
    
    // Remove headings
    let text = markdown.replace(/#{1,6}\s+([^\n]+)/g, '$1\n\n');
    
    // Remove bold/italic
    text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
    text = text.replace(/(\*|_)(.*?)\1/g, '$2');
    
    // Remove links but keep link text
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    
    // Remove images
    text = text.replace(/!\[([^\]]+)\]\([^)]+\)/g, '');
    
    // Remove code blocks
    text = text.replace(/```[\s\S]*?```/g, '');
    
    // Remove inline code
    text = text.replace(/`([^`]+)`/g, '$1');
    
    // Replace multiple new lines with double new lines
    text = text.replace(/\n{3,}/g, '\n\n');
    
    return text.trim();
  }
  
  /**
   * Split text into chunks for AI processing
   */
  static chunkText(text: string, maxChunkSize: number = 1000): string[] {
    if (!text || text.length <= maxChunkSize) {
      return [text];
    }
    
    // Split by paragraphs
    const paragraphs = text.split(/\n{2,}/);
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length < maxChunkSize) {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = paragraph;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }
  
  /**
   * Extract bullet points from markdown content
   * Useful for extracting pros/cons from a proposal
   */
  static extractBulletPoints(text: string): string[] {
    if (!text) return [];
    
    // Look for bullet points (markdown style - *, -, or numbered)
    const bulletRegex = /(?:^|\n)[\s]*[-*][\s]+([^\n]+)|(?:^|\n)[\s]*\d+\.[\s]+([^\n]+)/g;
    const points: string[] = [];
    let match;
    
    while ((match = bulletRegex.exec(text)) !== null) {
      const point = (match[1] || match[2])?.trim();
      if (point) points.push(point);
    }
    
    // If no bullet points found, split by newlines and filter empty lines
    if (points.length === 0) {
      return text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    }
    
    return points;
  }
}
