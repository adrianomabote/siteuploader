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



// ✅ ANÁLISE AUTOMÁTICA DE PADRÕES - ATIVADA
function analisarPadrao(velas: number[]): { deve_sinalizar: boolean; apos_de: number; cashout: number; max_gales: number } | null {
  if (velas.length < 4) return null;
  
  const [v1, v2, v3, v4] = velas.slice(0, 4);
  const media = (v1 + v2 + v3 + v4) / 4;
  const baixas = velas.filter(v => v < 2.0).length;
  
  // 🔴 PADRÃO 1: 3+ velas baixas consecutivas (< 2.0) = Sinal 2.0x/3.0x
  if (baixas >= 3) {
    console.log("🎯 PADRÃO DETECTADO: 3+ velas baixas - Sinal 2.00x/3.00x");
    return { deve_sinalizar: true, apos_de: v1, cashout: 3.00, max_gales: 2 };
  }
  
  // 🟡 PADRÃO 2: Média baixa (< 2.5) = Sinal conservador 2.0x
  if (media < 2.5 && baixas >= 2) {
    console.log("🎯 PADRÃO DETECTADO: Média baixa - Sinal 2.00x");
    return { deve_sinalizar: true, apos_de: v1, cashout: 2.00, max_gales: 1 };
  }
  
  // 🟢 PADRÃO 3: Sequência crescente = Sinal moderado 3.5x
  if (v1 > v2 && v2 > v3 && v3 > v4 && media > 2.0) {
    console.log("🎯 PADRÃO DETECTADO: Sequência crescente - Sinal 3.50x");
    return { deve_sinalizar: true, apos_de: v1, cashout: 3.50, max_gales: 2 };
  }
  
  // 🔵 PADRÃO 4: Alta volatilidade (diferença > 5.0 entre máx e mín) = Sinal agressivo 6.0x
  const maxima = Math.max(...velas);
  const minima = Math.min(...velas);
  if ((maxima - minima) > 5.0 && baixas <= 1) {
    console.log("🎯 PADRÃO DETECTADO: Alta volatilidade - Sinal 6.00x");
    return { deve_sinalizar: true, apos_de: v1, cashout: 6.00, max_gales: 1 };
  }
  
  // 🟣 PADRÃO 5: Vela muito alta detectada (> 10.0) = Sinal ROSA 10.0x
  if (velas.some(v => v > 10.0)) {
    console.log("🎯 PADRÃO DETECTADO: Vela alta - Sinal ROSA 10.00x");
    return { deve_sinalizar: true, apos_de: v1, cashout: 10.00, max_gales: 0 };
  }
  
  return null;
}

// Sistema de recebimento de velas do Aviator (via script console)
function iniciarSistemaAviator() {
  console.log("🚀 Sistema de Captura Aviator ATIVADO!");
  console.log("📡 Aguardando velas do script no console do Aviator");
  console.log("⚡ Atualização: A cada nova vela recebida");
  console.log("📍 Endpoint: POST /api/vela");
  console.log("🤖 Análise automática de padrões: ATIVADA");
  
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
    
    const velasProcessadas: number[] = [];
    const velasRejeitadas: number[] = [];
    
    for (const valor of rodadas) {
      let num: number;
      
      if (typeof valor === 'string') {
        num = parseFloat(valor.replace('x', ''));
      } else {
        num = Number(valor);
      }
      
      // ✅ FILTRO INTELIGENTE: Rejeita apenas velas FALSAS (NaN, undefined, < 1.00)
      // ✅ ACEITA: Qualquer vela >= 1.00x (incluindo altas: 100x, 200x, 500x...)
      if (!isNaN(num) && num >= 1.00) {
        velasProcessadas.push(num);
      } else {
        velasRejeitadas.push(num);
      }
    }
    
    if (velasRejeitadas.length > 0) {
      console.log(`❌ Velas FALSAS rejeitadas: [${velasRejeitadas.map(v => isNaN(v) ? 'NaN/inválido' : v.toFixed(2)).join(', ')}]`);
    }
    
    if (velasProcessadas.length > 0) {
      ultimasVelas = velasProcessadas.slice(0, 5);
      broadcast("velas", { velas: ultimasVelas });
      console.log(`✅ Velas REAIS Aviator: [${ultimasVelas.map(v => v.toFixed(2)).join(', ')}]`);
      
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
      const velasProcessadas = valores.map((v: any) => parseFloat(v));
      const velasValidas: number[] = [];
      const velasRejeitadas: number[] = [];
      
      for (const v of velasProcessadas) {
        // ✅ FILTRO INTELIGENTE: Rejeita apenas velas FALSAS (NaN, undefined, < 1.00)
        // ✅ ACEITA: Qualquer vela >= 1.00x (incluindo altas: 100x, 200x, 500x...)
        if (!isNaN(v) && v >= 1.00) {
          velasValidas.push(v);
        } else {
          velasRejeitadas.push(v);
        }
      }
      
      if (velasRejeitadas.length > 0) {
        console.log(`❌ Velas FALSAS rejeitadas: [${velasRejeitadas.map(v => isNaN(v) ? 'NaN/inválido' : v.toFixed(2)).join(', ')}]`);
      }
      
      if (velasValidas.length >= 4) {
        ultimasVelas = velasValidas.slice(0, 4);
        
        broadcast("velas", { velas: ultimasVelas });
        console.log(`✅ Velas REAIS Aviator: [${ultimasVelas.map(v => v.toFixed(2)).join(', ')}]`);
        
        // 🤖 ANÁLISE AUTOMÁTICA DE PADRÕES
        const analise = analisarPadrao(ultimasVelas);
        if (analise && analise.deve_sinalizar) {
          ultimoSinal = {
            apos_de: analise.apos_de,
            cashout: analise.cashout,
            max_gales: analise.max_gales,
            ts: new Date().toISOString()
          };
          
          broadcast("sinal", ultimoSinal);
          
          // 📱 Enviar notificação push
          sendPushNotification(
            "🎯 NOVA ENTRADA!",
            `Entrar após ${analise.apos_de.toFixed(2)}x | Sair em ${analise.cashout.toFixed(2)}x`
          );
          
          console.log(`🚀 SINAL GERADO: ${analise.apos_de.toFixed(2)}x → ${analise.cashout.toFixed(2)}x (${analise.max_gales} gales)`);
        }
      }
    } else if (valor !== undefined && valor !== null) {
      const velaNum = parseFloat(valor);
      
      // ✅ FILTRO INTELIGENTE: Rejeita apenas velas FALSAS (NaN, undefined, < 1.00)
      // ✅ ACEITA: Qualquer vela >= 1.00x (incluindo altas: 100x, 200x, 500x...)
      if (!isNaN(velaNum) && velaNum >= 1.00) {
        ultimasVelas = [velaNum, ...ultimasVelas.slice(0, 3)];
        
        broadcast("velas", { velas: ultimasVelas });
        console.log(`✅ Vela REAL Aviator: ${velaNum.toFixed(2)}x`);
        
        // 🤖 ANÁLISE AUTOMÁTICA DE PADRÕES
        if (ultimasVelas.length >= 4) {
          const analise = analisarPadrao(ultimasVelas);
          if (analise && analise.deve_sinalizar) {
            ultimoSinal = {
              apos_de: analise.apos_de,
              cashout: analise.cashout,
              max_gales: analise.max_gales,
              ts: new Date().toISOString()
            };
            
            broadcast("sinal", ultimoSinal);
            
            // 📱 Enviar notificação push
            sendPushNotification(
              "🎯 NOVA ENTRADA!",
              `Entrar após ${analise.apos_de.toFixed(2)}x | Sair em ${analise.cashout.toFixed(2)}x`
            );
            
            console.log(`🚀 SINAL GERADO: ${analise.apos_de.toFixed(2)}x → ${analise.cashout.toFixed(2)}x (${analise.max_gales} gales)`);
          }
        }
      } else {
        console.log(`❌ Vela FALSA rejeitada: ${isNaN(velaNum) ? 'NaN/inválido' : velaNum.toFixed(2)}x (< 1.00)`);
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
