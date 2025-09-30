# AI Agent Parser - High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        UI[Web Interface<br/>index.html]
    end
    
    subgraph "Application Layer"
        SERVER[Express Server<br/>app.js]
        ROUTER[Conversion Router<br/>conversionRouter.js]
    end
    
    subgraph "Agent Layer"
        MAIN[Main Agent<br/>mainAgent.js]
        HTML[HTML Agent<br/>htmlAgent.js]
        MD[Markdown Agent<br/>markdownAgent.js]
        DOCX[DOCX Agent<br/>docxAgent.js]
    end
    
    subgraph "Utility Layer"
        PROC[Document Processor<br/>documentProcessor.js]
        ANALYZER[File Analyzer<br/>fileAnalyzer.js]
        DOCX_UTIL[DOCX Processor<br/>processDocxFile.js]
    end
    
    subgraph "External Services"
        GROQ[Groq AI API<br/>Content Analysis]
        API1[HTML-to-DITA API<br/>:3001]
        API2[Markdown-to-DITA API<br/>:8448]
        API3[DOCX-to-DITA API<br/>:3003]
    end
    
    subgraph "Storage"
        UPLOADS[File Uploads<br/>uploads/]
    end
    
    UI -->|File Upload| SERVER
    SERVER --> MAIN
    SERVER --> UPLOADS
    
    MAIN -->|Route by Type| HTML
    MAIN -->|Route by Type| MD
    MAIN -->|Route by Type| DOCX
    
    HTML --> PROC
    MD --> PROC
    DOCX --> DOCX_UTIL
    
    MAIN --> ANALYZER
    MAIN --> GROQ
    
    HTML --> GROQ
    MD --> GROQ
    DOCX --> GROQ
    
    SERVER --> ROUTER
    ROUTER --> API1
    ROUTER --> API2
    ROUTER --> API3
    
    style UI fill:#e3f2fd
    style SERVER fill:#f3e5f5
    style MAIN fill:#fff3e0
    style GROQ fill:#ffeb3b
    style UPLOADS fill:#e8f5e8
```

## Architecture Components

### Client Layer
- **Web Interface**: Drag-and-drop file upload UI

### Application Layer
- **Express Server**: Main HTTP server handling requests
- **Conversion Router**: Routes to appropriate DITA conversion APIs

### Agent Layer
- **Main Agent**: Orchestrates processing, AI type detection
- **HTML Agent**: Specialized HTML processing and cleanup
- **Markdown Agent**: Markdown formatting and syntax fixing
- **DOCX Agent**: DOCX extraction and content structuring

### Utility Layer
- **Document Processor**: Common document processing utilities
- **File Analyzer**: File analysis and validation utilities
- **DOCX Processor**: Specialized DOCX file handling

### External Services
- **Groq AI**: Content analysis and cleanup
- **DITA APIs**: Convert processed content to DITA format

### Storage
- **File Uploads**: Temporary storage for uploaded files