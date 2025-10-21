(() => {
  if (window.__cashoutInit) return;
  window.__cashoutInit = true;

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

  // Histórico com cores corretas
  function addHistoricoLinha({ ts, status, apos_de, cashout, vela_final, key }) {
    let target = document.querySelector(".history[data-table='historico']");
    const isList = !!target;
    if (!target) target = document.getElementById("history-body");
    if (!target) return;

    if (key && isList && target.querySelector(`li[data-key="${key}"]`)) return;

    const hora = formatHora(ts);
    const fmtX = (n) => (n === null ? "-" : `${Number(n).toFixed(2)}x`);

    let st = (status || "").toLowerCase();
    if (st === "ganhou") st = "ganho";
    if (st === "perdeu") st = "perda";

    const statusClass = st === "ganho" ? "ganho" : st === "perda" ? "perda" : "";
    const color = st === "ganho" ? "#00ff00" : st === "perda" ? "#ff0000" : "#ffffff";
    const statusText = st ? `<span style="color:${color};font-weight:bold;">${st}</span>` : "-";

    if (isList) {
      const li = document.createElement("li");
      if (key) li.dataset.key = key;
      li.dataset.status = st;
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

      const maxRows = 50;
      while (target.children.length > maxRows) target.removeChild(target.lastElementChild);
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
    }, 150000);
  }

  let lastSignal = null;

  function handleEvent(msg) {
    if (!msg || !msg.event) return;

    if (msg.event === "resultado") {
      const d = msg.data || {};
      let st = String(d.status || "").toLowerCase();

      // Corrige nomes
      if (st === "ganhou") st = "ganho";
      if (st === "perdeu") st = "perda";

      const vf = asNum(d.vela_final);
      const key = _resultKey(d);

      if (_seenHistory.has(key)) return;
      _seenHistory.add(key);
      if (_seenHistory.size > MAX_HISTORY) {
        const first = _seenHistory.values().next().value;
        _seenHistory.delete(first);
      }

      const placarEl = document.querySelector("[data-field='placar']");
      if (placarEl) {
        placarEl.classList.remove("ganho", "perda");
        if (st === "ganho") {
          placarEl.innerHTML = `<span style="color:#00ff00;font-weight:bold;">ganho ${
            vf !== null ? vf.toFixed(2) + "x" : ""
          }</span>`;
        } else if (st === "perda") {
          placarEl.innerHTML = `<span style="color:#ff0000;font-weight:bold;">perda</span>`;
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

  function connectSSE() {
    try { es && es.close(); } catch (_) {}
    const cid = getClientId();
    es = new EventSource("/api/stream?cid=" + encodeURIComponent(cid) + "&v=" + Date.now());

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

  connectSSE();
})();
