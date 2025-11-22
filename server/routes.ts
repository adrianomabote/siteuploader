import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import path from "path";
import webpush from "web-push";

const connectedClients = new Set<Response>();
const userConnections = new Map<string, Set<Response>>(); // ANTI-reload: rastreia conexões por clientId
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



// 📊 PADRÕES PRÉ-DEFINIDOS
const PADROES = [
  // 🔵 Padrões de 2x–3x (baixos e médios)
  { nome: "Alternância Leve", sequencia: [1.5, 2.1, 1.6, 2.5], cashout: 2.00, tolerancia: 0.4 },
  { nome: "Subida Lenta", sequencia: [1.1, 1.3, 1.6, 2.0], cashout: 2.00, tolerancia: 0.3 },
  
  // 🟣 Padrões de 3x (médios altos)
  { nome: "Pré-Pico Médio", sequencia: [1.3, 1.4, 1.6, 3.2], cashout: 3.00, tolerancia: 0.4 },
  { nome: "Ciclo Médio", sequencia: [2.0, 1.8, 2.5, 1.4], cashout: 3.00, tolerancia: 0.4 },
  { nome: "Repetição Média", sequencia: [2.2, 1.5, 2.0, 1.4], cashout: 3.00, tolerancia: 0.4 },
  
  // 💗 Padrões de 10x (altos)
  { nome: "Sequência Fria Longa", sequencia: [1.2, 1.4, 1.05, 1.7, 1.3], cashout: 10.00, tolerancia: 0.3 },
  { nome: "Frio Longo", sequencia: [1.1, 1.3, 1.2, 1.4, 1.5], cashout: 10.00, tolerancia: 0.3 },
  { nome: "Aquecimento Alto", sequencia: [1.5, 2.0, 2.8, 1.9], cashout: 10.00, tolerancia: 0.5 },
];

/**
 * 🔍 VERIFICA SE VELAS CORRESPONDEM A UM PADRÃO
 */
function verificarPadrao(velas: number[], padrao: typeof PADROES[0]): boolean {
  const tamanho = padrao.sequencia.length;
  if (velas.length < tamanho) return false;
  
  // Pegar as últimas N velas (ordem reversa: mais recente primeiro)
  const velasRecentes = velas.slice(0, tamanho).reverse();
  
  // Verificar se cada vela está dentro da tolerância do padrão
  for (let i = 0; i < tamanho; i++) {
    const velaAtual = velasRecentes[i];
    const velaEsperada = padrao.sequencia[i];
    const diferenca = Math.abs(velaAtual - velaEsperada);
    
    if (diferenca > padrao.tolerancia) {
      return false;
    }
  }
  
  return true;
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

  // 🎯 PRIMEIRO: VERIFICAR PADRÕES PRÉ-DEFINIDOS
  for (const padrao of PADROES) {
    if (verificarPadrao(velas, padrao)) {
      const gales = padrao.cashout === 10.00 ? 0 : padrao.cashout === 3.00 ? 1 : 2;
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

  // ⛔ BLOQUEIO: 5+ velas baixas consecutivas (proteção)
  if (velas.length >= 5) {
    const ultimas5 = velas.slice(0, 5);
    const todas5Baixas = ultimas5.every(v => v < 2.0);
    if (todas5Baixas) {
      console.log("⛔ BLOQUEADO: 5 velas baixas consecutivas - aguardando recuperação");
      return null;
    }
  }

  // 📊 FALLBACK: Se nenhum padrão foi detectado, usar análise estatística

  // 🟣 PADRÃO 1: PREVISÃO RARA DE 10.00x - Condições MUITO RESTRITIVAS
  // Apenas quando: 4 velas altas (≥4.0x) + crescente + média ≥5.0x + sem baixas
  const velasAltas = velas.filter(v => v >= 4.0).length;
  const crescenteForte = v4 < v3 && v3 < v2 && v2 < v1 && v1 >= 5.0;
  
  if (velasAltas === 4 && crescenteForte && media >= 5.0 && baixas === 0) {
    console.log("🎯 PADRÃO 1 (RARO): Condições EXCEPCIONAIS para 10.00x");
    console.log(`   4 velas altas | Crescente forte | Média: ${media.toFixed(2)}x`);
    return { deve_sinalizar: true, apos_de: v1, cashout: 10.00, max_gales: 0 };
  }

  // 🔵 PADRÃO 2: PREVISÃO DE 3.00x - Alta volatilidade com velas médias
  const velasMedioAltas = velas.filter(v => v >= 2.5 && v < 6.0).length;
  if ((maxima - minima) > 3.0 && velasMedioAltas >= 2 && media >= 2.5 && media < 5.0) {
    console.log("🎯 PADRÃO 2: Volatilidade favorável - Sinal 3.00x");
    console.log(`   Diferença: ${(maxima - minima).toFixed(2)} | Média: ${media.toFixed(2)}x`);
    return { deve_sinalizar: true, apos_de: v1, cashout: 3.00, max_gales: 1 };
  }

  // 🔴 PADRÃO 3: PREVISÃO DE 2.00x - 3+ velas baixas (recuperação esperada)
  if (baixas >= 3 && media < 2.0) {
    console.log("🎯 PADRÃO 3: 3+ velas baixas - Sinal 2.00x (recuperação)");
    console.log(`   Baixas: ${baixas} | Média: ${media.toFixed(2)}x`);
    return { deve_sinalizar: true, apos_de: v1, cashout: 2.00, max_gales: 2 };
  }

  // 🟡 PADRÃO 4: PREVISÃO DE 2.00x - Média baixa (padrão comum)
  if (media < 2.0 && baixas >= 2) {
    console.log("🎯 PADRÃO 4: Média baixa - Sinal 2.00x");
    console.log(`   Média: ${media.toFixed(2)}x | Baixas: ${baixas}`);
    return { deve_sinalizar: true, apos_de: v1, cashout: 2.00, max_gales: 1 };
  }

  // 🟢 PADRÃO 5: PREVISÃO DE 3.00x - Sequência crescente média/alta
  const crescente = v4 < v3 && v3 < v2 && v2 < v1;
  if (crescente && media >= 2.5 && media < 5.0 && baixas === 0) {
    console.log("🎯 PADRÃO 5: Sequência crescente - Sinal 3.00x");
    console.log(`   Crescente | Média: ${media.toFixed(2)}x | Sem baixas`);
    return { deve_sinalizar: true, apos_de: v1, cashout: 3.00, max_gales: 1 };
  }

  // 🟠 PADRÃO 6: PREVISÃO DE 2.00x - Recuperação após período baixo
  if (v1 >= 2.0 && v1 < 4.0 && baixas >= 2) {
    console.log("🎯 PADRÃO 6: Recuperação detectada - Sinal 2.00x");
    console.log(`   Última vela: ${v1.toFixed(2)}x | Baixas anteriores: ${baixas}`);
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

  // API: Online count (ANTI-reload: Diminui offline, não aumenta em reload)
  app.get("/api/online", (req, res) => {
    res.json({ ok: true, online: userConnections.size });
  });

  // API: SSE Stream (ANTI-reload: Diminui offline, não aumenta em reload)
  app.get("/api/stream", (req: Request, res: Response) => {
    const clientId = req.query.clientId as string || "unknown";
    
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    connectedClients.add(res);
    
    // ANTI-reload: Se clientId já existe, não é novo usuário (apenas reconexão)
    const isNewUser = !userConnections.has(clientId);
    
    if (isNewUser) {
      userConnections.set(clientId, new Set());
    }
    
    // Adiciona response ao Set do cliente
    userConnections.get(clientId)!.add(res);

    // Enviar contagem inicial
    res.write(`data: ${JSON.stringify({ event: "online", data: { count: userConnections.size } })}\n\n`);

    // Broadcast para todos sobre usuários online (só se é novo)
    if (isNewUser) {
      broadcast("online", { count: userConnections.size });
    }

    // Heartbeat a cada 30s
    const heartbeat = setInterval(() => {
      res.write(`:heartbeat\n\n`);
    }, 30000);

    req.on("close", () => {
      clearInterval(heartbeat);
      connectedClients.delete(res);
      
      // Remove response do cliente
      const clientResponses = userConnections.get(clientId);
      if (clientResponses) {
        clientResponses.delete(res);
        
        // Se NÃO tem mais conexões, remove cliente (AGORA diminui!)
        if (clientResponses.size === 0) {
          userConnections.delete(clientId);
          broadcast("online", { count: userConnections.size });
        }
      }
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
          console.log(`🔍 Nova vela detectada: ${velaAtual.toFixed(2)}x | Validando resultado...`);
          validarComProximaVela(velaAtual);
        }
        // 🤖 ANÁLISE AUTOMÁTICA: BLOQUEADO se aguardando validação
        else if (aguardandoValidacao) {
          console.log(`⏸️ AGUARDANDO validação do sinal anterior (${ultimoSinal?.cashout}x)`);
        }
        // ✅ LIVRE PARA GERAR NOVO SINAL
        else {
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
          console.log(`🔍 Nova vela detectada: ${velaNum.toFixed(2)}x | Validando resultado...`);
          validarComProximaVela(velaNum);
        }
        // 🤖 ANÁLISE AUTOMÁTICA: BLOQUEADO se aguardando validação
        else if (aguardandoValidacao) {
          console.log(`⏸️ AGUARDANDO validação do sinal anterior (${ultimoSinal?.cashout}x)`);
        }
        // ✅ LIVRE PARA GERAR NOVO SINAL
        else {
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
