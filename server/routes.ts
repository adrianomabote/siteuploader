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
      if (error.statusCode === 404 || error.statusCode === 410) {
        deadSubscriptions.push(subscription);
      }
    }
  }

  deadSubscriptions.forEach(sub => pushSubscriptions.delete(sub));
}



// 📊 PADRÕES PRÉ-DEFINIDOS (ATUALIZADOS: mais comuns e mais numerosos)
// - A maioria mira 2x ou 3x (com tolerâncias maiores para gerar mais sinais)
// - Cada padrão tem 'tolerancia' (valor absoluto) e 'minMatchPercent' (quantos itens da sequência precisam bater)
const PADROES = [
  // Padrões muito comuns — foco 2x
  { nome: "Pequena Recuperação", sequencia: [1.2, 1.4, 2.0], cashout: 2.00, tolerancia: 0.45, minMatchPercent: 0.6 },
  { nome: "Baixa → Média", sequencia: [1.1, 1.6, 1.9], cashout: 2.00, tolerancia: 0.5, minMatchPercent: 0.6 },
  { nome: "Dois Baixos + Subida", sequencia: [1.3, 1.4, 2.1], cashout: 2.00, tolerancia: 0.4, minMatchPercent: 0.66 },
  { nome: "Recuperação Lenta", sequencia: [1.05, 1.2, 1.6, 2.0], cashout: 2.00, tolerancia: 0.45, minMatchPercent: 0.6 },
  { nome: "Alternância Baixa", sequencia: [1.2, 2.0, 1.3], cashout: 2.00, tolerancia: 0.5, minMatchPercent: 0.6 },

  // Padrões médios — foco 3x
  { nome: "Crescimento Médio Curto", sequencia: [1.6, 2.0, 2.8], cashout: 3.00, tolerancia: 0.6, minMatchPercent: 0.6 },
  { nome: "Dois Médios Crescentes", sequencia: [2.0, 2.3, 1.9], cashout: 3.00, tolerancia: 0.6, minMatchPercent: 0.66 },
  { nome: "Subida Rápida Curta", sequencia: [1.8, 2.5, 3.1], cashout: 3.00, tolerancia: 0.7, minMatchPercent: 0.6 },
  { nome: "Sequência Crescente Média", sequencia: [1.4, 1.9, 2.6, 2.9], cashout: 3.00, tolerancia: 0.6, minMatchPercent: 0.6 },

  // Padrões muito frequentes (micro-picos e alternâncias) — geralmente 2x
  { nome: "Micro-Pico", sequencia: [1.5, 2.2], cashout: 2.00, tolerancia: 0.5, minMatchPercent: 0.6 },
  { nome: "Alternância Rápida", sequencia: [1.3, 2.4, 1.5], cashout: 2.00, tolerancia: 0.6, minMatchPercent: 0.6 },
  { nome: "Repetição Baixa com Spike", sequencia: [1.2, 1.3, 2.3], cashout: 2.00, tolerancia: 0.5, minMatchPercent: 0.6 },

  // Raro — manter 10x como exceção, mas com requisitos muito relaxados (praticamente não usado)
  { nome: "Raro 10x (exceção)", sequencia: [4.0, 5.0, 8.0], cashout: 10.00, tolerancia: 5.0, minMatchPercent: 0.8 },
];

/**
 * 🔍 VERIFICA SE VELAS CORRESPONDEM A UM PADRÃO (VERSÃO RELAXADA)
 * - Permite "partial match" (porcentagem mínima de itens da sequência dentro da tolerância)
 */
function verificarPadrao(velas: number[], padrao: typeof PADROES[0]): boolean {
  const tamanho = padrao.sequencia.length;
  if (velas.length < Math.max(3, tamanho)) return false; // exige pelo menos 3 velas para considerarmos a maioria dos padrões
  
  // Pegar as últimas N velas (ordem: mais recente primeiro)
  const velasRecentes = velas.slice(0, tamanho).reverse();

  let matches = 0;
  for (let i = 0; i < tamanho; i++) {
    const velaAtual = velasRecentes[i];
    const velaEsperada = padrao.sequencia[i];
    const diferenca = Math.abs(velaAtual - velaEsperada);

    if (diferenca <= padrao.tolerancia) {
      matches++;
    } else {
      // também aceitar se estiver dentro de 15% relativo (para altos valores)
      const pctDiff = Math.abs(velaAtual - velaEsperada) / Math.max(velaEsperada, 0.0001);
      if (pctDiff <= 0.15) {
        matches++;
      }
    }
  }

  const matchPercent = matches / tamanho;
  return matchPercent >= (padrao.minMatchPercent ?? 0.6);
}

// ✅ ANÁLISE AUTOMÁTICA DE PADRÕES - MODO ASSERTIVO (MAIS ATIVO)
function analisarPadrao(velas: number[]): { deve_sinalizar: boolean; apos_de: number; cashout: number; max_gales: number } | null {
  if (velas.length < 3) return null; // reduzir requisito mínimo para gerar mais sinais

  // Usar as 4 mais recentes quando possível
  const [v1 = 1.0, v2 = 1.0, v3 = 1.0, v4 = 1.0] = velas.slice(0, 4);
  const sliceLen = Math.min(4, velas.length);
  const media = (velas.slice(0, sliceLen).reduce((a, b) => a + b, 0)) / sliceLen;
  const maxima = Math.max(...velas);
  const minima = Math.min(...velas);
  const baixas = velas.filter(v => v < 2.0).length;
  const altas = velas.filter(v => v >= 10.0).length;

  // 1) Verificar padrões pré-definidos (mais permissivo)
  for (const padrao of PADROES) {
    if (verificarPadrao(velas, padrao)) {
      // ajustar gales com mais flexibilidade
      const gales = padrao.cashout >= 10.00 ? 0 : padrao.cashout === 3.00 ? 1 : 2;
      console.log(`🎯 PADRÃO DETECTADO: "${padrao.nome}" - Sinal ${padrao.cashout}x`);
      console.log(`   Velas: [${velas.slice(0, padrao.sequencia.length).map(v => v.toFixed(2)).join(', ')}]`);
      return { 
        deve_sinalizar: true, 
        apos_de: v1, 
        cashout: padrao.cashout, 
        max_gales: gales 
      };
    }
  }

  // BLOQUEIO: reduzir sensibilidade (ex.: só bloquear após 6 velas baixas)
  if (velas.length >= 6) {
    const ultimas6 = velas.slice(0, 6);
    const todas6Baixas = ultimas6.every(v => v < 2.0);
    if (todas6Baixas) {
      console.log("⛔ BLOQUEADO: 6 velas baixas consecutivas - aguardando recuperação");
      return null;
    }
  }

  // FALLBACKS mais permissivos para gerar MAIS sinais (foco em 2x e 3x)

  // A) Favor sinais 3x quando há duas altas consecutivas ou forte crescimento recente
  const duasAltasConsecutivas = v1 >= 2.0 && v2 >= 2.0;
  const duasCrescentes = v2 < v1 && v3 < v2; // rápido crescimento nos últimos 3
  if ((duasAltasConsecutivas || duasCrescentes) && media >= 1.8 && media < 6.0) {
    console.log("🎯 FALLBACK A: Duas altas ou crescimento rápido - Sinal 3.00x");
    return { deve_sinalizar: true, apos_de: v1, cashout: 3.00, max_gales: 1 };
  }

  // B) Sinais 2x para recuperações ou micro-spikes (muito comuns)
  if ((baixas >= 2 && v1 >= 1.5) || (v1 >= 1.6 && v2 < 1.6 && v2 <= v3)) {
    console.log("🎯 FALLBACK B: Recuperação / Micro-spike - Sinal 2.00x");
    return { deve_sinalizar: true, apos_de: v1, cashout: 2.00, max_gales: 2 };
  }

  // C) Volatilidade moderada: se range é razoável e média entre 1.8 e 3.5 => 3x
  if ((maxima - minima) >= 1.0 && media >= 1.8 && media < 3.6) {
    console.log("🎯 FALLBACK C: Volatilidade moderada - Sinal 3.00x");
    return { deve_sinalizar: true, apos_de: v1, cashout: 3.00, max_gales: 1 };
  }

  // D) Pequena aposta (2x) para sequências de alternância (frequente)
  const alternancia = (v1 > v2 && v2 < v3) || (v1 < v2 && v2 > v3);
  if (alternancia && media < 2.5) {
    console.log("🎯 FALLBACK D: Alternância detectada - Sinal 2.00x");
    return { deve_sinalizar: true, apos_de: v1, cashout: 2.00, max_gales: 2 };
  }

  // E) Caso muito permissivo para gerar sinais com base na última vela
  if (v1 >= 1.6 && media >= 1.5) {
    console.log("🎯 FALLBACK E: Última vela razoável + média aceitável - Sinal 2.00x (maior volume de sinais)");
    return { deve_sinalizar: true, apos_de: v1, cashout: 2.00, max_gales: 2 };
  }

  // Pequena exceção para 10x — muito raro e com requisitos altos (permanece como backup)
  const velasAltas = velas.filter(v => v >= 5.0).length;
  if (velasAltas >= 3 && media >= 5.0 && (v1 >= 5.0)) {
    console.log("🎯 PADRÃO MUITO RARO: Condições para 10.00x (exceção)");
    return { deve_sinalizar: true, apos_de: v1, cashout: 10.00, max_gales: 0 };
  }

  // Nenhum padrão favorável
  console.log("⚪ Nenhum padrão favorável (após regras mais permissivas) - aguardando oportunidade");
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
  console.log("🤖 Análise automática de padrões: ATIVADA (mais permissiva)");
  
  if (!servidorSinaisOnline) {
    servidorSinaisOnline = true;
    broadcast("servidor_status", { online: true });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {

  app.use(express.static(path.join(process.cwd(), 'public')));

  app.get("/api/online", (req, res) => {
    res.json({ ok: true, online: connectedClients.size });
  });

  app.get("/api/stream", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    connectedClients.add(res);
    res.write(`data: ${JSON.stringify({ event: "online", data: { count: connectedClients.size } })}\n\n`);
    broadcast("online", { count: connectedClients.size });

    const heartbeat = setInterval(() => {
      res.write(`:heartbeat\n\n`);
    }, 30000);

    req.on("close", () => {
      clearInterval(heartbeat);
      connectedClients.delete(res);
      broadcast("online", { count: connectedClients.size });
    });
  });

  app.get("/api/velas", (req, res) => {
    res.json({ ok: true, velas: ultimasVelas });
  });

  app.post("/api/sinal", express.json(), (req, res) => {
    const { apos_de, cashout, max_gales } = req.body;
    ultimoSinal = { apos_de, cashout, max_gales, ts: new Date().toISOString() };
    broadcast("sinal", ultimoSinal);
    res.json({ ok: true });
  });

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
      // Manter até 6 últimas para análises (mais contexto)
      ultimasVelas = velasProcessadas.slice(0, 6);
      broadcast("velas", { velas: ultimasVelas });
      console.log(`✅ Velas REAIS Aviator: [${ultimasVelas.map(v => v.toFixed(2)).join(', ')}]`);

      if (!servidorSinaisOnline) {
        servidorSinaisOnline = true;
        broadcast("servidor_status", { online: true });
      }
    }

    res.json({ ok: true });
  });

  app.get("/api/sinais-aviator", (req, res) => {
    res.json(ultimasVelas);
  });

  app.get("/api/vela", (req, res) => {
    res.json({ 
      ok: true, 
      velas: ultimasVelas.slice(0, 4),
      timestamp: new Date().toISOString()
    });
  });

  app.post("/api/vela", express.json(), (req, res) => {
    const { valor, valores } = req.body;

    if (valores && Array.isArray(valores)) {
      const velasProcessadas = valores.map((v: any) => parseFloat(v));
      const velasValidas: number[] = [];
      const velasRejeitadas: number[] = [];

      for (const v of velasProcessadas) {
        if (!isNaN(v) && v >= 1.00) {
          velasValidas.push(v);
        } else {
          velasRejeitadas.push(v);
        }
      }

      if (velasRejeitadas.length > 0) {
        console.log(`❌ Velas FALSAS rejeitadas: [${velasRejeitadas.map(v => isNaN(v) ? 'NaN/inválido' : v.toFixed(2)).join(', ')}`);
      }

      if (velasValidas.length >= 3) {
        // Guardar até 6 velas para contexto
        ultimasVelas = velasValidas.slice(0, 6);

        broadcast("velas", { velas: ultimasVelas });
        console.log(`✅ Velas REAIS Aviator: [${ultimasVelas.map(v => v.toFixed(2)).join(', ')}]`);

        const velaAtual = ultimasVelas[0];

        if (aguardandoValidacao && velaDoSinal !== null && velaAtual !== velaDoSinal) {
          console.log(`🔍 Nova vela detectada: ${velaAtual.toFixed(2)}x | Validando resultado...`);
          validarComProximaVela(velaAtual);
        } else if (aguardandoValidacao) {
          console.log(`⏸️ AGUARDANDO validação do sinal anterior (${ultimoSinal?.cashout}x)`);
        } else {
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

      if (!isNaN(velaNum) && velaNum >= 1.00) {
        ultimasVelas = [velaNum, ...ultimasVelas.slice(0, 5)];

        broadcast("velas", { velas: ultimasVelas });
        console.log(`✅ Vela REAL Aviator: ${velaNum.toFixed(2)}x`);

        if (aguardandoValidacao && velaDoSinal !== null && velaNum !== velaDoSinal) {
          console.log(`🔍 Nova vela detectada: ${velaNum.toFixed(2)}x | Validando resultado...`);
          validarComProximaVela(velaNum);
        } else if (aguardandoValidacao) {
          console.log(`⏸️ AGUARDANDO validação do sinal anterior (${ultimoSinal?.cashout}x)`);
        } else {
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

  app.get("/api/ultimo-historico", (req, res) => {
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

  app.post("/api/subscribe", express.json(), (req, res) => {
    const subscription = req.body;
    pushSubscriptions.add(subscription);
    console.log(`✅ Push subscription adicionada! Total: ${pushSubscriptions.size}`);
    res.json({ ok: true });
  });

  app.get("/vapidPublicKey.txt", (req, res) => {
    res.type("text/plain");
    res.send(VAPID_PUBLIC_KEY);
  });

  app.get("*", (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
  });

  const httpServer = createServer(app);

  iniciarSistemaAviator();

  return httpServer;
}
