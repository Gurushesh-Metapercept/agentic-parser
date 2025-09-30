const axios = require("axios");
const Groq = require("groq-sdk");

class MarkdownAgent {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
    this.apiEndpoint = process.env.MARKDOWN_TO_DITA_API;
  }

  async cleanAndProcess(fileName, content) {
    const cleanedContent = await this.cleanMarkdown(content);
    const headingValidated = await this.ensureHeading(fileName, cleanedContent);
    const fixedContent = await this.fixSyntax(headingValidated);

    return {
      filename: fileName,
      originalContent: content,
      cleanedContent: fixedContent,
    };
  }

  async convertToApi(zipBuffer, userId) {
    if (!this.apiEndpoint) {
      throw new Error('Markdown to DITA API endpoint not configured');
    }

    const FormData = require("form-data");
    const form = new FormData();

    form.append("file", zipBuffer, "cleaned_files.zip");
    form.append("userId", userId);

    const response = await axios.post(this.apiEndpoint, form, {
      headers: form.getHeaders(),
      timeout: 60000,
    });

    return {
      downloadLink: response.data.downloadLink,
      message: response.data.message,
    };
  }

  async cleanMarkdown(content) {
    return content
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\s+$/gm, "")
      .replace(/^[\s]*#/gm, "#")
      .replace(/\*{4,}/g, "***")
      .replace(/_{4,}/g, "___")
      .replace(/`{4,}/g, "```")
      .trim();
  }

  async ensureHeading(fileName, content) {
    const hasHeading = /^\s*#{1,6}\s/.test(content);
    
    if (hasHeading) {
      return content;
    }

    const prompt = `This markdown content lacks a proper heading. Generate an appropriate H1 title based on the filename "${fileName}" and content preview:

${content.substring(0, 500)}

Return only the H1 heading line (e.g., # Title) without explanations.`;

    try {
      const response = await this.groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: process.env.LANGCHAIN_MODEL || "llama-3.3-70b-versatile",
        temperature: 0.3,
      });

      const aiTitle = response.choices[0].message.content.trim();
      return `${aiTitle}\n\n${content}`;
    } catch (error) {
      console.error("AI heading generation failed:", error);
      const fallbackTitle = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      return `# ${fallbackTitle}\n\n${content}`;
    }
  }

  async fixSyntax(content) {
    const prompt = `Fix markdown syntax issues in this content. Ensure proper formatting, valid structure, and clean markdown:

${content.substring(0, 1500)}

Return only the corrected markdown without explanations.`;

    try {
      const response = await this.groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: process.env.LANGCHAIN_MODEL || "llama-3.3-70b-versatile",
        temperature: 0.1,
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error("Markdown syntax fix failed:", error);
      return content;
    }
  }
}

module.exports = MarkdownAgent;
