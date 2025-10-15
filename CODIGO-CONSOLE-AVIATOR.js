// ════════════════════════════════════════════════════════════════
// 🎮 SCRIPT AVIATOR - CAPTURA DE SINAIS REAIS
// ════════════════════════════════════════════════════════════════
// ✅ Busca APENAS velas REAIS do Aviator
// ❌ NÃO gera velas falsas
// 📡 Envia para: https://bot-cyber-hacker-cashout-aviator.replit.app
// ════════════════════════════════════════════════════════════════

(function() {
  'use strict';
  
  const SERVER_URL = 'https://bot-cyber-hacker-cashout-aviator.replit.app';
  let ultimasVelasEnviadas = [];
  
  console.log('🚀 Sistema de Captura Aviator INICIADO!');
  console.log('📡 Servidor:', SERVER_URL);
  console.log('⏱️  Verificando velas a cada 2 segundos...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Função para extrair velas do DOM do Aviator
  function extrairVelasAviator() {
    try {
      // Método 1: Buscar no histórico do jogo (mais comum)
      const historicoElementos = document.querySelectorAll('.payouts-block .payout');
      
      if (historicoElementos.length > 0) {
        const velas = Array.from(historicoElementos)
          .slice(0, 5)
          .map(el => {
            const texto = el.textContent || el.innerText;
            const match = texto.match(/(\d+\.?\d*)/);
            return match ? parseFloat(match[1]) : null;
          })
          .filter(v => v !== null && v >= 1.00);
        
        if (velas.length >= 4) {
          return velas;
        }
      }
      
      // Método 2: Buscar em outra estrutura comum do Aviator
      const historicoAlt = document.querySelectorAll('[class*="history"] [class*="bubble"], [class*="History"] [class*="Bubble"]');
      
      if (historicoAlt.length > 0) {
        const velas = Array.from(historicoAlt)
          .slice(0, 5)
          .map(el => {
            const texto = el.textContent || el.innerText;
            const match = texto.match(/(\d+\.?\d*)/);
            return match ? parseFloat(match[1]) : null;
          })
          .filter(v => v !== null && v >= 1.00);
        
        if (velas.length >= 4) {
          return velas;
        }
      }
      
      // Método 3: Buscar por classe genérica de histórico
      const historicoGenerico = document.querySelectorAll('[class*="odds"], [class*="multiplier"], [class*="result"]');
      
      if (historicoGenerico.length > 0) {
        const velas = Array.from(historicoGenerico)
          .slice(0, 5)
          .map(el => {
            const texto = el.textContent || el.innerText;
            const match = texto.match(/(\d+\.?\d*)/);
            return match ? parseFloat(match[1]) : null;
          })
          .filter(v => v !== null && v >= 1.00);
        
        if (velas.length >= 4) {
          return velas;
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erro ao extrair velas:', error);
      return null;
    }
  }
  
  // Função para enviar velas para o servidor
  async function enviarVelas(velas) {
    try {
      const response = await fetch(`${SERVER_URL}/api/vela`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ valores: velas })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Velas enviadas:', velas.map(v => v.toFixed(2) + 'x').join(', '));
        return true;
      } else {
        console.error('❌ Erro no servidor:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao enviar:', error.message);
      return false;
    }
  }
  
  // Verificar e enviar velas periodicamente
  async function verificarVelas() {
    const velas = extrairVelasAviator();
    
    if (velas && velas.length >= 4) {
      // Verificar se as velas mudaram
      const velasString = velas.join(',');
      const ultimasString = ultimasVelasEnviadas.join(',');
      
      if (velasString !== ultimasString) {
        const sucesso = await enviarVelas(velas);
        
        if (sucesso) {
          ultimasVelasEnviadas = velas;
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }
      }
    } else {
      console.log('⏳ Aguardando velas do Aviator...');
    }
  }
  
  // Executar primeira verificação
  verificarVelas();
  
  // Continuar verificando a cada 2 segundos
  setInterval(verificarVelas, 2000);
  
  console.log('✅ Sistema rodando! Aguardando velas do Aviator...');
  console.log('📝 Para parar: recarregue a página');
  
})();
