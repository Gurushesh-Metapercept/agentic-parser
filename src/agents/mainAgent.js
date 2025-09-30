const fs = require('fs-extra');
const path = require('path');
const JSZip = require('jszip');
const Groq = require('groq-sdk');
const { v4: uuidv4 } = require('uuid');

const HtmlAgent = require('./htmlAgent');
const MarkdownAgent = require('./markdownAgent');
const DocxAgent = require('./docxAgent');

class MainAgent {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    
    this.agents = {
      html: new HtmlAgent(),
      markdown: new MarkdownAgent(),
      docx: new DocxAgent()
    };
  }

  async processFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.zip') {
      return await this.processZipFile(filePath);
    } else if (ext === '.docx') {
      return await this.processDocxFile(filePath);
    }
    
    throw new Error('Unsupported file type');
  }

  async processZipFile(zipPath) {
    const zipData = await fs.readFile(zipPath);
    const zip = await JSZip.loadAsync(zipData);
    const userId = uuidv4();

    // Step 1: Check first 5 HTML/MD files for type verification (including nested folders)
    const sampleFiles = [];
    let sampleCount = 0;
    
    for (const [filename, file] of Object.entries(zip.files)) {
      if (!file.dir && sampleCount < 5) {
        const ext = path.extname(filename).toLowerCase();
        if (['.html', '.htm', '.md'].includes(ext)) {
          console.log(`Checking file for type verification: ${filename}`);
          const content = await file.async('string');
          const fileType = await this.detectFileType(content, ext);
          sampleFiles.push({ filename, fileType });
          sampleCount++;
        }
      }
    }

    if (sampleFiles.length === 0) {
      throw new Error('No valid HTML or Markdown files found in ZIP');
    }

    // Step 2: Determine dominant file type from samples
    const typeCount = sampleFiles.reduce((acc, file) => {
      acc[file.fileType] = (acc[file.fileType] || 0) + 1;
      return acc;
    }, {});
    
    const dominantType = Object.keys(typeCount).reduce((a, b) => 
      typeCount[a] > typeCount[b] ? a : b
    );

    // Step 3: Process ALL HTML/MD files and include ALL other files (including nested folders)
    const processedFiles = [];
    const otherFiles = [];
    
    for (const [filename, file] of Object.entries(zip.files)) {
      if (!file.dir) {
        const ext = path.extname(filename).toLowerCase();
        if (['.html', '.htm', '.md'].includes(ext)) {
          console.log(`Processing HTML/MD file: ${filename}`);
          const content = await file.async('string');
          processedFiles.push({ filename, content, fileType: dominantType });
        } else {
          // Include other files (images, css, js, etc.) from all folders for internal linking
          console.log(`Including asset file: ${filename}`);
          const content = await file.async('nodebuffer');
          otherFiles.push({ filename, content, isAsset: true });
        }
      }
    }
    
    const allFiles = [...processedFiles, ...otherFiles];

    const result = await this.processFileGroup(allFiles, dominantType, userId);
    return [result];
  }

  async detectFileType(content, extension) {
    const prompt = `Analyze this document and determine its type. Consider the extension "${extension}" and content structure.

Content preview:
${content.substring(0, 300)}

Respond with exactly one word: "html", "markdown", or "docx"`;

    try {
      const response = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: process.env.LANGCHAIN_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.1
      });

      const detectedType = response.choices[0].message.content.trim().toLowerCase();
      return ['html', 'markdown', 'docx'].includes(detectedType) ? detectedType : this.fallbackTypeDetection(extension);
    } catch (error) {
      console.error('AI type detection failed:', error);
      return this.fallbackTypeDetection(extension);
    }
  }

  fallbackTypeDetection(extension) {
    if (extension === '.md') return 'markdown';
    if (['.html', '.htm'].includes(extension)) return 'html';
    if (extension === '.docx') return 'docx';
    return 'html';
  }

  async processFileGroup(allFiles, fileType, userId) {
    const agent = this.agents[fileType];
    
    if (!agent) {
      throw new Error(`No agent available for file type: ${fileType}`);
    }

    const processableFiles = allFiles.filter(f => !f.isAsset);
    const assetFiles = allFiles.filter(f => f.isAsset);
    
    console.log(`Processing ${processableFiles.length} ${fileType} files and ${assetFiles.length} asset files`);
    
    // Clean HTML/MD files with the agent
    const cleanedFiles = [];
    for (const file of processableFiles) {
      const cleaned = await agent.cleanAndProcess(file.filename, file.content);
      cleanedFiles.push(cleaned);
    }
    
    // Combine cleaned files with asset files
    const allFilesForZip = [...cleanedFiles, ...assetFiles];

    // Create ZIP with cleaned files + all assets
    const cleanedZip = await this.createCleanedZip(allFilesForZip);
    
    // Send to conversion API
    try {
      const conversionResult = await agent.convertToApi(cleanedZip, userId);
      
      return {
        fileType,
        fileCount: processableFiles.length,
        assetCount: assetFiles.length,
        status: 'success',
        downloadLink: conversionResult.downloadLink,
        message: conversionResult.message
      };
    } catch (error) {
      return {
        fileType,
        fileCount: processableFiles.length,
        assetCount: assetFiles.length,
        status: 'failed',
        error: error.message
      };
    }
  }

  async createCleanedZip(allFiles) {
    const zip = new JSZip();
    
    allFiles.forEach(file => {
      if (file.isAsset) {
        // Add asset files (images, css, etc.) preserving folder structure
        zip.file(file.filename, file.content);
      } else {
        // Add cleaned HTML/MD files preserving folder structure
        zip.file(file.filename, file.cleanedContent);
      }
    });
    
    return await zip.generateAsync({ type: 'nodebuffer' });
  }

  async processDocxFile(filePath) {
    const userId = uuidv4();
    const fileName = path.basename(filePath);
    
    // Read DOCX file as buffer
    const docxBuffer = await fs.readFile(filePath);
    
    // Process with DocxAgent
    const agent = this.agents.docx;
    const cleaned = await agent.cleanAndProcess(fileName, docxBuffer);
    
    // Create ZIP with single cleaned DOCX
    const cleanedZip = await this.createCleanedZip([cleaned]);
    
    // Send to conversion API
    try {
      const conversionResult = await agent.convertToApi(cleanedZip, userId);
      
      return [{
        fileType: 'docx',
        fileCount: 1,
        status: 'success',
        downloadLink: conversionResult.downloadLink,
        message: conversionResult.message
      }];
    } catch (error) {
      return [{
        fileType: 'docx',
        fileCount: 1,
        status: 'failed',
        error: error.message
      }];
    }
  }
}

module.exports = MainAgent;