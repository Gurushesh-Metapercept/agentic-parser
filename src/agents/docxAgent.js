const mammoth = require('mammoth');
const axios = require('axios');
const Groq = require('groq-sdk');

class DocxAgent {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    this.apiEndpoint = process.env.DOCX_TO_DITA_API || 'http://localhost:3003/convert/docx-to-dita';
  }

  async cleanAndProcess(fileName, docxBuffer) {
    const extractedContent = await this.extractDocx(docxBuffer);
    const structuredContent = await this.structureContent(extractedContent);
    
    return {
      filename: fileName,
      originalContent: docxBuffer,
      cleanedContent: structuredContent
    };
  }

  async convertToApi(zipBuffer, userId) {
    if (!this.apiEndpoint) {
      throw new Error('DOCX to DITA API endpoint not configured');
    }

    console.log(`Calling external conversion API for userId: ${userId}`);

    const FormData = require('form-data');
    const form = new FormData();
    
    form.append('file', zipBuffer, 'cleaned_files.zip');
    form.append('userId', userId);
    
    const response = await axios.post(this.apiEndpoint, form, {
      headers: form.getHeaders(),
      timeout: 60000
    });
    
    console.log(`Conversion completed successfully for userId: ${userId}`);
    
    return {
      downloadLink: response.data.downloadLink,
      message: response.data.message
    };
  }

  async extractDocx(docxBuffer) {
    try {
      const result = await mammoth.convertToHtml({ buffer: docxBuffer });
      return result.value;
    } catch (error) {
      return docxBuffer.toString();
    }
  }

  async structureContent(content) {
    const prompt = `Structure this DOCX-extracted content for better organization. Fix formatting issues and improve document structure:

${content.substring(0, 1500)}

Return only the structured content without explanations.`;

    try {
      const response = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: process.env.LANGCHAIN_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.1
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      return content;
    }
  }


}

module.exports = DocxAgent;