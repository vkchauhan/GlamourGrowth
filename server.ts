import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Serve static files from 'dist' in production, or 'public' in development
  const isProd = process.env.NODE_ENV === "production";
  const root = process.cwd();
  const distPath = path.join(root, 'dist');
  const publicPath = path.join(root, 'public');

  if (isProd) {
    console.log(`Serving static files from: ${distPath}`);
    app.use(express.static(distPath, {
      maxAge: '1d',
      setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    }));
    // Fallback to public folder
    app.use(express.static(publicPath));
  } else {
    app.use(express.static(publicPath));
  }

  // Explicit route for icons to ensure correct headers for Bubblewrap/PWA
  app.get(['/icons/:name', '/apple-touch-icon.png', '/favicon.ico'], (req, res, next) => {
    const name = req.params.name || path.basename(req.path);
    const iconPath = req.path.includes('/icons/') 
      ? path.join(publicPath, 'icons', name)
      : path.join(publicPath, name);

    console.log(`Requesting icon: ${name} at ${iconPath}`);
    
    if (fs.existsSync(iconPath)) {
      // Set explicit headers to satisfy Bubblewrap and other PWA tools
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.sendFile(iconPath);
    }
    
    // If icon is missing, return 404 instead of falling through to SPA fallback
    res.status(404).send(`Icon not found: ${name}`);
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/daily-growth-task", async (req, res) => {
    // In a real app, this would fetch from Firestore using firebase-admin
    res.json({ 
      task_id: "api_mock_task",
      title_en: "Check your insights",
      title_hi: "Apne insights check karein",
      body_en: "Review your business performance for the last 30 days.",
      body_hi: "Pichle 30 dino ki business performance check karein.",
      status: "pending",
      points: 10
    });
  });

  app.post("/api/daily-growth-task/complete", async (req, res) => {
    const { task_id } = req.body;
    res.json({ success: true, task_id, awarded_points: 10 });
  });

  // Vite middleware for development
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.get('*', (req, res) => {
      // SPA Fallback: Only serve index.html for non-file requests
      // This prevents returning HTML for missing images/icons
      const ext = path.extname(req.path).toLowerCase();
      if (ext && ext !== '.html') {
        return res.status(404).send(`File not found: ${req.path}`);
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
