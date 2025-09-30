# AI Agent Document Parser - Flow Diagram

```mermaid
flowchart TD
    A[User Uploads File] --> B{File Type?}
    
    B -->|Single File| C[Main Agent Receives File]
    B -->|ZIP Archive| D[Extract ZIP Contents]
    D --> E[Process Each File in ZIP]
    E --> C
    
    C --> F[AI File Type Detection<br/>Using Groq AI]
    
    F --> G{Detected Type?}
    
    G -->|HTML| H[Route to HtmlAgent]
    G -->|Markdown| I[Route to MarkdownAgent]
    G -->|DOCX| J[Route to DocxAgent]
    G -->|Unknown| K[Return Error]
    
    H --> H1[HTML Processing]
    H1 --> H2[Remove Scripts & Styles]
    H2 --> H3[Fix HTML Syntax with AI]
    H3 --> H4[Clean Content]
    
    I --> I1[Markdown Processing]
    I1 --> I2[Normalize Line Endings]
    I2 --> I3[Fix Markdown Syntax with AI]
    I3 --> I4[Clean Content]
    
    J --> J1[DOCX Processing]
    J1 --> J2[Extract DOCX Content]
    J2 --> J3[Structure Content with AI]
    J3 --> J4[Clean Content]
    
    H4 --> L[ConversionRouter]
    I4 --> L
    J4 --> L
    
    L --> M{API Available?}
    
    M -->|Yes| N[Call Appropriate API]
    M -->|No| O[Generate Mock DITA]
    
    N --> N1{API Type?}
    N1 -->|HTML| N2[HTML-to-DITA API<br/>localhost:3001]
    N1 -->|Markdown| N3[Markdown-to-DITA API<br/>localhost:8448]
    N1 -->|DOCX| N4[DOCX-to-DITA API<br/>localhost:3003]
    
    N2 --> P[DITA Content Generated]
    N3 --> P
    N4 --> P
    O --> P
    
    P --> Q[Compile Results]
    Q --> R[Return JSON Response]
    
    R --> S[User Receives:<br/>- DITA Content<br/>- Processing Steps<br/>- Conversion Summary]
    
    K --> T[Error Response]
    
    style A fill:#e1f5fe
    style S fill:#c8e6c9
    style T fill:#ffcdd2
    style F fill:#fff3e0
    style H fill:#f3e5f5
    style I fill:#e8f5e8
    style J fill:#fff8e1
    style L fill:#e3f2fd
```

## Process Flow Description

### 1. File Upload Stage
- User uploads file(s) through web interface
- System handles both single files and ZIP archives
- ZIP files are extracted and each contained file is processed individually

### 2. Main Agent Processing
- Receives uploaded file(s)
- Uses Groq AI for intelligent file type detection
- Routes files to appropriate specialized agents

### 3. Specialized Agent Processing

#### HtmlAgent
- Removes unwanted scripts, styles, and attributes
- Uses AI to fix HTML syntax issues
- Prepares clean HTML content

#### MarkdownAgent
- Normalizes line endings and spacing
- Uses AI to fix markdown syntax issues
- Prepares clean markdown content

#### DocxAgent
- Extracts content from DOCX files
- Uses AI to structure content properly
- Prepares clean structured content

### 4. DITA Conversion
- ConversionRouter handles API calls
- Routes to appropriate conversion API based on file type
- Falls back to mock DITA generation if APIs unavailable

### 5. Result Compilation
- Aggregates all processing results
- Compiles conversion summary
- Returns structured JSON response with DITA content

## API Endpoints Used
- **HTML to DITA**: `http://localhost:3001/convert/html-to-dita`
- **Markdown to DITA**: `http://localhost:8448/api/markdowntodita`
- **DOCX to DITA**: `http://localhost:3003/convert/docx-to-dita`

## Key Features
- **AI-Powered**: Uses Groq AI for content analysis and cleanup
- **Fault Tolerant**: Handles API unavailability with mock responses
- **Multi-Format**: Supports HTML, Markdown, DOCX, and ZIP files
- **Specialized Processing**: Each file type gets tailored treatment