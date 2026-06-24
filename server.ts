import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import apiApp from "./api/index.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(apiApp);

// 3. Integrate Express + Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware integrated.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Serving static production assets from dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`StudyQueries server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
