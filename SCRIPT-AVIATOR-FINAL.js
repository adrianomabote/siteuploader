/**
 * 🎮 CAPTURA AVIATOR - CashOutFlow
 * Cole no console do Placard.co.mz (Aviator)
 * 
 * Busca as 4 velas mais recentes e envia para:
 * https://bot-cyber-hacker-cashout-aviator.replit.app
 */

(function() {
  console.clear();
  console.log('═══════════════════════════════════════');
  console.log('  🎮 CashOutFlow - Captura Aviator');
  console.log('  📡 Enviando para seu Replit');
  console.log('═══════════════════════════════════════\n');
  
  // ⚙️ CONFIGURAÇÃO
  const CONFIG = {
    intervalo: 5000,  // 5 segundos (igual ao seu código)
    urlBackend: 'https://bot-cyber-hacker-cashout-aviator.replit.app/api/vela',
    seletor: 'div.payout.ng-star-inserted',  // Seletor correto do Placard!
    quantidadeVelas: 4,  // Só 4 velas
  };
  
  let contagemEnvios = 0;
  let ultimasVelasEnviadas = null;
  let intervalId = null;
  
  /**
   * 🔍 BUSCA AS VELAS USANDO SEU SELETOR
   */
  function buscarVelas() {
    // Usar o seletor exato que você descobriu!
    const nodes = Array.from(document.querySelectorAll(CONFIG.seletor));
    
    // Pegar as 4 primeiras (mais recentes)
    const ultimasRodadas = nodes
      .slice(0, CONFIG.quantidadeVelas)
      .map(el => el.textContent.trim());
    
    // Converter para números (ex: "2.30x" → 2.30)
    const velasNumericas = ultimasRodadas.map(vela => {
      const match = vela.match(/(\d+\.\d{2})/);
      return match ? parseFloat(match[1]) : null;
    }).filter(v => v !== null);
    
    return velasNumericas;
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
          console.log('   Backend confirmou:', data.velas.map(v => v.toFixed(2) + 'x').join(', '));
        }
      } else {
        console.warn('⚠️ Erro ao enviar (status:', response.status, ')');
      }
    } catch (erro) {
      console.error('❌ Erro de conexão:', erro.message);
    }
  }
  
  /**
   * 📊 CAPTURA E PROCESSA
   */
  async function executarCaptura() {
    contagemEnvios++;
    const velas = buscarVelas();
    
    if (velas.length === CONFIG.quantidadeVelas) {
      // Verificar se mudaram
      const velasString = velas.join(',');
      if (velasString === ultimasVelasEnviadas) {
        console.log(`⏩ #${contagemEnvios}: Mesmas velas, aguardando próxima rodada...`);
        return;
      }
      
      ultimasVelasEnviadas = velasString;
      
      // Mostrar no console
      console.clear();
      console.log('═══════════════════════════════════════');
      console.log(`  🕐 ${new Date().toLocaleTimeString('pt-PT')} - Envio #${contagemEnvios}`);
      console.log('═══════════════════════════════════════');
      console.log('🛩️ 4 RODADAS MAIS RECENTES DO AVIATOR:');
      velas.forEach((v, i) => {
        const emoji = v < 2.0 ? '🔴' : v < 10.0 ? '🟡' : '🟢';
        console.log(`   ${emoji} ${i + 1}. ${v.toFixed(2)}x`);
      });
      
      const media = (velas.reduce((a,b) => a+b, 0) / velas.length).toFixed(2);
      const baixas = velas.filter(v => v < 2.0).length;
      
      console.log(`\n📈 Média: ${media}x`);
      if (baixas >= 3) {
        console.log('🔥 ALERTA: 3+ velas baixas! Possível sinal!');
      } else if (baixas >= 2) {
        console.log('⚠️  ATENÇÃO: 2 velas baixas');
      }
      console.log('═══════════════════════════════════════\n');
      
      // Enviar para o backend
      await enviarParaBackend(velas);
      
    } else if (velas.length === 0) {
      console.log(`⏸️  #${contagemEnvios}: Nenhuma vela encontrada (jogo rodando?)`);
    } else {
      console.warn(`⚠️ #${contagemEnvios}: Encontradas ${velas.length} velas (esperado: ${CONFIG.quantidadeVelas})`);
    }
  }
  
  /**
   * ⏹️ PARAR CAPTURA
   */
  window.stopAviatorCaptura = function() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
      console.log('\n🛑 Captura parada.');
      console.log(`📊 Total de envios: ${contagemEnvios}\n`);
    } else {
      console.log('⚠️ Nenhuma captura ativa.');
    }
  };
  
  /**
   * ▶️ INICIAR CAPTURA
   */
  window.startAviatorCaptura = function() {
    if (intervalId) {
      console.log('⚠️ Já está rodando. Use stopAviatorCaptura() para parar.');
      return;
    }
    
    contagemEnvios = 0;
    ultimasVelasEnviadas = null;
    console.log('✅ Iniciando captura a cada 5 segundos...\n');
    
    // Executar imediatamente
    executarCaptura();
    
    // Depois a cada 5 segundos
    intervalId = setInterval(executarCaptura, CONFIG.intervalo);
  };
  
  // 📋 INSTRUÇÕES
  console.log('⚙️  CONFIGURAÇÃO:');
  console.log(`   • Seletor: ${CONFIG.seletor}`);
  console.log(`   • Intervalo: ${CONFIG.intervalo / 1000}s`);
  console.log(`   • Velas: ${CONFIG.quantidadeVelas}`);
  console.log(`   • URL: ${CONFIG.urlBackend}`);
  console.log('\n📋 COMANDOS:');
  console.log('   • stopAviatorCaptura()  - Para a captura');
  console.log('   • startAviatorCaptura() - Reinicia');
  console.log('\n═══════════════════════════════════════\n');
  
  // 🚀 INICIAR AUTOMATICAMENTE
  window.startAviatorCaptura();
  
})();
