# 🎮 Como Usar o Script de Captura de Velas do Aviator

## 📋 O que faz?

Este script captura automaticamente as últimas 4 velas do jogo Aviator (Placard.co.mz) a cada 3 segundos, direto do seu navegador.

---

## 🚀 Opções de Script

### **Opção 1: Script Básico** (Recomendado para iniciantes)
- 📁 Arquivo: `aviator-console-script.js`
- ✅ Só mostra no console
- ⚡ Simples e rápido

### **Opção 2: Script Avançado** (Com envio para backend)
- 📁 Arquivo: `aviator-console-com-envio.js`
- ✅ Mostra no console
- 📤 Pode enviar dados para seu servidor
- 📊 Análise mais detalhada

---

## 📖 Passo a Passo

### **1️⃣ Abra o arquivo do script**

Escolha qual script usar e abra no seu editor de texto (Notepad, VSCode, etc):

```
aviator-console-script.js          ← Script básico
aviator-console-com-envio.js       ← Script avançado
```

### **2️⃣ Copie TODO o código**

- Pressione `Ctrl+A` (selecionar tudo)
- Pressione `Ctrl+C` (copiar)

### **3️⃣ Abra o site do Aviator**

- Acesse: **https://placard.co.mz**
- Entre no jogo **Aviator**
- Aguarde o jogo carregar completamente

### **4️⃣ Abra o Console do Navegador**

Pressione:
- **F12** (Chrome, Firefox, Edge)
- Ou clique com botão direito → **Inspecionar** → aba **Console**

### **5️⃣ Cole o código no Console**

- Clique dentro da área do console
- Pressione `Ctrl+V` (colar)
- Pressione **ENTER**

### **6️⃣ Veja a mágica acontecer! ✨**

O script vai começar a capturar as velas automaticamente:

```
═══════════════════════════════════════
  CashOutFlow - Captura de Velas v2.0  
═══════════════════════════════════════

╔═══════════════════════════════════════╗
║ 🕐 14:32:15                           ║
╠═══════════════════════════════════════╣
║ 📊 ÚLTIMAS 4 VELAS:                   ║
║   🔴 1. 1.85x                         ║
║   🟡 2. 3.42x                         ║
║   🔴 3. 1.23x                         ║
║   🟡 4. 5.67x                         ║
╠═══════════════════════════════════════╣
║ 📈 Média: 3.04x                       ║
║ ⬆️  Máxima: 5.67x                     ║
║ ⬇️  Mínima: 1.23x                     ║
╠═══════════════════════════════════════╣
║ 🟢 POSSÍVEL ENTRADA (3+ baixas)       ║
╚═══════════════════════════════════════╝
```

---

## ⚙️ Comandos Disponíveis

### 📌 **Comandos do Script BÁSICO:**

Se você usou `aviator-console-script.js`:

```javascript
stopAviator()   // Para a captura
startAviator()  // Reinicia a captura
```

---

### 📌 **Comandos do Script AVANÇADO:**

Se você usou `aviator-console-com-envio.js`:

```javascript
stopAviator()   // Para a captura
startAviator()  // Reinicia a captura

// 🎛️ EXCLUSIVO DO AVANÇADO: Alterar configurações
configAviator({ intervaloCaptura: 5000 })  // Mudar para 5 segundos
configAviator({ quantidadeVelas: 6 })      // Capturar 6 velas

// Ativar envio para o backend
configAviator({ 
  enviarParaBackend: true,
  urlBackend: 'https://seu-servidor.replit.app/api/velas-capturadas'
})
```

**⚠️ IMPORTANTE:** O comando `configAviator()` só existe no script AVANÇADO!

---

## 🔧 Configurações Avançadas

Se o script não estiver encontrando as velas, você pode precisar ajustar os **seletores CSS**:

### **Como descobrir o seletor correto:**

1. No site do Aviator, abra o **Console** (F12)
2. Clique na **seta de inspeção** (canto superior esquerdo)
3. Clique em uma **vela** no histórico do jogo
4. No painel de elementos, veja a **classe** ou **ID** do elemento
5. Ajuste o script com esse seletor

**Exemplo:**
```javascript
// Se descobriu que as velas têm classe "game-result"
const velas = document.querySelectorAll('.game-result');
```

---

## 📤 Enviando Dados para o Backend (Opcional)

Se quiser registrar os dados capturados no seu servidor:

### **1. No backend, crie a rota:**

Edite o arquivo `server/routes.ts` e adicione:

```typescript
// Receber velas capturadas do console
app.post('/api/velas-capturadas', async (req, res) => {
  const { timestamp, velas, media, sinal } = req.body;
  
  console.log('📊 Velas recebidas:', velas);
  
  // Opcional: salvar no banco de dados
  // await storage.salvarVelas({ timestamp, velas, media, sinal });
  
  res.json({ success: true, mensagem: 'Velas recebidas!' });
});
```

### **2. Configure o script:**

No arquivo `aviator-console-com-envio.js`, altere:

```javascript
const CONFIG = {
  enviarParaBackend: true,  // ← Mudar para true
  urlBackend: 'https://seu-app.replit.app/api/velas-capturadas',
};
```

---

## ⚠️ Problemas Comuns

### **❌ "Nenhuma vela encontrada"**

**Causa:** Script não encontrou os elementos no DOM

**Solução:**
1. Verifique se está na página do jogo Aviator
2. Aguarde o jogo carregar completamente
3. Ajuste os seletores CSS (veja seção "Configurações Avançadas")

---

### **❌ "Valores não extraídos"**

**Causa:** Formato dos valores está diferente

**Solução:**
Ajuste a função `extrairValor()` no script:

```javascript
function extrairValor(elemento) {
  const texto = elemento.textContent;
  // Ajuste o regex conforme o formato no site
  const match = texto.match(/(\d+\.\d{2})/); // Ex: "2.50x"
  return match ? parseFloat(match[1]) : null;
}
```

---

### **❌ Erro ao enviar para backend**

**Causa:** CORS bloqueando a requisição

**Solução:**
No backend (`server/index.ts`), adicione:

```typescript
import cors from 'cors';

app.use(cors({
  origin: 'https://placard.co.mz',
  methods: ['POST']
}));
```

---

## 💡 Dicas

1. **Mantenha o console aberto** enquanto o script roda
2. **Não feche a aba** do Aviator
3. **Anote os sinais** que aparecerem como "🟢 POSSÍVEL ENTRADA"
4. Use `stopAviator()` se o navegador ficar lento

---

## 📞 Suporte

Se precisar de ajuda:
1. Tire um print do erro no console
2. Envie o print com a descrição do problema
3. Inclua qual navegador está usando (Chrome, Firefox, etc)

---

## ⚡ Próximos Passos

Quer automatizar ainda mais? Podemos adicionar:

- 🔔 Notificações sonoras quando detectar padrão
- 📊 Gráfico visual das velas em tempo real
- 💾 Exportar histórico para Excel/CSV
- 🤖 Análise inteligente com Machine Learning

---

**Boas análises! 🎰🚀**
