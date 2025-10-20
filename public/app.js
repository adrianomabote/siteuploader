(() => {
  if (window.__cashoutInit) return;
  window.__cashoutInit = true;

  // URL externa para obter velas
  const VELAS_API_URL = "https://app.sscashout.online/api/velas";

  const _seenHistory = new Set();
  const MAX_HISTORY = 100;

  function _resultKey(d) {
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

  function urlBase64ToUint8Array(base64String) {
    const s = base64String.replace(/[\s"']/g, "").replace(/[\u200B-\u200D\uFEFF]/g, "");
    const padding = "=".repeat((4 - s.length % 4) % 4);
    const base64 = (s + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
    return out;
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
      timeZone: "Africa/Johannesburg",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function setStatus(online) {
    const pill = document.querySelector("[data-status='realtime']");
    if (pill) {
      pill.classList.toggle("bg-green-600", online);
      pill.classList.toggle("bg-yellow-600", !online);
    }

    const subtitle = document.querySelector("[data-subtitle='connection']");
    if (subtitle) subtitle.textContent = online ? "Aguarde entrada" : "Conectando ...";
  }

  const MAX_VELAS = 5;
  let ultimasVelas = [];
  let analyzingTimer = null;

  const elVelas = document.getElementById("velas");
  const elVelasStatus = document.getElementById("velas-status");

  function setAnalyzing() {
    const el = document.getElementById("velas-status");
    if (!el) return;
    el.classList.add("analisando");
  }

  document.addEventListener("DOMContentLoaded", () => setAnalyzing(true));

  function renderVelas(arr) {
    if (!elVelas) return;
    const list = (arr || []).slice(0, MAX_VELAS);
    elVelas.innerHTML = list
      .map((v) => {
        const n = Number(v);
        const txt = Number.isFinite(n) ? n.toFixed(2) + "x" : "-";
        const isRed = Number.isFinite(n) && n < 2;
        const fg = isRed ? "#ff5c5c" : "#36d27a";
        return `<li class="vela-pill" style="color:${fg}">${txt}</li>`;
      })
      .join("");
  }

  function addHistoricoLinha({ ts, status, apos_de, cashout, vela_final, key }) {
    let target = document.querySelector(".history[data-table='historico']");
    const isList = !!target;
    if (!target) target = document.getElementById("history-body");
    if (!target) return;

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

      const maxRows = 50;
      while (target.children.length > maxRows) target.removeChild(target.lastElementChild);
    } else {
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
      const maxRows = 50;
      while (target.rows && target.rows.length > maxRows) target.deleteRow(-1);
    }
  }

  let es = null, reconnectAttempts = 0, heartbeatTimer = null;
  const MAX_BACKOFF = 15000;

  function resetHeartbeat() {
    clearTimeout(heartbeatTimer);
    heartbeatTimer = setTimeout(() => {
      try { es && es.close(); } catch (_) {}
      setStatus(false);
      connectSSE();
    }, 150000); // 2.5 minutos - reduz reconexões desnecessárias
  }

  let lastSignal = null;

  function handleEvent(msg) {
    if (!msg || !msg.event) return;

    if (msg.event === "vela" || msg.event === "velas") {
      const d = msg.data || {};

      let serie = null;
      if (Array.isArray(d.valores)) serie = d.valores;
      else if (Array.isArray(d.velas)) serie = d.velas;

      if (serie) {
        let arr = serie.map(Number).filter(Number.isFinite);

        if (ultimasVelas.length && arr.length) {
          const head = ultimasVelas[0];
          const firstMatch = Math.abs(arr[0] - head) < 1e-9;
          const lastMatch  = Math.abs(arr[arr.length - 1] - head) < 1e-9;
          if (!firstMatch && lastMatch) {
            arr.reverse();
          }
        } else {
          arr.reverse();
        }

        ultimasVelas = arr.slice(0, MAX_VELAS);
        renderVelas(ultimasVelas);
        setAnalyzing(ultimasVelas.length === 0);
        return;
      }

      const unit = d.valor ?? d.vela ?? d.value ?? d.v;
      const n = Number(unit);
      if (Number.isFinite(n)) {
        ultimasVelas.unshift(n);
        ultimasVelas = ultimasVelas.slice(0, MAX_VELAS);
        renderVelas(ultimasVelas);
        setAnalyzing(false);
      }
      return;
    }

    if (msg.event === "servidor_status") {
      const d = msg.data || {};
      const statusEl = document.getElementById("velas-status");
      if (statusEl) {
        if (d.online) {
          statusEl.textContent = "Analisando velas";
          statusEl.classList.remove("servidor-offline");
        } else {
          statusEl.textContent = "Aguardando servidor de sinais";
          statusEl.classList.add("servidor-offline");
        }
      }
      return;
    }

    if (msg.event === "sinal") {
      const d = msg.data || {};
      const apos = asNum(d.apos_de);
      const cash = asNum(d.cashout);
      const gales = asNum(d.max_gales);

      setText("[data-field='apos_de']", fmtX(apos));
      setText("[data-field='cashout']", fmtX(cash));

      const galeEl = document.querySelector("[data-field='max_gales']");
      if (galeEl) {
        if (gales === null) {
          galeEl.textContent = "-";
        } else {
          const galeFmt = `<br>${gales} ${gales === 1 ? "vez" : ""}`;
          galeEl.innerHTML = galeFmt;
        }
      }

      const placarEl = document.querySelector("[data-field='placar']");
      if (placarEl) {
        placarEl.classList.remove("green", "loss");
        placarEl.textContent = "Aguardando…";
      }

      lastSignal = { apos_de: apos, cashout: cash, ts: d.ts || new Date().toISOString() };
      return;
    }

    if (msg.event === "resultado") {
      const d = msg.data || {};
      const st = String(d.status || "").toLowerCase();
      const vf = asNum(d.vela_final);

      const key = _resultKey(d);
      if (_seenHistory.has(key)) {
        return;
      }
      _seenHistory.add(key);
      if (_seenHistory.size > MAX_HISTORY) {
        const first = _seenHistory.values().next().value;
        _seenHistory.delete(first);
      }

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
      if (j?.ok && el) el.textContent = `• ${j.online} online`;
    } catch {}
  });

  function connectSSE() {
    try { es && es.close(); } catch (_) {}
    const cid = getClientId();
    es = new EventSource("/api/stream?cid=" + encodeURIComponent(cid) + "&v=" + Date.now());

    es.onopen = () => {
      setStatus(true);
      reconnectAttempts = 0;
      resetHeartbeat();
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
        if (el && n !== null) el.textContent = `• ${n} online`;
        return;
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
    if (document.visibilityState === "visible") connectSSE();
  });

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

  document.addEventListener("DOMContentLoaded", async () => {
    const btnPush = document.querySelector("[data-action='ativar-push'], #btnAtivarPush, button#ativarPush");
    if (btnPush) btnPush.addEventListener("click", activatePush);

    const cta = document.getElementById("cta-ativar-push");
    if (cta) cta.addEventListener("click", activatePush);

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

    try {
      const res = await fetch(VELAS_API_URL, { cache: "no-store" });
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
      const resVelas = await fetch(VELAS_API_URL, { cache: "no-store" });
      const jVelas = await resVelas.json();
      if (jVelas?.ok && Array.isArray(jVelas.velas)) {
        ultimasVelas = jVelas.velas.slice(0, MAX_VELAS);
        renderVelas(ultimasVelas);
      }

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

  connectSSE();
})();
