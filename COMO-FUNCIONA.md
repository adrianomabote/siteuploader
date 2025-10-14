# 📖 COMO FUNCIONA O SISTEMA DE CAPTURA DE VELAS

## 🎯 RESUMO:

**Script do Console** → Captura velas do Aviator → **Envia para `/api/vela`** → Seu site mostra os sinais!

---

## 📊 1. ENDPOINT QUE RECEBE AS VELAS

### **URL:**
```
https://bot-cyber-hacker-cashout-aviator.replit.app/api/vela
```

### **Método:** 
`POST`

### **Formato aceito:**
```json
{
  "valores": [1.85, 3.42, 1.23, 5.67]
}
```

### **Resposta:**
```json
{
  "ok": true,
  "velas": [1.85, 3.42, 1.23, 5.67]
}
```

---

## 🔧 2. O QUE ACONTECE NO BACKEND

**Arquivo:** `server/routes.ts` (linha 405)

```typescript
app.post("/api/vela", express.json(), (req, res) => {
  const { valores } = req.body;
  
  if (valores && Array.isArray(valores)) {
    // 1. Salva as velas
    ultimasVelas = valores.slice(0, 5);
    
    // 2. Envia para todos os clientes conectados (SSE)
    broadcast("velas", { velas: ultimasVelas });
    
    // 3. Analisa padrões e gera sinais
    // (isso acontece automaticamente em outra função)
  }
  
  res.json({ ok: true, velas: ultimasVelas });
});
```

### **Fluxo:**
1. ✅ Recebe array de velas
2. ✅ Atualiza variável `ultimasVelas`
3. ✅ Faz **broadcast** para todos clientes conectados
4. ✅ Sistema analisa padrões e gera sinais
5. ✅ Frontend mostra em tempo real

---

## 🎮 3. COMO O SCRIPT DO CONSOLE ENVIA

```javascript
// Captura 4 velas do Aviator
const velas = [1.85, 3.42, 1.23, 5.67];

// Envia para o backend
fetch('https://bot-cyber-hacker-cashout-aviator.replit.app/api/vela', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ valores: velas })
});
```

---

## 📱 4. FRONTEND RECEBE EM TEMPO REAL

**Arquivo:** `client/src/App.tsx`

O frontend conecta via **SSE (Server-Sent Events)** e recebe atualizações:

```typescript
// Conecta ao stream
const eventSource = new EventSource('/api/stream');

// Escuta evento "velas"
eventSource.addEventListener('velas', (e) => {
  const data = JSON.parse(e.data);
  console.log('Velas recebidas:', data.velas);
  // Atualiza interface
});
```

---

## 🔄 FLUXO COMPLETO:

```
1. AVIATOR (Placard.co.mz)
   └─> 🎲 Velas: 1.85, 3.42, 1.23, 5.67
        │
2. SCRIPT DO CONSOLE
   └─> 📤 POST /api/vela
        │         { valores: [1.85, 3.42, 1.23, 5.67] }
        │
3. BACKEND (server/routes.ts)
   ├─> 💾 Salva: ultimasVelas = [1.85, 3.42, 1.23, 5.67]
   ├─> 📡 Broadcast SSE: broadcast("velas", ...)
   └─> 🤖 Analisa padrões → Gera sinal
        │
4. FRONTEND (client/src/App.tsx)
   └─> 📱 Recebe via SSE
   └─> 🎯 Mostra sinal na tela
```

---

## ✅ TESTANDO O ENDPOINT

### **Teste manual (terminal):**
```bash
curl -X POST https://bot-cyber-hacker-cashout-aviator.replit.app/api/vela \
  -H "Content-Type: application/json" \
  -d '{"valores": [1.50, 2.30, 1.10, 3.40]}'
```

**Resposta esperada:**
```json
{
  "ok": true,
  "velas": [1.50, 2.30, 1.10, 3.40]
}
```

### **Teste com o script:**
1. Abra o console do Aviator (F12)
2. Cole o script `SCRIPT-CONSOLE-AVIATOR.js`
3. Aguarde 3 segundos
4. Veja as velas sendo enviadas!

---

## 🎯 RESUMO TÉCNICO:

| Item | Detalhe |
|------|---------|
| **Endpoint** | `POST /api/vela` |
| **Formato** | `{ valores: [num, num, num, num] }` |
| **Backend** | `server/routes.ts` linha 405 |
| **Broadcast** | SSE para todos clientes |
| **Frontend** | Recebe via `/api/stream` |
| **Análise** | Automática após receber velas |
| **Resultado** | Sinais em tempo real! |

---

## 📍 ARQUIVOS IMPORTANTES:

- `server/routes.ts` → Recebe velas e gera sinais
- `client/src/App.tsx` → Mostra sinais na interface
- `SCRIPT-CONSOLE-AVIATOR.js` → Captura velas do Aviator

---

**Tudo pronto! Agora você sabe exatamente como o sistema funciona!** 🚀
