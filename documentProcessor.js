const cheerio = require('cheerio');
const { marked } = require('marked');
const mammoth = require('mammoth');
const Groq = require('groq-sdk');

class DocumentProcessor {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }

  async processDocuments(files) {
    const processedDocs = [];
    
    for (const file of files) {
      try {
        const processed = await this.processDocument(file);
        processedDocs.push(processed);
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        processedDocs.push({
          ...file,
          processed: false,
          error: error.message
        });
      }
    }
    
    return processedDocs;
  }

  async processDocument(file) {
    let cleanedContent = file.content;
    
    switch (file.type) {
      case 'html':
        cleanedContent = await this.cleanHtml(file.content);
        break;
      case 'markdown':
        cleanedContent = await this.cleanMarkdown(file.content);
        break;
      case 'docx':
        cleanedContent = await this.processDocx(file.content);
        break;
    }

    // AI-powered cleanup and validation
    const aiCleanedContent = await this.aiCleanup(cleanedContent, file.type);
    
    return {
      ...file,
      originalContent: file.content,
      cleanedContent: aiCleanedContent,
      processed: true
    };
  }

  async cleanHtml(content) {
    const $ = cheerio.load(content);
    
    // Remove script and style tags
    $('script, style').remove();
    
    // Clean up common HTML issues
    $('*').each((i, elem) => {
      const $elem = $(elem);
      // Remove empty attributes
      Object.keys(elem.attribs || {}).forEach(attr => {
        if (!$elem.attr(attr) || $elem.attr(attr).trim() === '') {
          $elem.removeAttr(attr);
        }
      });
    });
    
    // Remove excessive whitespace
    return $.html().replace(/\s+/g, ' ').trim();
  }

  async cleanMarkdown(content) {
    // Fix common markdown issues
    let cleaned = content
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
      .replace(/\s+$/gm, '') // Remove trailing spaces
      .replace(/^[\s]*#/gm, '#') // Fix heading spacing
      .replace(/\*{3,}/g, '***') // Fix emphasis markers
      .replace(/_{3,}/g, '___'); // Fix emphasis markers
    
    return cleaned.trim();
  }

  async processDocx(content) {
    try {
      // If content is already text, return as is
      if (typeof content === 'string') {
        return content;
      }
      
      // If it's a buffer or needs conversion
      const result = await mammoth.convertToHtml({ buffer: content });
      return result.value;
    } catch (error) {
      console.error('DOCX processing error:', error);
      return content; // Return original if conversion fails
    }
  }

  async aiCleanup(content, fileType) {
    const prompt = `Clean up this ${fileType} document content. Fix syntax issues, improve structure, and ensure it's ready for DITA conversion.

Content:
${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}

Requirements:
1. Fix any syntax errors
2. Ensure proper structure for ${fileType}
3. Remove unnecessary elements
4. Maintain semantic meaning
5. Prepare for DITA conversion

Return only the cleaned content without explanations.`;

    try {
      const response = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: process.env.LANGCHAIN_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.1
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('AI cleanup failed:', error);
      return content; // Return original if AI cleanup fails
    }
  }
}

module.exports = DocumentProcessor;