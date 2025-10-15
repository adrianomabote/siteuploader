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

function gerarVela(): number {
  const rand = Math.random();
  
  if (rand < 0.50) {
    return parseFloat((1.00 + Math.random() * 0.99).toFixed(2));
  } else if (rand < 0.80) {
    return parseFloat((2.00 + Math.random() * 2.00).toFixed(2));
  } else if (rand < 0.95) {
    return parseFloat((4.00 + Math.random() * 6.00).toFixed(2));
  } else {
    return parseFloat((10.00 + Math.random() * 40.00).toFixed(2));
  }
}

function analisarPadrao(velas: number[]): { deveSinalizar: boolean; apos_de: number; cashout: number; max_gales: number } | null {
  if (velas.length < 4) return null;
  
  const ultimaVela = velas[velas.length - 1];
  const todasVelas = velas;
  const ultimasQuatro = velas.slice(-4);
  const ultimasCinco = velas.length >= 5 ? velas.slice(-5) : velas;
  
  // ❌ REGRA 1: NÃO mandar se tiver 5 velas seguidas abaixo de 2.00x
  const velasAbaixoDe2 = ultimasCinco.filter(v => v < 2.00).length;
  if (ultimasCinco.length >= 5 && velasAbaixoDe2 >= 5) {
    console.log("⛔ Bloqueado: 5 velas abaixo de 2.00x");
    return null;
  }
  
  // 🎯 PADRÃO 1: Possível vela MUITO alta (>= 10.00x) - ROSA
  // Após sequência de médias/altas, pode vir uma EXPLOSÃO
  const velasMedias = ultimasQuatro.filter(v => v >= 2.00 && v < 5.00).length;
  const velasAltas = ultimasQuatro.filter(v => v >= 5.00).length;
  
  if (velasAltas >= 1 && velasMedias >= 2) {
    // Grande chance de vir uma vela ROSA (muito alta)
    return {
      deveSinalizar: true,
      apos_de: ultimaVela,
      cashout: 10.00,
      max_gales: 1
    };
  }
  
  // 🎯 PADRÃO 2: Possível vela alta (>= 6.00x)
  // Após 2-3 velas baixas/médias, pode vir uma alta
  const velasBaixas = ultimasQuatro.filter(v => v < 2.00).length;
  const media = ultimasQuatro.reduce((a, b) => a + b, 0) / ultimasQuatro.length;
  
  if (velasBaixas >= 2 && media < 3.00 && ultimaVela < 2.50) {
    // 30% de chance de pedir 6.00x, 70% de pedir 2-3x
    if (Math.random() < 0.30) {
      return {
        deveSinalizar: true,
        apos_de: ultimaVela,
        cashout: 6.00,
        max_gales: 1
      };
    }
  }
  
  // 🎯 PADRÃO 3: Possível 2.00x ou 3.00x (PADRÃO PRINCIPAL)
  // Última vela baixa (< 1.50x) com bom histórico
  if (ultimaVela < 1.50 && velasBaixas >= 1 && velasBaixas < 4) {
    const cashout = Math.random() < 0.60 ? 2.00 : 3.00;
    return {
      deveSinalizar: true,
      apos_de: ultimaVela,
      cashout: cashout,
      max_gales: 2
    };
  }
  
  // 🎯 PADRÃO 4: Após vela alta (>= 5.00x), vem média/baixa
  if (ultimaVela >= 5.00) {
    const cashout = Math.random() < 0.70 ? 2.00 : 3.00;
    return {
      deveSinalizar: true,
      apos_de: ultimaVela,
      cashout: cashout,
      max_gales: 2
    };
  }
  
  // 🎯 PADRÃO 5: Média baixa e última vela razoável
  if (media < 2.50 && ultimaVela >= 1.20 && ultimaVela < 2.50 && velasBaixas >= 1) {
    const cashout = Math.random() < 0.65 ? 2.00 : 3.00;
    return {
      deveSinalizar: true,
      apos_de: ultimaVela,
      cashout: cashout,
      max_gales: 2
    };
  }
  
  // 🎯 PADRÃO 6: Após vela média-alta, pode vir 2-3x
  if (ultimaVela >= 2.50 && ultimaVela < 5.00 && velasBaixas === 0) {
    const cashout = Math.random() < 0.50 ? 2.00 : 3.00;
    return {
      deveSinalizar: true,
      apos_de: ultimaVela,
      cashout: cashout,
      max_gales: 1
    };
  }
  
  // ⛔ Não sinalizar em outros casos
  return null;
}

async function buscarVelasReais() {
  try {
    const response = await fetch('https://fonte-de-sinais.replit.app/api/sinais');
    const data = await response.json();
    
    if (Array.isArray(data) && data.length > 0) {
      const velasNumericas = data.map((v: string) => 
        parseFloat(v.toString().replace('x', ''))
      );
      
      // Pegar as 4 primeiras velas (as mais recentes do servidor)
      // Servidor retorna: [recente, ..., antiga]
      const velasOrdenadas = velasNumericas.slice(0, 4);
      
      // Verificar se houve mudança na primeira vela (mais recente)
      const velaNovaRecente = velasOrdenadas[0];
      const velaAnteriorRecente = ultimasVelas.length > 0 ? ultimasVelas[0] : null;
      
      if (ultimasVelas.length === 0 || velaAnteriorRecente !== velaNovaRecente) {
        // Guardar snapshot anterior para análise
        const snapshotAnterior = [...ultimasVelas];
        
        // Atualizar array: [0]=recente ... [3]=antiga
        ultimasVelas = velasOrdenadas;
        
        // Broadcast
        broadcast("velas", { velas: ultimasVelas });
        console.log(`🎲 Velas: [${ultimasVelas.map(v => v.toFixed(2)).join(', ')}]`);
        
        // Se houve mudança = nova vela chegou
        if (velaAnteriorRecente !== null && velaAnteriorRecente !== velaNovaRecente) {
          processarNovaVela(snapshotAnterior, velaNovaRecente);
        }
      }
      
      if (!servidorSinaisOnline) {
        servidorSinaisOnline = true;
        broadcast("servidor_status", { online: true });
        console.log("✅ Conectado ao servidor de sinais!");
      }
    }
  } catch (error) {
    // Usar velas geradas localmente como fallback
    if (servidorSinaisOnline) {
      servidorSinaisOnline = false;
      broadcast("servidor_status", { online: false });
      console.log('⚠️ API externa indisponível - usando gerador local');
    }
    
    // Gerar nova vela localmente
    const novaVela = gerarVela();
    const snapshotAnterior = [...ultimasVelas];
    ultimasVelas = [novaVela, ...ultimasVelas.slice(0, 3)];
    
    broadcast("velas", { velas: ultimasVelas });
    console.log(`🎲 Velas (local): [${ultimasVelas.map(v => v.toFixed(2)).join(', ')}]`);
    
    if (snapshotAnterior.length > 0) {
      processarNovaVela(snapshotAnterior, novaVela);
    }
  }
}

function processarNovaVela(snapshotAnterior: number[], novaVela: number) {
  if (!sinalAtivo) {
    // Usar snapshot anterior para análise
    if (snapshotAnterior.length === 0) return;
    
    const analise = analisarPadrao(snapshotAnterior);
    
    if (analise && analise.deveSinalizar) {
      // Sinal "Depois de:" usa a vela mais recente (índice 0)
      const velaDaEsquerda = ultimasVelas[0];
      
      // SEMPRE limpar a entrada antes de mostrar novo sinal
      broadcast("limpar_entrada", {});
      console.log("🧹 Limpando entrada antes do novo sinal");
      
      // Pequeno delay para garantir que a limpeza foi processada
      setTimeout(() => {
        ultimoSinal = {
          apos_de: velaDaEsquerda,
          cashout: analise.cashout,
          max_gales: analise.max_gales,
          ts: new Date().toISOString()
        };
        
        sinalAtivo = {
          ...ultimoSinal,
          velaInicial: velaDaEsquerda,
          tentativas: 0,
          id: Date.now().toString()
        };
        
        broadcast("sinal", ultimoSinal);
        console.log(`🎯 Sinal: Depois de ${velaDaEsquerda.toFixed(2)}x | Cashout ${ultimoSinal.cashout.toFixed(2)}x`);
        
        // Enviar notificação push
        sendPushNotification(
          "Entrada confirmada",
          `Depois de ${novaVela.toFixed(2)}x • Cashout ${ultimoSinal.cashout.toFixed(2)}x`
        );
        
        // Limpar entrada após 15 segundos se não houver nova vela
        setTimeout(() => {
          if (sinalAtivo && sinalAtivo.id === ultimoSinal.id && sinalAtivo.tentativas === 0) {
            broadcast("limpar_entrada", { id: sinalAtivo.id });
            console.log("⏰ Entrada expirada (sem nova vela)");
            sinalAtivo = null;
          }
        }, 15000);
      }, 500); // Delay de 500ms para garantir que a limpeza seja processada primeiro
    }
  } else {
    // Validar APENAS com a primeira vela que chega após a entrada
    if (!sinalAtivo.id || !sinalAtivo.cashout) {
      console.log("⚠️ PROTEÇÃO: Tentativa de validar resultado sem sinal ativo válido");
      sinalAtivo = null;
      return;
    }
    
    // Confirma GREEN ou LOSS com a primeira vela recebida
    if (novaVela >= sinalAtivo.cashout) {
      ultimoResultado = {
        status: 'green',
        vela_final: novaVela,
        id: sinalAtivo.id,
        ts: new Date().toISOString()
      };
      
      broadcast("resultado", ultimoResultado);
      console.log(`✅ GREEN! Vela: ${novaVela.toFixed(2)}x (Alvo: ${sinalAtivo.cashout.toFixed(2)}x)`);
      
      // Enviar notificação push de GREEN
      sendPushNotification(
        "✅ GREEN!",
        `Vitória confirmada ${novaVela.toFixed(2)}x`
      );
      
      // Limpar imediatamente após confirmar
      broadcast("limpar_entrada", { id: sinalAtivo.id });
      console.log("🧹 Entrada limpa após GREEN");
      
      sinalAtivo = null;
    } else {
      ultimoResultado = {
        status: 'loss',
        vela_final: novaVela,
        id: sinalAtivo.id,
        ts: new Date().toISOString()
      };
      
      broadcast("resultado", ultimoResultado);
      console.log(`❌ LOSS! Vela: ${novaVela.toFixed(2)}x (Alvo: ${sinalAtivo.cashout.toFixed(2)}x)`);
      
      // Enviar notificação push de LOSS
      sendPushNotification(
        "❌ LOSS",
        `Tentativas esgotadas ${novaVela.toFixed(2)}x`
      );
      
      // Limpar imediatamente após confirmar
      broadcast("limpar_entrada", { id: sinalAtivo.id });
      console.log("🧹 Entrada limpa após LOSS");
      
      sinalAtivo = null;
    }
  }
}

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
        const snapshotAnterior = [...ultimasVelas];
        ultimasVelas = velasValidas;
        
        broadcast("velas", { velas: ultimasVelas });
        console.log(`🎮 Velas Aviator: [${ultimasVelas.map(v => v.toFixed(2)).join(', ')}]`);
        
        if (snapshotAnterior.length > 0 && snapshotAnterior[0] !== ultimasVelas[0]) {
          processarNovaVela(snapshotAnterior, ultimasVelas[0]);
        }
      }
    } else if (valor !== undefined && valor !== null) {
      const velaNum = parseFloat(valor);
      if (!isNaN(velaNum) && velaNum >= 1.00 && velaNum <= 99.99) {
        const snapshotAnterior = [...ultimasVelas];
        ultimasVelas = [velaNum, ...ultimasVelas.slice(0, 3)];
        
        broadcast("velas", { velas: ultimasVelas });
        console.log(`🎮 Vela Aviator: ${velaNum.toFixed(2)}x`);
        
        if (snapshotAnterior.length > 0) {
          processarNovaVela(snapshotAnterior, velaNum);
        }
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
