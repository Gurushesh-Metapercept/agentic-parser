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
    const conversionResult = await agent.convertToApi(cleanedZip, userId);
    
    return [{
      fileType: 'docx',
      fileCount: 1,
      status: 'success',
      downloadLink: conversionResult.downloadLink,
      message: conversionResult.message
    }];
  }