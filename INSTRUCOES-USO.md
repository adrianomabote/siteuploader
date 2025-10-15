# 📡 Como Usar o Sistema de Sinais

## ⚠️ IMPORTANTE: Site Usa JavaScript Dinâmico

O site **https://app.sscashout.online/** usa JavaScript para mostrar as velas. Por isso, o servidor **NÃO CONSEGUE** buscar os dados diretamente (fetch só pega HTML vazio).

## ✅ SOLUÇÃO: Script no Console

Use o script que captura as velas do site e envia automaticamente para o nosso backend!

---

## 🚀 PASSO A PASSO

### 1️⃣ Abrir o Site de Sinais
Acesse: **https://app.sscashout.online/**

### 2️⃣ Abrir o Console do Navegador
- **Chrome/Edge**: `F12` ou `Ctrl+Shift+J`
- **Firefox**: `F12` ou `Ctrl+Shift+K`
- **Safari**: `Cmd+Option+C`

### 3️⃣ Colar o Script
Copie TODO o conteúdo do arquivo **`SCRIPT-SSCASHOUT-PARA-CONSOLE.js`** e cole no console.

### 4️⃣ Apertar Enter
O script vai iniciar automaticamente! Você verá:

```
═══════════════════════════════════════
  📡 Captura SSCashout → CashOutFlow
═══════════════════════════════════════

⚙️  CONFIGURAÇÃO:
   • Intervalo: 3s
   • URL: https://bot-cyber-hacker-cashout-aviator.replit.app/api/vela

📋 COMANDOS:
   • stopSSCaptura()  - Para captura
   • startSSCaptura() - Reinicia

✅ Iniciando captura a cada 3 segundos...
```

### 5️⃣ Verificar se Está Funcionando
A cada 3 segundos, o script vai:
1. **Buscar as 4 últimas velas** do site
2. **Mostrar no console** (com emojis coloridos)
3. **Enviar para o backend** do CashOutFlow
4. **Confirmar o envio** com ✅

Exemplo de saída:
```
═══════════════════════════════════════
  🕐 15:30:45 - Envio #12
═══════════════════════════════════════
📊 4 VELAS CAPTURADAS:
   🔴 1. 1.45x
   🟡 2. 2.30x
   🔴 3. 1.11x
   🟢 4. 10.50x

📈 Média: 3.84x
═══════════════════════════════════════

✅ Enviado para CashOutFlow!
   Backend confirmou: 1.45x, 2.30x, 1.11x, 10.50x
```

---

## ⏸️ PARAR A CAPTURA

Digite no console:
```javascript
stopSSCaptura()
```

Você verá:
```
🛑 Captura parada.
📊 Total de envios: 45
```

---

## ▶️ REINICIAR A CAPTURA

Digite no console:
```javascript
startSSCaptura()
```

---

## 📊 O QUE O SCRIPT FAZ

1. **Busca velas** no DOM da página a cada 3 segundos
2. **Encontra padrão** tipo "1.45x", "2.30x", etc.
3. **Filtra valores** válidos (1.00 a 99.99)
4. **Pega as 4 primeiras** velas encontradas
5. **Verifica se mudaram** (evita duplicatas)
6. **Envia via POST** para `/api/vela`
7. **Confirma no console** com feedback visual

---

## 🔧 COMO FUNCIONA O BACKEND

Quando o backend recebe as velas via `/api/vela`:

1. **Atualiza as 4 últimas velas**
2. **Analisa padrão** (média, velas baixas)
3. **Gera sinal automático** se necessário
4. **Envia via SSE** para todos os clientes conectados
5. **Mostra no dashboard** em tempo real

---

## 🎯 FLUXO COMPLETO

```
Site SSCashout → Script Console → Backend CashOutFlow → Dashboard ao Vivo
   (velas)         (captura)         (processa)          (mostra)
```

---

## ❓ PERGUNTAS FREQUENTES

### O site precisa ficar aberto?
✅ **SIM!** O script só funciona enquanto a aba do site estiver aberta.

### Posso fechar o console?
✅ **SIM!** O script continua rodando mesmo com o console fechado.

### Preciso colar o script toda vez?
⚠️ **SIM!** Se recarregar a página, precisa colar novamente.

### Quantas pessoas podem usar?
✅ **ILIMITADAS!** Cada pessoa cola o script no seu navegador.

### O que acontece se o site mudar o layout?
⚠️ O script pode parar de funcionar. Nesse caso, atualize o seletor DOM.

---

## 🛠️ ALTERNATIVAS (FUTURAS)

Se quiser **automatizar 100%** sem precisar do navegador:

1. **Puppeteer/Playwright** - Browser headless no servidor
2. **Scraper com renderização JS** - Fetch + JS engine
3. **API direta** - Se o site oferecer

Mas a solução atual **funciona perfeitamente** e é mais simples! 🎉

---

## 📞 SUPORTE

Caso tenha problemas:
1. Verifique se o site carregou completamente
2. Confira se há velas visíveis na página
3. Veja se há erros no console
4. Teste manualmente: `buscarVelas()`

---

**Sistema desenvolvido por CYBER HACKER OFFICE** 🚀
