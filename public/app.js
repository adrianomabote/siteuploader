(() => {
  // Evita inicialização dupla
  if (window.__cashoutInit) return;
  window.__cashoutInit = true;


  // === DEDUPE DO HISTÓRICO ===
const _seenHistory = new Set();          // chaves já vistas
const MAX_HISTORY = 100;                 // limite de memória local

function _resultKey(d) {
  // d: objeto do /api/resultado
  const id = (d.id ?? "").toString();
  const st = (d.status ?? "").toString().toLowerCase();
  let vf = d.vela_final;
  if (vf !== null && vf !== undefined && String(vf).trim() !== "" && !isNaN(Number(vf))) {
    vf = Number(vf).toFixed(2);
  } else {
    vf = "";
  }
  return `${id}|${st}|${vf}`;
}


  // -------------------- helpers base --------------------

  const $ = (sel) => document.querySelector(sel);
  const setText = (sel, val) => { const el = $(sel); if (el) el.textContent = val; };
  const asNum = (v) => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (!s || s === "-") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };
  const fmtX = (n) => (n === null ? "-" : `${Number(n).toFixed(2)}x`);

  // base64url -> Uint8Array (VAPID)
  function urlBase64ToUint8Array(base64String) {
    const s = base64String.replace(/[\s"']/g, "").replace(/[\u200B-\u200D\uFEFF]/g, "");
    const padding = "=".repeat((4 - s.length % 4) % 4);
    const base64 = (s + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
    return out;
  }

  async function enablePush() {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") { alert("Permita notificações"); return; }

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  // SEM cache + sanitização
  let vapid = (await (await fetch("/vapidPublicKey.txt", { cache: "no-store" })).text()).trim();
  vapid = vapid.replace(/[\u200B-\u200D\uFEFF]/g, ""); // tira BOM/zero-width
  const appServerKey = urlBase64ToUint8Array(vapid);

  // validação crítica: TEM que ser 65 bytes
  if (appServerKey.length !== 65) {
    console.error("appServerKey length =", appServerKey.length, "vapid =", vapid);
    alert("Chave VAPID inválida no front (len " + appServerKey.length + "). Atualize vapidPublicKey.txt");
    return;
  }

  // desinscreve antigo (evita conflito)
  const old = await reg.pushManager.getSubscription();
  if (old) { try { await old.unsubscribe(); } catch(e) { console.warn(e); } }

  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appServerKey });
  await fetch("/api/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub) });
  alert("Push ativado!");
}

  function getClientId() {
  let cid = localStorage.getItem("cid");
  if (!cid) {
    cid = (crypto.randomUUID && crypto.randomUUID()) ||
          (Date.now().toString(36) + Math.random().toString(36).slice(2));
    localStorage.setItem("cid", cid);
  }
  return cid;
}


  function formatHora(ts) {
  const d = ts ? new Date(ts) : new Date();
  return d.toLocaleTimeString("pt-PT", {
    timeZone: "Africa/Johannesburg",  // força Pretoria/Maputo
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}


  // -------------------- status topo --------------------
function setStatus(online) {
  const pill = document.querySelector("[data-status='realtime']");
  if (pill) {
    const onlineSpan = pill.querySelector("#onlineCount");
    const labelText  = (online ? "" : "• Reconectando ... ");

    if (onlineSpan) {
      // Atualiza (ou cria) o texto ANTES do #onlineCount sem remover o span
      if (onlineSpan.previousSibling && onlineSpan.previousSibling.nodeType === Node.TEXT_NODE) {
        onlineSpan.previousSibling.nodeValue = labelText;
      } else {
        pill.insertBefore(document.createTextNode(labelText), onlineSpan);
      }
    } else {
      // Não existe o #onlineCount? então cai no comportamento antigo
      pill.textContent = labelText;
    }

    pill.classList.toggle("bg-green-600", online);
    pill.classList.toggle("bg-yellow-600", !online);
  }

  const subtitle = document.querySelector("[data-subtitle='connection']");
  if (subtitle) subtitle.textContent = online ? "Aguarde entrada" : "Conectando ...";
}


  // -------------------- Velas (UI) --------------------
  const MAX_VELAS = 5;
  let ultimasVelas = [];
  let analyzingTimer = null;

  const elVelas = document.getElementById("velas");          // <ul id="velas">
  const elVelasStatus = document.getElementById("velas-status"); // <span id="velas-status">

  // --- Analisando velas: animação sempre ligada via CSS ---
function setAnalyzing(/*on*/) {
  const el = document.getElementById("velas-status");
  if (!el) return;
  el.classList.add("analisando"); // garante a classe; não desliga nunca
}

// garante que ao carregar já esteja “on”
document.addEventListener("DOMContentLoaded", () => setAnalyzing(true));


  function renderVelas(arr) {
  if (!elVelas) return;
  const list = (arr || []).slice(0, MAX_VELAS);
  elVelas.innerHTML = list
    .map((v) => {
      const n = Number(v);
      const txt = Number.isFinite(n) ? n.toFixed(2) + "x" : "-";
      // define cores inline (ignora conflitos de CSS antigo)
      const isRed = Number.isFinite(n) && n < 2;
      const bg = isRed ? "#2b0f0f" : "#0f2b1a";
      const fg = isRed ? "#ff5c5c" : "#36d27a";
      return `<li class="vela-pill" style="background:${bg};color:${fg}">${txt}</li>`;
    })
    .join("");
}

  


  // -------------------- Histórico (somente resultados) --------------------
  function addHistoricoLinha({ ts, status, apos_de, cashout, vela_final, key }) {
  let target = document.querySelector(".history[data-table='historico']");
  const isList = !!target;
  if (!target) target = document.getElementById("history-body");
  if (!target) return;

  // DOM dedupe (opcional)
  if (key && isList && target.querySelector(`li[data-key="${key}"]`)) return;

  const hora = formatHora ? formatHora(ts) : (ts || new Date().toISOString()).replace("T"," ").slice(11,19);
  const fmtX = (n) => (n === null || n === undefined ? "-" : `${Number(n).toFixed(2)}x`);
  const statusClass = (status || "").toLowerCase() === "green" ? "green" : "loss";
  const statusText  = (status || "").toUpperCase();

  if (isList) {
    const li = document.createElement("li");
    if (key) li.dataset.key = key;
    li.dataset.status = (status || "").toLowerCase();
    li.innerHTML = `
      <div class="time">${hora}</div>
      <div class="meta">
        <span class="chip">Apos: ${fmtX(apos_de)}</span>
        <span class="chip">Cash: ${fmtX(cashout)}</span>
        <span class="chip">Vela: ${fmtX(vela_final)}</span>
      </div>
      <div class="badge pill ${statusClass}">${statusText}</div>
    `;
    target.prepend(li);

    // limita visualmente (ex.: 50 itens)
    const maxRows = 50;
    while (target.children.length > maxRows) target.removeChild(target.lastElementChild);
  } else {
    // tbody legado
    const tr = document.createElement("tr");
    tr.setAttribute("data-status", (status || "").toLowerCase());
    tr.innerHTML = `
      <td>${hora}</td>
      <td>${fmtX(apos_de)}</td>
      <td>${fmtX(cashout)}</td>
      <td class="${statusClass}">${statusText}</td>
      <td>${fmtX(vela_final)}</td>
      <td></td>
    `;
    target.prepend(tr);
    // limite (opcional)
    const maxRows = 50;
    while (target.rows && target.rows.length > maxRows) target.deleteRow(-1);
  }
}


  // -------------------- SSE (EventSource) --------------------
  let es = null, reconnectAttempts = 0, heartbeatTimer = null;
  const MAX_BACKOFF = 15000; // 15s

  function resetHeartbeat() {
    clearTimeout(heartbeatTimer);
    heartbeatTimer = setTimeout(() => {
      try { es && es.close(); } catch (_) {}
      setStatus(false);
      connectSSE();
    }, 45000); // 45s (maior que os 30s do heartbeat do servidor)
  }

  // Guarda o último sinal para anexar no resultado
  let lastSignal = null;

  function handleEvent(msg) {
    if (!msg || !msg.event) return;

    // ---- VELAS (tempo real) ----
if (msg.event === "vela" || msg.event === "velas") {
  const d = msg.data || {};

  // 1) série completa
  let serie = null;
  if (Array.isArray(d.valores)) serie = d.valores;
  else if (Array.isArray(d.velas)) serie = d.velas;

  if (serie) {
    // Normaliza: queremos a MAIS RECENTE primeiro (à esquerda).
    let arr = serie.map(Number).filter(Number.isFinite);

    // Heurística de orientação: se já temos histórico, alinhe pela "cabeça" atual
    if (ultimasVelas.length && arr.length) {
      const head = ultimasVelas[0];
      const firstMatch = Math.abs(arr[0] - head) < 1e-9;
      const lastMatch  = Math.abs(arr[arr.length - 1] - head) < 1e-9;
      if (!firstMatch && lastMatch) {
        arr.reverse(); // a série veio mais antiga -> mais recente; inverta
      }
    } else {
      // Sem histórico: assuma que o MAIS RECENTE está no fim? no início?
      // Preferimos que a ponta esquerda seja a última amostra recebida:
      // se você sabe que seu bot manda "mais recente no início", comente a próxima linha.
      arr.reverse();
    }

    // Mantém só 6 e renderiza
    ultimasVelas = arr.slice(0, MAX_VELAS);
    renderVelas(ultimasVelas);
    setAnalyzing(ultimasVelas.length === 0);
    return;
  }

  // 2) valor unitário (chegou só uma vela)
  const unit = d.valor ?? d.vela ?? d.value ?? d.v;
  const n = Number(unit);
  if (Number.isFinite(n)) {
    // mais recente na frente
    ultimasVelas.unshift(n);
    ultimasVelas = ultimasVelas.slice(0, MAX_VELAS);
    renderVelas(ultimasVelas);
    setAnalyzing(false);
  }
  return;
}



    // ---- SINAL (atualiza card, não histórico) ----
if (msg.event === "sinal") {
  const d = msg.data || {};
  const apos = asNum(d.apos_de);
  const cash = asNum(d.cashout);
  const gales = asNum(d.max_gales);

  // depois de e cashout sempre com 2 casas
  setText("[data-field='apos_de']", fmtX(apos));
  setText("[data-field='cashout']", fmtX(cash));

  // gale em formato "X vezes" (com quebra de linha antes do número)
const galeEl = document.querySelector("[data-field='max_gales']");
if (galeEl) {
  if (gales === null) {
    galeEl.textContent = "-";
  } else {
    const galeFmt = `<br>${gales} ${gales === 1 ? "vez" : ""}`;
    galeEl.innerHTML = galeFmt;
  }
}


  // placar: aguardando → sem cor
  const placarEl = document.querySelector("[data-field='placar']");
  if (placarEl) {
    placarEl.classList.remove("green", "loss");
    placarEl.textContent = "Aguardando…";
  }

  lastSignal = { apos_de: apos, cashout: cash, ts: d.ts || new Date().toISOString() };
  return;
}

// ---- RESULTADO ----
if (msg.event === "resultado") {
  const d = msg.data || {};
  const st = String(d.status || "").toLowerCase();
  const vf = asNum(d.vela_final);

  const placarEl = document.querySelector("[data-field='placar']");
  if (placarEl) {
    placarEl.classList.remove("green", "loss");

    if (st === "green") {
      placarEl.textContent = `GREEN${vf !== null ? " " + vf.toFixed(2) + "x" : ""}`;
      placarEl.classList.add("green");
    } else if (st === "loss") {
      placarEl.textContent = "LOSS";
      placarEl.classList.add("loss");
    } else {
      placarEl.textContent = "Aguardando…";
    }
  }

  // histórico
  addHistoricoLinha({
    ts: d.ts || new Date().toISOString(),
    status: st,
    apos_de: lastSignal?.apos_de ?? null,
    cashout: lastSignal?.cashout ?? null,
    vela_final: vf,
  });

  return;
}




    // ---- RESULTADO (card + histórico) ----
    if (msg.event === "resultado") {
      const d = msg.data || {};
      const st = String(d.status || "").toLowerCase();
      const vf = asNum(d.vela_final);
      // Dedupe no front (evita duplicar quando reenvia/recupera conexão)
      const key = _resultKey(d);
      if (_seenHistory.has(key)) {
        // já foi inserido antes; evita duplicar
        return;
      }
      _seenHistory.add(key);
      // (opcional) controla tamanho do set
      if (_seenHistory.size > MAX_HISTORY) {
        // remove o item mais antigo (forma simples)
        const first = _seenHistory.values().next().value;
        _seenHistory.delete(first);
      }


      setText("[data-field='placar']",
        st === "green" ? `GREEN${vf !== null ? " " + vf.toFixed(2) + "x" : ""}` : "LOSS"
      );

      addHistoricoLinha({
        ts: d.ts || new Date().toISOString(),
        status: st,
        apos_de: lastSignal?.apos_de ?? null,
        cashout: lastSignal?.cashout ?? null,
        vela_final: vf,
        key
      });
      return;
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
  try {
    const r = await fetch("/api/online", { cache: "no-store" });
    const j = await r.json();
    const el = document.getElementById("onlineCount");
    if (j?.ok && el) el.textContent = `· ${j.online} online`;
  } catch {}
});


  function connectSSE() {
    try { es && es.close(); } catch (_) {}
    const clientId = getClientId();
    es = new EventSource("/api/stream?v=" + Date.now() + "&clientId=" + encodeURIComponent(clientId));

    es.onopen = () => {
      setStatus(true);
      reconnectAttempts = 0;
      resetHeartbeat();
      // se ainda não temos velas, mostra analisando
      if (!ultimasVelas.length) setAnalyzing(true);
    };

    es.onmessage = (ev) => {
  resetHeartbeat();
  if (!ev.data) return;
  let msg;
  try { msg = JSON.parse(ev.data); } catch { return; }

  if (msg?.event === "online") {
    const n = msg.data?.count ?? null;
    const el = document.getElementById("onlineCount");
    if (el && n !== null) el.textContent = `· ${n} online`;
    return; // não passar para handleEvent
  }

  handleEvent(msg);
};


    es.onerror = () => {
      setStatus(false);
      try { es && es.close(); } catch (_) {}
      const backoff = Math.min(1000 * Math.pow(2, reconnectAttempts++), MAX_BACKOFF);
      setTimeout(connectSSE, backoff);
    };
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      if (!es || es.readyState === EventSource.CLOSED) {
        connectSSE();
      }
    }
  });

  // -------------------- Push: ativação --------------------
  async function activatePush() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        alert("Push não é suportado neste navegador.");
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        alert("Permita notificações para ativar o Push.");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      let vapid = (await (await fetch("/vapidPublicKey.txt", { cache: "no-store" })).text()).trim();
      vapid = vapid.replace(/[\s"']/g, "").replace(/[\u200B-\u200D\uFEFF]/g, "");
      const appServerKey = urlBase64ToUint8Array(vapid);
      if (appServerKey.length !== 65) {
        alert("Chave VAPID inválida no front. Recarregue a página.");
        return;
      }

      const old = await reg.pushManager.getSubscription();
      if (old) { try { await old.unsubscribe(); } catch {} }

      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appServerKey });

      const resp = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sub),
      });
      await resp.json();
      alert("Push ativado com sucesso!");
    } catch (e) {
      alert("Falha ao ativar Push: " + e);
    }
  }

  // -------------------- DOMContentLoaded --------------------
  document.addEventListener("DOMContentLoaded", async () => {
    // Botão de ativar push
    const btnPush = document.querySelector("[data-action='ativar-push'], #btnAtivarPush, button#ativarPush");
    if (btnPush) btnPush.addEventListener("click", activatePush);

    const cta = document.getElementById("cta-ativar-push");
    if (cta) cta.addEventListener("click", activatePush);

    // Filtros do histórico (se existirem)
    document.querySelectorAll(".filters .chip").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".filters .chip").forEach(b => b.removeAttribute("aria-pressed"));
        btn.setAttribute("aria-pressed", "true");
        const f = btn.dataset.filter;
        document.querySelectorAll(".history li").forEach(li => {
          li.style.display = (f === "all" || li.dataset.status === f) ? "" : "none";
        });
      });
    });

    // Hidrata as velas iniciais
    try {
      const res = await fetch("/api/velas", { cache: "no-store" });
      const j = await res.json();
      const arr = Array.isArray(j.valores) ? j.valores
                : Array.isArray(j.velas)   ? j.velas
                : [];
      if (arr.length) {
        ultimasVelas = arr.slice(0, MAX_VELAS);
        renderVelas(ultimasVelas);
        setAnalyzing(false);
      } else {
        setAnalyzing(true);
      }
    } catch {
      setAnalyzing(true);
    }
  });

  document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Carrega velas (mantém o que você já tem)
    const resVelas = await fetch("/api/velas", { cache: "no-store" });
    const jVelas = await resVelas.json();
    if (jVelas?.ok && Array.isArray(jVelas.velas)) {
      ultimasVelas = jVelas.velas.slice(0, MAX_VELAS);
      renderVelas(ultimasVelas);
    }

    // NOVO: carrega a última linha completa do histórico
    const resHist = await fetch("/api/ultimo-historico", { cache: "no-store" });
    const jHist = await resHist.json();
    if (jHist?.ok && jHist.data) {
      const d = jHist.data;
      const toNum = (v) => (v === null || v === undefined || v === "" ? null : Number(v));
      addHistoricoLinha({
        ts: d.ts,
        status: d.status,
        apos_de: toNum(d.apos_de),
        cashout: toNum(d.cashout),
        vela_final: toNum(d.vela_final),
      });
    }
  } catch (e) {
    console.warn("Bootstrap data load error:", e);
  }
});



  // -------------------- boot --------------------
  connectSSE();
})();
