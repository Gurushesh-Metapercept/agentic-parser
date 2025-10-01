const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs-extra");
require("dotenv").config();

const MainAgent = require("../agents/mainAgent");

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/";
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, [".zip", ".docx"].includes(ext));
  },
});

app.use(express.json());
app.use(express.static("public"));

// Initialize main agent
const mainAgent = new MainAgent();

// Main endpoint for file processing
app.post("/process", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }



    // Process file using main agent
    const results = await mainAgent.processFile(req.file.path);
    const conversionResults = Array.isArray(results) ? results : [results];

    // Cleanup uploaded file
    await fs.remove(req.file.path);

    res.json({
      success: true,
      results: conversionResults,
      summary: {
        totalFiles: conversionResults.length,
        conversions: conversionResults.map((r) => ({
          type: r.type,
          status: r.status,
        })),
      },
    });
  } catch (error) {

    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`AI Agent Parser running on port ${PORT}`);
});
