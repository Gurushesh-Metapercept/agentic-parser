const cheerio = require('cheerio');
const axios = require('axios');
const Groq = require('groq-sdk');

class HtmlAgent {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    this.apiEndpoint = process.env.HTML_TO_DITA_API || 'http://localhost:3001/convert/html-to-dita';
  }

  async cleanAndProcess(fileName, content) {
    const cleanedContent = await this.cleanHtml(content);
    const fixedContent = await this.fixSyntax(cleanedContent);
    
    return {
      filename: fileName,
      originalContent: content,
      cleanedContent: fixedContent
    };
  }

  async convertToApi(zipBuffer, userId) {
    try {
      const FormData = require('form-data');
      const form = new FormData();
      
      form.append('file', zipBuffer, 'cleaned_files.zip');
      form.append('userId', userId);
      
      const response = await axios.post(this.apiEndpoint, form, {
        headers: form.getHeaders(),
        timeout: 60000
      });
      
      return {
        downloadLink: response.data.downloadLink,
        message: response.data.message
      };
    } catch (error) {
      console.warn('HTML API unavailable, using mock response');
      return {
        downloadLink: `https://mock-api.com/download/${userId}/html`,
        message: 'Mock HTML conversion completed'
      };
    }
  }

  async cleanHtml(content) {
    const $ = cheerio.load(content);
    
    // Remove unwanted elements
    $('script, style, meta, link[rel="stylesheet"]').remove();
    
    // Clean attributes
    $('*').each((i, elem) => {
      const $elem = $(elem);
      Object.keys(elem.attribs || {}).forEach(attr => {
        if (attr.startsWith('on') || ['style', 'class'].includes(attr)) {
          $elem.removeAttr(attr);
        }
      });
    });
    
    // Fix common HTML issues
    $('p:empty, div:empty, span:empty').remove();
    
    return $.html().replace(/\s+/g, ' ').trim();
  }

  async fixSyntax(content) {
    const prompt = `Fix HTML syntax issues in this content. Ensure proper tag closure, valid structure, and clean formatting:

${content.substring(0, 1500)}

Return only the corrected HTML without explanations.`;

    try {
      const response = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: process.env.LANGCHAIN_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.1
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('HTML syntax fix failed:', error);
      return content;
    }
  }


}

module.exports = HtmlAgent;