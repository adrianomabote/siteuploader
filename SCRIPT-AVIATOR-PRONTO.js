/**
 * ✅ SCRIPT PRONTO - Captura Velas do Aviator para CashOutFlow
 * Cole este código no console do Placard.co.mz
 * Versão: 4.0 - Configurado para seu Replit
 */

(function() {
  console.clear();
  console.log('═══════════════════════════════════════');
  console.log('  🎮 CashOutFlow - Captura Aviator v4.0');
  console.log('═══════════════════════════════════════\n');
  
  // ⚙️ CONFIGURAÇÃO AUTOMÁTICA
  const CONFIG = {
    intervalo: 3000,  // 3 segundos
    // URL do seu backend no Replit
    urlBackend: 'https://bac1babd-2f7d-491f-9a4b-3fa6694ff24d-00-3ua9hdrt8xera.picard.replit.dev/api/vela',
    enviarBackend: true,
  };
  
  let contagemCaptura = 0;
  let ultimasVelasEnviadas = null;
  window.aviatorInterval = null;
  
  /**
   * 🔍 BUSCA AS 4 VELAS DO HISTÓRICO
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
    
    // Pegar as primeiras 4
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
    if (!CONFIG.enviarBackend) return;
    
    try {
      const response = await fetch(CONFIG.urlBackend, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valores: velas })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📤 Enviado para CashOutFlow!');
        
        // Se houver um sinal, mostrar
        if (data.signal) {
          console.log('🎯 SINAL GERADO!');
          console.log(`   Depois de: ${data.signal.apos_de}x`);
          console.log(`   Cashout: ${data.signal.cashout}x`);
          console.log(`   Tentativas: ${data.signal.max_gales}\n`);
        }
      } else {
        const erro = await response.text();
        console.warn('⚠️ Erro ao enviar:', erro);
      }
    } catch (erro) {
      console.error('❌ Erro:', erro.message);
    }
  }
  
  /**
   * 📊 CAPTURA E PROCESSA
   */
  async function executarCaptura() {
    contagemCaptura++;
    const velas = buscarVelas();
    
    if (velas.length === 4) {
      const timestamp = new Date().toLocaleTimeString('pt-PT');
      
      // Verificar se são as mesmas velas
      const velasString = velas.join(',');
      if (velasString === ultimasVelasEnviadas) {
        console.log(`⏩ Captura ${contagemCaptura}: Mesmas velas, aguardando...`);
        return;
      }
      
      ultimasVelasEnviadas = velasString;
      
      console.log('\n╔═══════════════════════════════════╗');
      console.log(`║ 🕐 ${timestamp.padEnd(30)}║`);
      console.log('╠═══════════════════════════════════╣');
      console.log('║ 📊 ÚLTIMAS 4 VELAS:               ║');
      velas.forEach((v, i) => {
        const emoji = v < 2.0 ? '🔴' : v < 10.0 ? '🟡' : '🟢';
        console.log(`║   ${emoji} ${(i+1)}. ${v.toFixed(2)}x`.padEnd(36) + '║');
      });
      
      const media = (velas.reduce((a,b) => a+b, 0) / 4).toFixed(2);
      const baixas = velas.filter(v => v < 2.0).length;
      
      console.log('╠═══════════════════════════════════╣');
      console.log(`║ 📈 Média: ${media}x`.padEnd(36) + '║');
      
      if (baixas >= 3) {
        console.log('║ 🔥 PADRÃO: 3+ baixas detectadas!  ║');
      } else if (baixas >= 2) {
        console.log('║ ⚠️  PADRÃO: 2 baixas              ║');
      }
      
      console.log('╚═══════════════════════════════════╝\n');
      
      await enviarParaBackend(velas);
      
    } else if (velas.length === 0) {
      console.log(`⏸️  Captura ${contagemCaptura}: Histórico oculto (jogo rodando)`);
    } else {
      console.warn(`⚠️ Captura ${contagemCaptura}: ${velas.length} velas encontradas`);
    }
  }
  
  /**
   * ⏹️ PARAR
   */
  window.stopAviator = function() {
    if (window.aviatorInterval) {
      clearInterval(window.aviatorInterval);
      window.aviatorInterval = null;
      ultimasVelasEnviadas = null;
      console.log('\n🛑 Captura parada.');
      console.log(`📊 Total de capturas: ${contagemCaptura}\n`);
    } else {
      console.log('⚠️ Nenhuma captura ativa.');
    }
  };
  
  /**
   * ▶️ INICIAR
   */
  window.startAviator = function() {
    if (window.aviatorInterval) {
      console.log('⚠️ Já está rodando. Use stopAviator() para parar.');
      return;
    }
    
    contagemCaptura = 0;
    ultimasVelasEnviadas = null;
    console.log('✅ Captura iniciada! A cada 3 segundos...\n');
    executarCaptura();
    window.aviatorInterval = setInterval(executarCaptura, CONFIG.intervalo);
  };
  
  // 🚀 MOSTRAR CONFIGURAÇÃO
  console.log('⚙️  CONFIGURAÇÃO:');
  console.log(`   • Intervalo: ${CONFIG.intervalo / 1000}s`);
  console.log(`   • Backend: CashOutFlow ✅`);
  console.log(`   • URL: ${CONFIG.urlBackend.substring(0, 50)}...`);
  console.log('\n📋 COMANDOS:');
  console.log('   • stopAviator()  - Para a captura');
  console.log('   • startAviator() - Reinicia captura');
  console.log('\n═══════════════════════════════════════\n');
  
  // INICIAR AUTOMATICAMENTE
  window.startAviator();
  
})();
