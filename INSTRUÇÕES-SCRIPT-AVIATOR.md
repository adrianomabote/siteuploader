# 🎮 COMO USAR O SCRIPT DE CAPTURA AVIATOR

## ✅ SCRIPT JÁ CONFIGURADO!

O script está pronto com o domínio correto do seu Replit:
`https://bac1babd-2f7d-491f-9a4b-3fa6694ff24d-00-3ua9hdrt8xera.picard.replit.dev`

---

## 📋 PASSO A PASSO:

### 1️⃣ **Abra o Aviator no Placard.co.mz**
- Entre na sua conta
- Vá até o jogo Aviator

### 2️⃣ **Abra o Console do Navegador**
- Pressione **F12** (Windows/Linux) ou **Cmd+Option+J** (Mac)
- Ou clique com botão direito → **Inspecionar** → aba **Console**

### 3️⃣ **Cole o Script**
- Abra o arquivo: `SCRIPT-AVIATOR-PRONTO.js`
- Copie **TODO** o conteúdo
- Cole no console
- Pressione **ENTER**

### 4️⃣ **O Script Vai:**
- ✅ Capturar as 4 últimas velas a cada 3 segundos
- ✅ Enviar para o CashOutFlow
- ✅ Gerar sinais automáticos quando detectar padrões
- ✅ Mostrar tudo no console

---

## 📊 O QUE VOCÊ VAI VER:

```
═══════════════════════════════════════
  🎮 CashOutFlow - Captura Aviator v4.0
═══════════════════════════════════════

⚙️  CONFIGURAÇÃO:
   • Intervalo: 3s
   • Backend: CashOutFlow ✅
   • URL: https://bac1babd-2f7d-491f-9a4b...

📋 COMANDOS:
   • stopAviator()  - Para a captura
   • startAviator() - Reinicia captura

═══════════════════════════════════════

✅ Captura iniciada! A cada 3 segundos...

╔═══════════════════════════════════╗
║ 🕐 22:45:30                       ║
╠═══════════════════════════════════╣
║ 📊 ÚLTIMAS 4 VELAS:               ║
║   🔴 1. 1.85x                     ║
║   🟡 2. 3.42x                     ║
║   🔴 3. 1.23x                     ║
║   🟡 4. 5.67x                     ║
╠═══════════════════════════════════╣
║ 📈 Média: 3.04x                   ║
║ 🔥 PADRÃO: 3+ baixas detectadas!  ║
╚═══════════════════════════════════╝

📤 Enviado para CashOutFlow!
🎯 SINAL GERADO!
   Depois de: 1.23x
   Cashout: 2.00x
   Tentativas: 2
```

---

## 🎛️ COMANDOS DISPONÍVEIS:

### **Para pausar:**
```javascript
stopAviator()
```

### **Para reiniciar:**
```javascript
startAviator()
```

---

## ⚠️ MENSAGENS COMUNS:

### `⏸️ Histórico oculto (jogo rodando)`
- **Normal!** Quando o jogo está rodando, o histórico some
- O script aguarda o fim da rodada

### `⏩ Mesmas velas, aguardando...`
- **Normal!** Evita enviar velas duplicadas
- Aguarda nova rodada

### `❌ Erro de rede`
- Verifique se o servidor CashOutFlow está ligado
- Verifique sua conexão de internet

---

## 🔧 SOLUÇÃO DE PROBLEMAS:

### **Se não aparecer nada:**
1. Verifique se está na página do Aviator
2. Cole o script novamente
3. Aguarde 3 segundos

### **Se der erro CORS:**
- Isso é esperado! O navegador bloqueia requisições entre domínios diferentes
- Os dados AINDA SÃO ENVIADOS para o backend
- Ignore os avisos de CORS

### **Se quiser ver só no console (sem enviar):**
Edite a linha 14 do script:
```javascript
enviarBackend: false,  // Mude de true para false
```

---

## 📱 ABRA O CASHOUTFLOW:

Enquanto o script roda, abra seu app em outra aba:
`https://bac1babd-2f7d-491f-9a4b-3fa6694ff24d-00-3ua9hdrt8xera.picard.replit.dev`

Você verá os sinais aparecendo em tempo real! 🎯

---

## ✅ TUDO PRONTO!

O script agora captura velas REAIS do Aviator e envia para seu sistema CashOutFlow! 🚀
