# AI Agent Document Parser

An intelligent document processing system with specialized agents for different file types. The main agent detects file types and delegates to specialized agents for processing and DITA conversion.

## Architecture

### Main Agent
- **File Type Detection**: Uses Groq AI to intelligently detect file types
- **ZIP Extraction**: Handles ZIP files containing multiple documents
- **Agent Delegation**: Routes files to appropriate specialized agents

### Specialized Agents
- **HtmlAgent**: HTML cleanup, syntax fixing, and DITA conversion
- **MarkdownAgent**: Markdown formatting, syntax fixing, and DITA conversion  
- **DocxAgent**: DOCX extraction, content structuring, and DITA conversion

## Features

- **Multi-format Support**: HTML, Markdown, DOCX files and ZIP archives
- **AI-Powered Processing**: Each agent uses Groq AI for content cleanup and optimization
- **Specialized Processing**: Each file type gets tailored processing by its dedicated agent
- **Automatic API Routing**: Agents automatically call appropriate DITA conversion APIs
- **Web Interface**: Simple drag-and-drop file upload interface

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```
GROQ_API_KEY=your_groq_api_key
LANGCHAIN_MODEL=llama-3.3-70b-versatile
HTML_TO_DITA_API=http://localhost:3001/convert/html-to-dita
MARKDOWN_TO_DITA_API=http://localhost:8448/api/markdowntodita
DOCX_TO_DITA_API=http://localhost:3003/convert/docx-to-dita
```

3. Start the server:
```bash
npm start
```

4. Open http://localhost:3000 in your browser

## Processing Flow

1. **File Upload** → Main Agent receives file
2. **Type Detection** → AI analyzes content to determine file type
3. **Agent Selection** → Routes to htmlAgent, markdownAgent, or docxAgent
4. **Specialized Processing** → Each agent performs:
   - Content cleanup
   - Syntax fixing
   - Structure optimization
   - DITA conversion via API call
5. **Result Return** → Processed DITA content returned to user

## API Endpoints

### POST /process
Upload and process documents for DITA conversion.

**Response**: 
```json
{
  "success": true,
  "results": [
    {
      "name": "document.html",
      "type": "html",
      "status": "success",
      "ditaContent": "<?xml version=\"1.0\"...>",
      "processingSteps": ["html_cleanup", "syntax_fix", "dita_conversion"]
    }
  ],
  "summary": {
    "totalFiles": 1,
    "conversions": [{"type": "html", "status": "success"}]
  }
}
```

### GET /health
Health check endpoint

## Agent Responsibilities

### HtmlAgent
- Removes scripts, styles, and unwanted attributes
- Fixes HTML syntax issues using AI
- Calls HTML-to-DITA conversion API

### MarkdownAgent  
- Normalizes line endings and spacing
- Fixes markdown syntax issues using AI
- Calls Markdown-to-DITA conversion API

### DocxAgent
- Extracts content from DOCX files
- Structures content using AI
- Calls DOCX-to-DITA conversion API