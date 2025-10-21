(() => {
  if (window.__cashoutInit) return;
  window.__cashoutInit = true;

  const _seenHistory = new Set();
  const MAX_HISTORY = 100;
  const MAX_VELAS = 5;
  let ultimasVelas = [];
  let lastSignal = null;
  let es = null, reconnectAttempts = 0, heartbeatTimer = null;
  const MAX_BACKOFF = 15000;

  const $ = (sel) => document.querySelector(sel);
  const asNum = (v) => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (!s || s === "-") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };
  const fmtX = (n) => (n === null ? "-" : `${Number(n).toFixed(2)}x`);

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

  function renderVelas(arr) {
    const elVelas = document.getElementById("velas");
    if (!elVelas) return;
    const list = (arr || []).slice(-MAX_VELAS);
    elVelas.innerHTML = list
      .map((v) => {
        const n = Number(v);
        const txt = Number.isFinite(n) ? n.toFixed(2) + "x" : "-";
        const fg = Number.isFinite(n) && n < 2 ? "#ff5c5c" : "#36d27a";
        return `<li class="vela-pill" style="color:${fg}">${txt}</li>`;
      })
      .join("");
  }

  function addHistoricoLinha({ ts, status, apos_de, cashout, vela_final, key }) {
    let target = document.querySelector(".history[data-table='historico']") || document.getElementById("history-body");
    if (!target) return;

    if (key && target.querySelector(`li[data-key="${key}"]`)) return;

    const hora = formatHora(ts);
    let st = (status || "").toLowerCase();
    if (st === "ganhou") st = "ganho";
    if (st === "perdeu" || st === "loss") st = "perda";
    const color = st === "ganho" ? "#00ff00" : st === "perda" ? "#ff0000" : "#ffffff";

    if (target.tagName.toLowerCase() === "ul") {
      const li = document.createElement("li");
      if (key) li.dataset.key = key;
      li.innerHTML = `
        <div class="time">${hora}</div>
        <div class="meta">
          <span class="chip">Apos: ${fmtX(apos_de)}</span>
          <span class="chip">Cash: ${fmtX(cashout)}</span>
          <span class="chip">Vela: ${fmtX(vela_final)}</span>
        </div>
        <div class="badge pill" style="color:${color};font-weight:bold;">${st}</div>
      `;
      target.prepend(li);
      while (target.children.length > 50) target.removeChild(target.lastElementChild);
    } else {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${hora}</td>
        <td>${fmtX(apos_de)}</td>
        <td>${fmtX(cashout)}</td>
        <td style="color:${color};font-weight:bold;">${st}</td>
        <td>${fmtX(vela_final)}</td>
      `;
      target.prepend(tr);
      while (target.rows.length > 50) target.deleteRow(-1);
    }
  }

  function handleEvent(msg) {
    if (!msg || !msg.event) return;

    if (msg.event === "vela" || msg.event === "velas") {
      const valores = msg.data?.valores ?? msg.data?.velas;
      if (Array.isArray(valores)) {
        ultimasVelas = valores.slice(-MAX_VELAS);
        renderVelas(ultimasVelas);
      }
      return;
    }

    if (msg.event === "resultado") {
      const d = msg.data || {};
      let st = String(d.status || "").toLowerCase();
      if (st === "ganhou") st = "ganho";
      if (st === "perdeu" || st === "loss") st = "perda";

      const vf = asNum(d.vela_final);
      const key = d.id ? `${d.id}|${st}|${vf}` : `${Date.now()}|${st}`;
      if (_seenHistory.has(key)) return;
      _seenHistory.add(key);
      if (_seenHistory.size > MAX_HISTORY) _seenHistory.delete(_seenHistory.values().next().value);

      const placarEl = document.querySelector("[data-field='placar']");
      if (placarEl) {
        placarEl.classList.remove("ganho", "perda");
        if (st === "ganho") placarEl.innerHTML = `<span style="color:#00ff00;font-weight:bold;">ganho ${vf !== null ? vf.toFixed(2) + "x" : ""}</span>`;
        else if (st === "perda") placarEl.innerHTML = `<span style="color:#ff0000;font-weight:bold;">perda</span>`;
        else placarEl.textContent = "Aguardando…";
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

  async function loadVelas() {
    try {
      const res = await fetch("/api/velas", { cache: "no-store" });
      const j = await res.json();
      const arr = Array.isArray(j.valores) ? j.valores : Array.isArray(j.velas) ? j.velas : [];
      if (arr.length) {
        ultimasVelas = arr.slice(-MAX_VELAS);
        renderVelas(ultimasVelas);
      }
    } catch (e) {
      console.warn("Erro ao carregar velas:", e);
    }
  }

  function resetHeartbeat() {
    clearTimeout(heartbeatTimer);
    heartbeatTimer = setTimeout(() => {
      try { es && es.close(); } catch (_) {}
      setStatus(false);
      connectSSE();
    }, 150000);
  }

  function connectSSE() {
    try { es && es.close(); } catch (_) {}
    es = new EventSource("/api/stream?v=" + Date.now());

    es.onopen = () => {
      setStatus(true);
      reconnectAttempts = 0;
      resetHeartbeat();
    };

    es.onmessage = (ev) => {
      resetHeartbeat();
      if (!ev.data) return;
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      handleEvent(msg);
    };

    es.onerror = () => {
      setStatus(false);
      try { es && es.close(); } catch (_) {}
      const backoff = Math.min(1000 * Math.pow(2, reconnectAttempts++), MAX_BACKOFF);
      setTimeout(connectSSE, backoff);
    };
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await loadVelas();
    connectSSE();
  });
})();
