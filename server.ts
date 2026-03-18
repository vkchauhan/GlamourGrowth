import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Serve static files from 'dist' in production, or 'public' in development
  const isProd = process.env.NODE_ENV === "production";
  const distPath = path.join(__dirname, 'dist');
  const publicPath = path.join(__dirname, 'public');

  if (isProd) {
    app.use(express.static(distPath));
  } else {
    // In dev, Vite handles most things, but we can serve public assets explicitly
    app.use(express.static(publicPath));
  }

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
      if (req.path.includes('.') && !req.path.endsWith('.html')) {
        return res.status(404).send('Not found');
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
