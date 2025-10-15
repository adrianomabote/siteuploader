import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import path from "path";
import webpush from "web-push";

const connectedClients = new Set<Response>();
let ultimasVelas: number[] = [2.30, 1.89, 1.45, 1.07]; // 4 velas: [0]=2.30 (recente) ... [3]=1.07 (antiga)
let ultimoSinal: any = null;
let ultimoResultado: any = null;
let servidorSinaisOnline = false;
let sinalAtivo: any = null;

// Armazenar assinaturas push
const pushSubscriptions = new Set<any>();

// Configurar VAPID keys
const VAPID_PUBLIC_KEY = "BMryeCT-jm7BXhf_KiZ1YZqcZmBqWqyW3D4uZqRh9b6cJcDXfxXl8qE5uF3yNf0zZi4fE2w1nIvXKJ8L8dYqvCU";
const VAPID_PRIVATE_KEY = "uHx8YHqGKH6BLqWJp3JQQx3mYJKBLJKQp8LJKXmYJKQ";

webpush.setVapidDetails(
  'mailto:admin@cashout.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

function broadcast(event: string, data: any) {
  const message = JSON.stringify({ event, data });
  connectedClients.forEach(client => {
    client.write(`data: ${message}\n\n`);
  });
}

// Enviar notificação push para todos os inscritos
async function sendPushNotification(title: string, body: string) {
  const payload = JSON.stringify({ title, body });
  
  const deadSubscriptions: any[] = [];
  const subscriptionsArray = Array.from(pushSubscriptions);
  
  for (const subscription of subscriptionsArray) {
    try {
      await webpush.sendNotification(subscription, payload);
      console.log(`📱 Push enviado: ${title}`);
    } catch (error: any) {
      console.error('❌ Erro ao enviar push:', error);
      // Se a inscrição expirou ou é inválida, marcar para remoção
      if (error.statusCode === 404 || error.statusCode === 410) {
        deadSubscriptions.push(subscription);
      }
    }
  }
  
  // Remover inscrições inválidas
  deadSubscriptions.forEach(sub => pushSubscriptions.delete(sub));
}



// ❌ ANÁLISE DE PADRÕES DESATIVADA - Apenas exibir velas reais
// O sistema agora funciona em modo PURO: só mostra as velas capturadas do Aviator

// Sistema de recebimento de velas do Aviator (via script console)
function iniciarSistemaAviator() {
  console.log("🚀 Sistema de Captura Aviator ATIVADO!");
  console.log("📡 Aguardando velas do script no console do Aviator");
  console.log("⚡ Atualização: A cada nova vela recebida");
  console.log("📍 Endpoint: POST /api/vela");
  
  if (!servidorSinaisOnline) {
    servidorSinaisOnline = true;
    broadcast("servidor_status", { online: true });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Servir arquivos estáticos da pasta public
  app.use(express.static(path.join(process.cwd(), 'public')));

  // API: Online count
  app.get("/api/online", (req, res) => {
    res.json({ ok: true, online: connectedClients.size });
  });

  // API: SSE Stream
  app.get("/api/stream", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    connectedClients.add(res);

    // Enviar contagem inicial
    res.write(`data: ${JSON.stringify({ event: "online", data: { count: connectedClients.size } })}\n\n`);
    
    // Broadcast para todos sobre novo usuário online
    broadcast("online", { count: connectedClients.size });

    // Heartbeat a cada 30s
    const heartbeat = setInterval(() => {
      res.write(`:heartbeat\n\n`);
    }, 30000);

    req.on("close", () => {
      clearInterval(heartbeat);
      connectedClients.delete(res);
      broadcast("online", { count: connectedClients.size });
    });
  });

  // API: Obter velas atuais
  app.get("/api/velas", (req, res) => {
    res.json({ ok: true, velas: ultimasVelas });
  });

  // API: Enviar novo sinal (para teste/bot)
  app.post("/api/sinal", express.json(), (req, res) => {
    const { apos_de, cashout, max_gales } = req.body;
    ultimoSinal = { apos_de, cashout, max_gales, ts: new Date().toISOString() };
    broadcast("sinal", ultimoSinal);
    res.json({ ok: true });
  });

  // API: Enviar resultado (para teste/bot)
  app.post("/api/resultado", express.json(), (req, res) => {
    const { status, vela_final, id } = req.body;
    ultimoResultado = { 
      status, 
      vela_final, 
      id: id || Date.now().toString(),
      ts: new Date().toISOString() 
    };
    broadcast("resultado", ultimoResultado);
    res.json({ ok: true });
  });

  // API: Receber sinais do Aviator (enviado pelo código no console)
  app.post("/api/sinais", express.json(), (req, res) => {
    const { rodadas } = req.body;
    
    if (!Array.isArray(rodadas)) {
      return res.status(400).json({ ok: false, error: "Formato inválido" });
    }
    
    const sinaisProcessados = rodadas
      .map((valor: string | number) => {
        if (typeof valor === 'string') {
          return parseFloat(valor.replace('x', ''));
        }
        return Number(valor);
      })
      .filter((num: number) => !isNaN(num))
      .slice(0, 5);
    
    if (sinaisProcessados.length > 0) {
      ultimasVelas = sinaisProcessados;
      broadcast("velas", { velas: ultimasVelas });
      console.log("✅ Sinais recebidos:", ultimasVelas);
      
      if (!servidorSinaisOnline) {
        servidorSinaisOnline = true;
        broadcast("servidor_status", { online: true });
      }
    }
    
    res.json({ ok: true });
  });

  // API: Obter sinais do Aviator (para página aviator-sinais.html)
  app.get("/api/sinais-aviator", (req, res) => {
    res.json(ultimasVelas);
  });

  // API: Visualizar velas atuais (GET)
  app.get("/api/vela", (req, res) => {
    res.json({ 
      ok: true, 
      velas: ultimasVelas.slice(0, 4),
      timestamp: new Date().toISOString()
    });
  });

  // API: Receber velas do script Aviator
  app.post("/api/vela", express.json(), (req, res) => {
    const { valor, valores } = req.body;
    
    if (valores && Array.isArray(valores)) {
      const velasValidas = valores
        .map((v: any) => parseFloat(v))
        .filter((v: number) => !isNaN(v) && v >= 1.00 && v <= 99.99)
        .slice(0, 4);
      
      if (velasValidas.length >= 4) {
        ultimasVelas = velasValidas;
        
        broadcast("velas", { velas: ultimasVelas });
        console.log(`🎮 Velas Aviator: [${ultimasVelas.map(v => v.toFixed(2)).join(', ')}]`);
      }
    } else if (valor !== undefined && valor !== null) {
      const velaNum = parseFloat(valor);
      if (!isNaN(velaNum) && velaNum >= 1.00 && velaNum <= 99.99) {
        ultimasVelas = [velaNum, ...ultimasVelas.slice(0, 3)];
        
        broadcast("velas", { velas: ultimasVelas });
        console.log(`🎮 Vela Aviator: ${velaNum.toFixed(2)}x`);
      }
    }
    
    res.json({ ok: true, velas: ultimasVelas });
  });

  // API: Obter último histórico
  app.get("/api/ultimo-historico", (req, res) => {
    // Só retorna histórico se houver tanto resultado quanto sinal válidos
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

  // API: Push notification subscription
  app.post("/api/subscribe", express.json(), (req, res) => {
    const subscription = req.body;
    pushSubscriptions.add(subscription);
    console.log(`✅ Push subscription adicionada! Total: ${pushSubscriptions.size}`);
    res.json({ ok: true });
  });

  // VAPID public key (placeholder - deve ser gerado)
  app.get("/vapidPublicKey.txt", (req, res) => {
    res.type("text/plain");
    res.send("BMryeCT-jm7BXhf_KiZ1YZqcZmBqWqyW3D4uZqRh9b6cJcDXfxXl8qE5uF3yNf0zZi4fE2w1nIvXKJ8L8dYqvCU");
  });

  // Fallback para SPA - todas as outras rotas retornam index.html
  app.get("*", (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
  });

  const httpServer = createServer(app);

  iniciarSistemaAviator();

  return httpServer;
}
