// server/index.ts
import express3 from "express";

// server/routes.ts
import express from "express";
import { createServer } from "http";
import path from "path";
import webpush from "web-push";
var connectedClients = /* @__PURE__ */ new Set();
var ultimasVelas = [2.3, 1.89, 1.45, 1.07];
var ultimoSinal = null;
var ultimoResultado = null;
var servidorSinaisOnline = false;
var pushSubscriptions = /* @__PURE__ */ new Set();
var VAPID_PUBLIC_KEY = "BMryeCT-jm7BXhf_KiZ1YZqcZmBqWqyW3D4uZqRh9b6cJcDXfxXl8qE5uF3yNf0zZi4fE2w1nIvXKJ8L8dYqvCU";
var VAPID_PRIVATE_KEY = "uHx8YHqGKH6BLqWJp3JQQx3mYJKBLJKQp8LJKXmYJKQ";
webpush.setVapidDetails(
  "mailto:admin@cashout.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);
function broadcast(event, data) {
  const message = JSON.stringify({ event, data });
  connectedClients.forEach((client) => {
    client.write(`data: ${message}

`);
  });
}
function iniciarSistemaAutomatico() {
  console.log("\u23F8\uFE0F  Sistema de gera\xE7\xE3o autom\xE1tica DESATIVADO pelo usu\xE1rio");
  console.log("\u{1F4A1} Use o script de console para capturar velas reais do Aviator");
}
async function registerRoutes(app2) {
  app2.use(express.static(path.join(process.cwd(), "public")));
  app2.get("/api/online", (req, res) => {
    res.json({ ok: true, online: connectedClients.size });
  });
  app2.get("/api/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    connectedClients.add(res);
    res.write(`data: ${JSON.stringify({ event: "online", data: { count: connectedClients.size } })}

`);
    broadcast("online", { count: connectedClients.size });
    const heartbeat = setInterval(() => {
      res.write(`:heartbeat

`);
    }, 12e4); // 2 minutos (120 segundos) - reduz 75% dos heartbeats
    req.on("close", () => {
      clearInterval(heartbeat);
      connectedClients.delete(res);
      broadcast("online", { count: connectedClients.size });
    });
  });
  app2.get("/api/velas", (req, res) => {
    res.json({ ok: true, velas: ultimasVelas });
  });
  app2.post("/api/sinal", express.json(), (req, res) => {
    const { apos_de, cashout, max_gales } = req.body;
    ultimoSinal = { apos_de, cashout, max_gales, ts: (/* @__PURE__ */ new Date()).toISOString() };
    broadcast("sinal", ultimoSinal);
    res.json({ ok: true });
  });
  app2.post("/api/resultado", express.json(), (req, res) => {
    const { status, vela_final, id } = req.body;
    ultimoResultado = {
      status,
      vela_final,
      id: id || Date.now().toString(),
      ts: (/* @__PURE__ */ new Date()).toISOString()
    };
    broadcast("resultado", ultimoResultado);
    res.json({ ok: true });
  });
  app2.post("/api/sinais", express.json(), (req, res) => {
    const { rodadas } = req.body;
    if (!Array.isArray(rodadas)) {
      return res.status(400).json({ ok: false, error: "Formato inv\xE1lido" });
    }
    const sinaisProcessados = rodadas.map((valor) => {
      if (typeof valor === "string") {
        return parseFloat(valor.replace("x", ""));
      }
      return Number(valor);
    }).filter((num) => !isNaN(num)).slice(0, 5);
    if (sinaisProcessados.length > 0) {
      ultimasVelas = sinaisProcessados;
      broadcast("velas", { velas: ultimasVelas });
      console.log("\u2705 Sinais recebidos:", ultimasVelas);
      if (!servidorSinaisOnline) {
        servidorSinaisOnline = true;
        broadcast("servidor_status", { online: true });
      }
    }
    res.json({ ok: true });
  });
  app2.get("/api/sinais-aviator", (req, res) => {
    res.json(ultimasVelas);
  });
  app2.post("/api/vela", express.json(), (req, res) => {
    const { valor, valores } = req.body;
    if (valores && Array.isArray(valores)) {
      ultimasVelas = valores.slice(0, 5);
      broadcast("velas", { velas: ultimasVelas });
    } else if (valor !== void 0 && valor !== null) {
      ultimasVelas.unshift(Number(valor));
      ultimasVelas = ultimasVelas.slice(0, 5);
      broadcast("vela", { vela: Number(valor) });
    }
    res.json({ ok: true, velas: ultimasVelas });
  });
  app2.get("/api/ultimo-historico", (req, res) => {
    if (ultimoResultado && ultimoSinal && ultimoSinal.apos_de && ultimoSinal.cashout) {
      res.json({
        ok: true,
        data: {
          ts: ultimoResultado.ts,
          status: ultimoResultado.status,
          vela_final: ultimoResultado.vela_final,
          apos_de: ultimoSinal.apos_de,
          cashout: ultimoSinal.cashout
        }
      });
    } else {
      res.json({ ok: false });
    }
  });
  app2.post("/api/subscribe", express.json(), (req, res) => {
    const subscription = req.body;
    pushSubscriptions.add(subscription);
    console.log(`\u2705 Push subscription adicionada! Total: ${pushSubscriptions.size}`);
    res.json({ ok: true });
  });
  app2.get("/vapidPublicKey.txt", (req, res) => {
    res.type("text/plain");
    res.send("BMryeCT-jm7BXhf_KiZ1YZqcZmBqWqyW3D4uZqRh9b6cJcDXfxXl8qE5uF3yNf0zZi4fE2w1nIvXKJ8L8dYqvCU");
  });
  app2.get("*", (req, res) => {
    res.sendFile(path.join(process.cwd(), "public", "index.html"));
  });
  const httpServer = createServer(app2);
  iniciarSistemaAutomatico();
  return httpServer;
}

// server/vite.ts
import express2 from "express";
import fs from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path2.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
