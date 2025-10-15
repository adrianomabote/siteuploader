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
let aguardandoValidacao: boolean = false;
let velaDoSinal: number | null = null;

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



// ✅ ANÁLISE AUTOMÁTICA DE PADRÕES - MODO ASSERTIVO
function analisarPadrao(velas: number[]): { deve_sinalizar: boolean; apos_de: number; cashout: number; max_gales: number } | null {
  if (velas.length < 4) return null;

  const [v1, v2, v3, v4] = velas.slice(0, 4);
  const media = (v1 + v2 + v3 + v4) / 4;
  const maxima = Math.max(...velas);
  const minima = Math.min(...velas);
  const baixas = velas.filter(v => v < 2.0).length;
  const altas = velas.filter(v => v >= 10.0).length;

  // ⛔ BLOQUEIO: 5+ velas baixas consecutivas (proteção)
  if (velas.length >= 5) {
    const ultimas5 = velas.slice(0, 5);
    const todas5Baixas = ultimas5.every(v => v < 2.0);
    if (todas5Baixas) {
      console.log("⛔ BLOQUEADO: 5 velas baixas consecutivas - aguardando recuperação");
      return null;
    }
  }

  // 🟣 PADRÃO 1: VELA ROSA (>10.0x) - OPORTUNIDADE RARA
  if (altas >= 1) {
    console.log("🎯 PADRÃO 1: Vela ROSA detectada - Sinal 10.00x");
    return { deve_sinalizar: true, apos_de: v1, cashout: 10.00, max_gales: 0 };
  }

  // 🔵 PADRÃO 2: ALTA VOLATILIDADE - Diferença > 5.0x
  if ((maxima - minima) > 5.0 && baixas <= 1) {
    console.log("🎯 PADRÃO 2: Alta volatilidade detectada - Sinal 6.00x");
    return { deve_sinalizar: true, apos_de: v1, cashout: 6.00, max_gales: 1 };
  }

  // 🔴 PADRÃO 3: 3+ VELAS BAIXAS - Forte indicador
  if (baixas >= 3 && media < 2.0) {
    console.log("🎯 PADRÃO 3: 3+ velas baixas - Sinal 3.00x");
    return { deve_sinalizar: true, apos_de: v1, cashout: 3.00, max_gales: 2 };
  }

  // 🟡 PADRÃO 4: MÉDIA BAIXA COM 2+ BAIXAS
  if (media < 2.5 && baixas >= 2) {
    console.log("🎯 PADRÃO 4: Média baixa com 2+ baixas - Sinal 2.00x");
    return { deve_sinalizar: true, apos_de: v1, cashout: 2.00, max_gales: 1 };
  }

  // 🟢 PADRÃO 5: SEQUÊNCIA CRESCENTE - Tendência positiva
  const crescente = v4 < v3 && v3 < v2 && v2 < v1;
  if (crescente && media > 2.0 && media < 5.0) {
    console.log("🎯 PADRÃO 5: Sequência crescente - Sinal 3.00x");
    return { deve_sinalizar: true, apos_de: v1, cashout: 3.00, max_gales: 2 };
  }

  // 🟠 PADRÃO 6: RECUPERAÇÃO APÓS BAIXA - Última vela > 2.5x e anteriores baixas
  if (v1 >= 2.5 && v1 < 5.0 && baixas >= 2) {
    console.log("🎯 PADRÃO 6: Recuperação detectada - Sinal 2.00x");
    return { deve_sinalizar: true, apos_de: v1, cashout: 2.00, max_gales: 1 };
  }

  // ⚪ Nenhum padrão favorável detectado
  console.log("⚪ Nenhum padrão favorável - aguardando oportunidade");
  return null;
}

// 🎯 VALIDAÇÃO AUTOMÁTICA: Verifica próxima vela
function validarComProximaVela(proximaVela: number) {
  if (!ultimoSinal || !aguardandoValidacao) return;

  const cashoutAlvo = ultimoSinal.cashout;
  const status = proximaVela >= cashoutAlvo ? "green" : "loss";

  ultimoResultado = {
    status,
    vela_final: proximaVela,
    id: ultimoSinal.id,
    ts: new Date().toISOString(),
    apos_de: ultimoSinal.apos_de,
    cashout: cashoutAlvo
  };

  aguardandoValidacao = false;
  velaDoSinal = null;

  broadcast("resultado", ultimoResultado);

  const emoji = status === "green" ? "✅" : "❌";
  console.log(`${emoji} RESULTADO: ${status.toUpperCase()} - Vela: ${proximaVela.toFixed(2)}x (Alvo: ${cashoutAlvo.toFixed(2)}x)`);

  // 📱 Notificar resultado
  sendPushNotification(
    `${emoji} RESULTADO: ${status.toUpperCase()}`,
    `Vela: ${proximaVela.toFixed(2)}x | Alvo: ${cashoutAlvo.toFixed(2)}x`
  );
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
      ts: new Date().toISOString(),
      apos_de: ultimoSinal?.apos_de,
      cashout: ultimoSinal?.cashout
    };
    aguardandoValidacao = false;
    velaDoSinal = null;
    broadcast("resultado", ultimoResultado);

    const emoji = status === "green" ? "✅" : "❌";
    console.log(`${emoji} RESULTADO MANUAL: ${status.toUpperCase()}`);

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
        console.log(`❌ Velas FALSAS rejeitadas: [${velasRejeitadas.map(v => isNaN(v) ? 'NaN/inválido' : v.toFixed(2)).join(', ')}`);
      }

      if (velasValidas.length >= 4) {
        ultimasVelas = velasValidas.slice(0, 4);

        broadcast("velas", { velas: ultimasVelas });
        console.log(`✅ Velas REAIS Aviator: [${ultimasVelas.map(v => v.toFixed(2)).join(', ')}]`);

        const velaAtual = ultimasVelas[0];

        // 🎯 SE ESTÁ AGUARDANDO VALIDAÇÃO: Verifica se a nova vela valida o resultado
        if (aguardandoValidacao && velaDoSinal !== null && velaAtual !== velaDoSinal) {
          validarComProximaVela(velaAtual);
        }

        // 🤖 ANÁLISE AUTOMÁTICA: Manda sinal quando vê oportunidade
        if (!aguardandoValidacao) {
          const analise = analisarPadrao(ultimasVelas);
          if (analise && analise.deve_sinalizar) {
            ultimoSinal = {
              id: `sinal_${Date.now()}`,
              apos_de: analise.apos_de,
              cashout: analise.cashout,
              max_gales: analise.max_gales,
              ts: new Date().toISOString()
            };

            aguardandoValidacao = true;
            velaDoSinal = velaAtual;

            broadcast("sinal", ultimoSinal);

            // 📱 Enviar notificação push
            sendPushNotification(
              "🎯 NOVA ENTRADA!",
              `Entrar após ${analise.apos_de.toFixed(2)}x | Sair em ${analise.cashout.toFixed(2)}x`
            );

            console.log(`🚀 SINAL GERADO: ${analise.apos_de.toFixed(2)}x → ${analise.cashout.toFixed(2)}x (${analise.max_gales} gales)`);
            console.log(`⏳ Aguardando próxima vela para validação...`);
          }
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

        // 🎯 SE ESTÁ AGUARDANDO VALIDAÇÃO: Verifica se a nova vela valida o resultado
        if (aguardandoValidacao && velaDoSinal !== null && velaNum !== velaDoSinal) {
          validarComProximaVela(velaNum);
        }

        // 🤖 ANÁLISE AUTOMÁTICA: Manda sinal quando vê oportunidade
        if (!aguardandoValidacao) {
          const analise = analisarPadrao(ultimasVelas);
          if (analise && analise.deve_sinalizar) {
            ultimoSinal = {
              id: `sinal_${Date.now()}`,
              apos_de: analise.apos_de,
              cashout: analise.cashout,
              max_gales: analise.max_gales,
              ts: new Date().toISOString()
            };

            aguardandoValidacao = true;
            velaDoSinal = velaNum;

            broadcast("sinal", ultimoSinal);

            // 📱 Enviar notificação push
            sendPushNotification(
              "🎯 NOVA ENTRADA!",
              `Entrar após ${analise.apos_de.toFixed(2)}x | Sair em ${analise.cashout.toFixed(2)}x`
            );

            console.log(`🚀 SINAL GERADO: ${analise.apos_de.toFixed(2)}x → ${analise.cashout.toFixed(2)}x (${analise.max_gales} gales)`);
            console.log(`⏳ Aguardando próxima vela para validação...`);
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