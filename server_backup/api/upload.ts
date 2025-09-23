import { Express } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure upload directory exists
const uploadDir = 'uploads/invoices';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

export function setupUploadRoutes(app: Express) {
  // Upload invoice PDF
  app.post("/api/upload/invoice", upload.single('file'), (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    // Only admin and superadmin can upload invoices
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.sendStatus(403);
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      success: true,
      filePath: `/uploads/invoices/${req.file.filename}`,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });
  });

  // Serve uploaded files
  app.get("/uploads/invoices/:filename", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Set appropriate headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
    // Send file
    res.sendFile(path.resolve(filePath));
  });
}