const axios = require("axios");
const Groq = require("groq-sdk");

class MarkdownAgent {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
    this.preflightEndpoint = process.env.MARKDOWN_TO_DITA_PREFLIGHT_API;
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
    if (!this.preflightEndpoint || !this.apiEndpoint) {
      throw new Error('Markdown to DITA API endpoints not configured');
    }

    console.log(`Calling external conversion API for userId: ${userId}`);
    
    const FormData = require("form-data");
    
    // Step 1: Preflight check
    const preflightForm = new FormData();
    preflightForm.append("zipFile", zipBuffer, "cleaned_files.zip");
    preflightForm.append("userId", userId);

    await axios.post(this.preflightEndpoint, preflightForm, {
      headers: preflightForm.getHeaders(),
      timeout: 60000,
    });

    // Step 2: Main conversion
    const conversionForm = new FormData();
    conversionForm.append("userId", userId);

    const response = await axios.post(this.apiEndpoint, conversionForm, {
      headers: conversionForm.getHeaders(),
      timeout: 60000,
    });
    
    console.log(`Conversion completed successfully for userId: ${userId}`);

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
    // Look for frontmatter anywhere in the content
    const frontmatterMatch = content.match(/---\s*\n([\s\S]*?)\n---\s*\n/);
    
    if (frontmatterMatch) {
      // Extract frontmatter and reorganize content
      const frontmatter = frontmatterMatch[0];
      const beforeFrontmatter = content.substring(0, frontmatterMatch.index);
      const afterFrontmatter = content.substring(frontmatterMatch.index + frontmatter.length);
      
      // Combine all content except frontmatter
      const allContent = (beforeFrontmatter + afterFrontmatter).trim();
      
      // Check if there's already a heading in the content
      const hasHeading = /^\s*#{1,6}\s/.test(allContent);
      
      if (hasHeading) {
        // Move frontmatter to beginning, keep existing title
        return `${frontmatter}\n${allContent}`;
      }
      
      // Generate title and structure properly: frontmatter + title + content
      const prompt = `Generate an appropriate H1 title based on the filename "${fileName}" and content preview:\n\n${allContent.substring(0, 500)}\n\nReturn only the H1 heading line (e.g., # Title) without explanations.`;
      
      try {
        const response = await this.groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: process.env.LANGCHAIN_MODEL || "llama-3.3-70b-versatile",
          temperature: 0.3,
        });
        
        const aiTitle = response.choices[0].message.content.trim();
        return `${frontmatter}\n${aiTitle}\n\n${allContent}`;
      } catch (error) {
        const fallbackTitle = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        return `${frontmatter}\n# ${fallbackTitle}\n\n${allContent}`;
      }
    } else {
      // No frontmatter, check for heading at start
      const hasHeading = /^\s*#{1,6}\s/.test(content);
      
      if (hasHeading) {
        return content;
      }
      
      // Generate title and add at beginning
      const prompt = `Generate an appropriate H1 title based on the filename "${fileName}" and content preview:\n\n${content.substring(0, 500)}\n\nReturn only the H1 heading line (e.g., # Title) without explanations.`;
      
      try {
        const response = await this.groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: process.env.LANGCHAIN_MODEL || "llama-3.3-70b-versatile",
          temperature: 0.3,
        });
        
        const aiTitle = response.choices[0].message.content.trim();
        return `${aiTitle}\n\n${content}`;
      } catch (error) {
        const fallbackTitle = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        return `# ${fallbackTitle}\n\n${content}`;
      }
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
      return content;
    }
  }
}

module.exports = MarkdownAgent;
