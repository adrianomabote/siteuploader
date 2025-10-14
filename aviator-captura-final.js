/**
 * ✅ SCRIPT FINAL - Captura Velas do Aviator para CashOutFlow
 * Versão: 4.0 - Corrigido para Replit
 */

(function() {
  console.clear();
  console.log('═══════════════════════════════════════');
  console.log('  🎮 CashOutFlow - Captura Aviator v4.0');
  console.log('═══════════════════════════════════════\n');
  
  // ⚙️ CONFIGURAÇÃO - SUBSTITUA COM SEU DOMÍNIO REPLIT!
  const CONFIG = {
    intervalo: 3000,  // 3 segundos
    // 🔥 ALTERE AQUI: Coloque o domínio do seu Replit
    urlBackend: 'https://seu-replit.replit.dev/api/vela',
    enviarBackend: true,
    tentativasMaximas: 3,  // Número de tentativas se não encontrar velas
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
    
    // Pegar as primeiras 4 (que você confirmou serem corretas)
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
        console.warn('⚠️ Erro ao enviar (status:', response.status, ')');
      }
    } catch (erro) {
      console.error('❌ Erro de rede:', erro.message);
      console.warn('💡 Verifique se a URL do backend está correta!');
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
      
      // Verificar se são as mesmas velas (evitar duplicação)
      const velasString = velas.join(',');
      if (velasString === ultimasVelasEnviadas) {
        console.log(`⏩ Captura ${contagemCaptura}: Mesmas velas, aguardando atualização...`);
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
        console.log('║ ⚠️ PADRÃO: 2 baixas detectadas    ║');
      }
      
      console.log('╚═══════════════════════════════════╝\n');
      
      // Enviar para o backend
      await enviarParaBackend(velas);
      
    } else if (velas.length === 0) {
      console.warn(`⏸️ Captura ${contagemCaptura}: Histórico oculto (jogo em andamento)`);
    } else {
      console.warn(`⚠️ Captura ${contagemCaptura}: ${velas.length} velas (esperado: 4)`);
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
      console.log('🛑 Captura parada.');
      console.log(`📊 Total de capturas: ${contagemCaptura}`);
    } else {
      console.log('⚠️ Nenhuma captura ativa.');
    }
  };
  
  /**
   * ▶️ INICIAR
   */
  window.startAviator = function() {
    if (window.aviatorInterval) {
      console.log('⚠️ Já está rodando. Use stopAviator() primeiro.');
      return;
    }
    
    contagemCaptura = 0;
    ultimasVelasEnviadas = null;
    executarCaptura();
    window.aviatorInterval = setInterval(executarCaptura, CONFIG.intervalo);
    console.log('✅ Captura iniciada! A cada 3 segundos...\n');
  };
  
  // 🚀 CONFIGURAÇÃO INICIAL
  console.log('⚙️  CONFIGURAÇÃO:');
  console.log(`   • Intervalo: ${CONFIG.intervalo / 1000}s`);
  console.log(`   • Enviar backend: ${CONFIG.enviarBackend ? 'SIM ✅' : 'NÃO ❌'}`);
  console.log(`   • URL: ${CONFIG.urlBackend}`);
  console.log('\n💡 IMPORTANTE:');
  console.log('   Edite a linha 14 com o domínio do seu Replit!');
  console.log('   Exemplo: https://seuapp.replit.dev/api/vela');
  console.log('\n📋 COMANDOS:');
  console.log('   • stopAviator()  - Para a captura');
  console.log('   • startAviator() - Reinicia captura\n');
  console.log('═══════════════════════════════════════\n');
  
  // ⚠️ Não iniciar automaticamente - esperar configuração
  console.log('⚠️  ANTES DE COMEÇAR:');
  console.log('1. Edite a linha 14 com seu domínio Replit');
  console.log('2. Depois digite: startAviator()\n');
  
})();
