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
var sinalAtivo = null;
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
async function sendPushNotification(title, body) {
  const payload = JSON.stringify({ title, body });
  const deadSubscriptions = [];
  const subscriptionsArray = Array.from(pushSubscriptions);
  for (const subscription of subscriptionsArray) {
    try {
      await webpush.sendNotification(subscription, payload);
      console.log(`\u{1F4F1} Push enviado: ${title}`);
    } catch (error) {
      console.error("\u274C Erro ao enviar push:", error);
      if (error.statusCode === 404 || error.statusCode === 410) {
        deadSubscriptions.push(subscription);
      }
    }
  }
  deadSubscriptions.forEach((sub) => pushSubscriptions.delete(sub));
}
function analisarPadrao(velas) {
  if (velas.length < 3) return null;
  const ultimaVela = velas[velas.length - 1];
  const ultimasTres = velas.slice(-3);
  const ultimasQuatro = velas.slice(-4);
  const media = ultimasTres.reduce((a, b) => a + b, 0) / ultimasTres.length;
  const baixas = ultimasTres.filter((v) => v < 2).length;
  const muitoBaixas = ultimasQuatro.filter((v) => v < 1.5).length;
  if (ultimaVela < 1.5 && baixas >= 2) {
    const cashout = Math.random() < 0.75 ? 2 : 3;
    return {
      deveSinalizar: true,
      apos_de: ultimaVela,
      cashout,
      max_gales: 2
    };
  }
  if (muitoBaixas >= 2 && ultimaVela < 2) {
    const cashout = Math.random() < 0.8 ? 2 : 3;
    return {
      deveSinalizar: true,
      apos_de: ultimaVela,
      cashout,
      max_gales: 1
    };
  }
  if (media < 2 && ultimaVela < 1.8) {
    const cashout = Math.random() < 0.7 ? 2 : 3;
    return {
      deveSinalizar: true,
      apos_de: ultimaVela,
      cashout,
      max_gales: 2
    };
  }
  return null;
}
async function buscarVelasReais() {
  try {
    const response = await fetch("https://fonte-de-sinais.replit.app/api/sinais");
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const velasNumericas = data.map(
        (v) => parseFloat(v.toString().replace("x", ""))
      );
      const velasOrdenadas = velasNumericas.slice(0, 4);
      const velaNovaRecente = velasOrdenadas[0];
      const velaAnteriorRecente = ultimasVelas.length > 0 ? ultimasVelas[0] : null;
      if (ultimasVelas.length === 0 || velaAnteriorRecente !== velaNovaRecente) {
        const snapshotAnterior = [...ultimasVelas];
        ultimasVelas = velasOrdenadas;
        broadcast("velas", { velas: ultimasVelas });
        console.log(`\u{1F3B2} Velas: [${ultimasVelas.map((v) => v.toFixed(2)).join(", ")}]`);
        if (velaAnteriorRecente !== null && velaAnteriorRecente !== velaNovaRecente) {
          processarNovaVela(snapshotAnterior, velaNovaRecente);
        }
      }
      if (!servidorSinaisOnline) {
        servidorSinaisOnline = true;
        broadcast("servidor_status", { online: true });
        console.log("\u2705 Conectado ao servidor de sinais!");
      }
    }
  } catch (error) {
    console.error("\u274C Erro ao buscar velas:", error);
    if (servidorSinaisOnline) {
      servidorSinaisOnline = false;
      broadcast("servidor_status", { online: false });
    }
  }
}
function processarNovaVela(snapshotAnterior, novaVela) {
  if (!sinalAtivo) {
    if (snapshotAnterior.length === 0) return;
    const analise = analisarPadrao(snapshotAnterior);
    if (analise && analise.deveSinalizar) {
      const velaDaEsquerda = ultimasVelas[0];
      broadcast("limpar_entrada", {});
      console.log("\u{1F9F9} Limpando entrada antes do novo sinal");
      setTimeout(() => {
        ultimoSinal = {
          apos_de: velaDaEsquerda,
          cashout: analise.cashout,
          max_gales: analise.max_gales,
          ts: (/* @__PURE__ */ new Date()).toISOString()
        };
        sinalAtivo = {
          ...ultimoSinal,
          velaInicial: velaDaEsquerda,
          tentativas: 0,
          id: Date.now().toString()
        };
        broadcast("sinal", ultimoSinal);
        console.log(`\u{1F3AF} Sinal: Depois de ${velaDaEsquerda.toFixed(2)}x | Cashout ${ultimoSinal.cashout.toFixed(2)}x`);
        sendPushNotification(
          "Entrada confirmada",
          `Depois de ${novaVela.toFixed(2)}x \u2022 Cashout ${ultimoSinal.cashout.toFixed(2)}x`
        );
        setTimeout(() => {
          if (sinalAtivo && sinalAtivo.id === ultimoSinal.id && sinalAtivo.tentativas === 0) {
            broadcast("limpar_entrada", { id: sinalAtivo.id });
            console.log("\u23F0 Entrada expirada (sem nova vela)");
            sinalAtivo = null;
          }
        }, 15e3);
      }, 500);
    }
  } else {
    if (!sinalAtivo.id || !sinalAtivo.cashout) {
      console.log("\u26A0\uFE0F PROTE\xC7\xC3O: Tentativa de validar resultado sem sinal ativo v\xE1lido");
      sinalAtivo = null;
      return;
    }
    if (novaVela >= sinalAtivo.cashout) {
      ultimoResultado = {
        status: "green",
        vela_final: novaVela,
        id: sinalAtivo.id,
        ts: (/* @__PURE__ */ new Date()).toISOString()
      };
      broadcast("resultado", ultimoResultado);
      console.log(`\u2705 GREEN! Vela: ${novaVela.toFixed(2)}x (Alvo: ${sinalAtivo.cashout.toFixed(2)}x)`);
      sendPushNotification(
        "\u2705 GREEN!",
        `Vit\xF3ria confirmada ${novaVela.toFixed(2)}x`
      );
      broadcast("limpar_entrada", { id: sinalAtivo.id });
      console.log("\u{1F9F9} Entrada limpa ap\xF3s GREEN");
      sinalAtivo = null;
    } else {
      ultimoResultado = {
        status: "loss",
        vela_final: novaVela,
        id: sinalAtivo.id,
        ts: (/* @__PURE__ */ new Date()).toISOString()
      };
      broadcast("resultado", ultimoResultado);
      console.log(`\u274C LOSS! Vela: ${novaVela.toFixed(2)}x (Alvo: ${sinalAtivo.cashout.toFixed(2)}x)`);
      sendPushNotification(
        "\u274C LOSS",
        `Tentativas esgotadas ${novaVela.toFixed(2)}x`
      );
      broadcast("limpar_entrada", { id: sinalAtivo.id });
      console.log("\u{1F9F9} Entrada limpa ap\xF3s LOSS");
      sinalAtivo = null;
    }
  }
}
function iniciarSistemaAutomatico() {
  console.log("\u{1F916} Sistema iniciado - buscando velas reais do Aviator...");
  buscarVelasReais();
  setInterval(buscarVelasReais, 2e3);
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
    }, 3e4);
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
