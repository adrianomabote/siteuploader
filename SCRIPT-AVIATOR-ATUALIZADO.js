
/**
 * 🎮 SCRIPT DE CAPTURA - CASHOUTFLOW
 * Envio automático para API própria
 * 
 * COMO USAR:
 * 1. Abra o Aviator (Placard ou outro)
 * 2. Pressione F12 → Console
 * 3. Cole este código e pressione ENTER
 * 4. Para parar: stopAviator()
 */

(function() {
  console.clear();
  console.log('═══════════════════════════════════════');
  console.log('  🎮 CashOutFlow - Captura Aviator');
  console.log('═══════════════════════════════════════\n');
  
  // ⚙️ CONFIGURAÇÃO
  const CONFIG = {
    intervalo: 5000,  // 5 segundos
    urlBackend: 'https://bot-cyber-hacker-cashout-aviator.replit.app/api/vela',
    tentativasReconexao: 3
  };
  
  let contagemCaptura = 0;
  let ultimasVelasEnviadas = null;
  window.aviatorInterval = null;
  
  /**
   * 🔍 BUSCA AS VELAS DO HISTÓRICO
   */
  function buscarVelas() {
    const todosElementos = document.querySelectorAll('body *');
    const candidatos = Array.from(todosElementos).filter(el => {
      const texto = el.textContent?.trim();
      const match = texto?.match(/^(\d{1,2}\.\d{2})x?$/i);
      if (!match) return false;
      
      const valor = parseFloat(match[1]);
      return valor >= 1.00 && valor <= 99.99 && el.children.length === 0;
    });
    
    return candidatos.slice(0, 4).map(el => {
      const texto = el.textContent.trim();
      const match = texto.match(/(\d+\.\d{2})/);
      return match ? parseFloat(match[1]) : null;
    }).filter(v => v !== null);
  }
  
  /**
   * 📤 ENVIA PARA O BACKEND
   */
  async function enviarParaBackend(velas) {
    try {
      const response = await fetch(CONFIG.urlBackend, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valores: velas })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Enviado com sucesso!');
        if (data.velas) {
          console.log('   Backend:', data.velas.map(v => v.toFixed(2) + 'x').join(', '));
        }
        return true;
      } else {
        console.warn('⚠️ Erro HTTP:', response.status);
        return false;
      }
    } catch (erro) {
      console.error('❌ Erro de conexão:', erro.message);
      return false;
    }
  }
  
  /**
   * 📊 CAPTURA E PROCESSA
   */
  async function executarCaptura() {
    contagemCaptura++;
    const velas = buscarVelas();
    
    if (velas.length === 4) {
      const velasString = velas.join(',');
      
      if (velasString === ultimasVelasEnviadas) {
        console.log(`⏩ #${contagemCaptura}: Mesmas velas, aguardando...`);
        return;
      }
      
      ultimasVelasEnviadas = velasString;
      
      const timestamp = new Date().toLocaleTimeString('pt-PT');
      console.log('\n╔═══════════════════════════════════╗');
      console.log(`║ 🕐 ${timestamp} - #${contagemCaptura}`.padEnd(36) + '║');
      console.log('╠═══════════════════════════════════╣');
      console.log('║ 🛩️ VELAS CAPTURADAS:              ║');
      velas.forEach((v, i) => {
        const emoji = v < 2.0 ? '🔴' : v < 10.0 ? '🟡' : '🟢';
        console.log(`║   ${emoji} ${i+1}. ${v.toFixed(2)}x`.padEnd(36) + '║');
      });
      console.log('╚═══════════════════════════════════╝\n');
      
      await enviarParaBackend(velas);
      
    } else if (velas.length === 0) {
      console.log(`⏸️  #${contagemCaptura}: Aguardando histórico...`);
    } else {
      console.log(`⚠️ #${contagemCaptura}: ${velas.length} velas (esperado: 4)`);
    }
  }
  
  /**
   * ⏹️ PARAR CAPTURA
   */
  window.stopAviator = function() {
    if (window.aviatorInterval) {
      clearInterval(window.aviatorInterval);
      window.aviatorInterval = null;
      console.log('\n🛑 Captura parada!');
    }
  };
  
  /**
   * ▶️ INICIAR CAPTURA
   */
  window.startAviator = function() {
    if (window.aviatorInterval) {
      console.log('⚠️ Já está rodando!');
      return;
    }
    
    executarCaptura();
    window.aviatorInterval = setInterval(executarCaptura, CONFIG.intervalo);
    console.log(`✅ Captura iniciada! (a cada ${CONFIG.intervalo/1000}s)`);
  };
  
  // Parar qualquer captura anterior
  if (window.aviatorInterval) {
    clearInterval(window.aviatorInterval);
  }
  
  // Iniciar automaticamente
  window.startAviator();
  
})();
