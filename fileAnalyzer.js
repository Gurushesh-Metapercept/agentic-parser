const fs = require('fs-extra');
const path = require('path');
const JSZip = require('jszip');
const Groq = require('groq-sdk');

class FileAnalyzer {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }

  async analyzeFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.zip') {
      return await this.extractAndAnalyzeZip(filePath);
    } else {
      const content = await fs.readFile(filePath, 'utf8');
      const fileType = await this.detectFileType(content, ext);
      
      return {
        files: [{
          name: path.basename(filePath),
          content,
          type: fileType,
          path: filePath
        }]
      };
    }
  }

  async extractAndAnalyzeZip(zipPath) {
    const zipData = await fs.readFile(zipPath);
    const zip = await JSZip.loadAsync(zipData);
    const files = [];

    for (const [filename, file] of Object.entries(zip.files)) {
      if (!file.dir) {
        const ext = path.extname(filename).toLowerCase();
        if (['.html', '.htm', '.md', '.docx'].includes(ext)) {
          const content = await file.async('string');
          const fileType = await this.detectFileType(content, ext);
          
          files.push({
            name: filename,
            content,
            type: fileType,
            path: filename
          });
        }
      }
    }

    return { files };
  }

  async detectFileType(content, extension) {
    const prompt = `Analyze this document content and determine its type. Consider both the file extension "${extension}" and the actual content structure.

Content preview (first 500 chars):
${content.substring(0, 500)}

Respond with exactly one of these types: "html", "markdown", or "docx"
Also identify any structural issues or cleanup needed.

Format your response as JSON:
{
  "type": "html|markdown|docx",
  "confidence": 0.0-1.0,
  "issues": ["list of issues found"],
  "recommendations": ["cleanup suggestions"]
}`;

    try {
      const response = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: process.env.LANGCHAIN_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.1
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      return analysis.type;
    } catch (error) {
      console.error('AI analysis failed, falling back to extension:', error);
      // Fallback to extension-based detection
      if (extension === '.md') return 'markdown';
      if (['.html', '.htm'].includes(extension)) return 'html';
      if (extension === '.docx') return 'docx';
      return 'html'; // default
    }
  }
}

module.exports = FileAnalyzer;