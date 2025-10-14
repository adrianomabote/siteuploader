/**
 * 📡 CAPTURA SINAIS DO SSCASHOUT
 * Cole este código no console de: https://app.sscashout.online/
 * 
 * O script vai capturar as velas e enviar para:
 * https://bot-cyber-hacker-cashout-aviator.replit.app
 */

(function() {
  console.clear();
  console.log('═══════════════════════════════════════');
  console.log('  📡 Captura SSCashout → CashOutFlow');
  console.log('═══════════════════════════════════════\n');
  
  // ⚙️ CONFIGURAÇÃO
  const CONFIG = {
    intervalo: 3000,  // 3 segundos
    urlBackend: 'https://bot-cyber-hacker-cashout-aviator.replit.app/api/vela',
  };
  
  let contagemEnvios = 0;
  let ultimasVelasEnviadas = null;
  let intervalId = null;
  
  /**
   * 🔍 BUSCA AS VELAS NA PÁGINA
   */
  function buscarVelas() {
    // Buscar todos elementos com texto tipo "1.11x"
    const todosElementos = document.querySelectorAll('body *');
    const velas = [];
    
    todosElementos.forEach(el => {
      const texto = el.textContent?.trim();
      // Padrão: número com 2 casas decimais + "x"
      if (/^\d+\.\d{2}x?$/i.test(texto)) {
        const match = texto.match(/(\d+\.\d{2})/);
        if (match) {
          const valor = parseFloat(match[1]);
          if (valor >= 1.00 && valor <= 99.99 && !velas.includes(valor)) {
            velas.push(valor);
          }
        }
      }
    });
    
    // Retornar as 4 primeiras
    return velas.slice(0, 4);
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
        console.log('✅ Enviado para CashOutFlow!');
        if (data.velas) {
          console.log('   Backend confirmou:', data.velas.map(v => v.toFixed(2) + 'x').join(', '));
        }
      } else {
        console.warn('⚠️ Erro ao enviar (status:', response.status, ')');
      }
    } catch (erro) {
      console.error('❌ Erro:', erro.message);
    }
  }
  
  /**
   * 📊 CAPTURA E PROCESSA
   */
  async function executarCaptura() {
    contagemEnvios++;
    const velas = buscarVelas();
    
    if (velas.length >= 4) {
      // Verificar se mudaram
      const velasString = velas.join(',');
      if (velasString === ultimasVelasEnviadas) {
        console.log(`⏩ #${contagemEnvios}: Mesmas velas, aguardando...`);
        return;
      }
      
      ultimasVelasEnviadas = velasString;
      
      // Mostrar no console
      console.clear();
      console.log('═══════════════════════════════════════');
      console.log(`  🕐 ${new Date().toLocaleTimeString('pt-PT')} - Envio #${contagemEnvios}`);
      console.log('═══════════════════════════════════════');
      console.log('📊 4 VELAS CAPTURADAS:');
      velas.forEach((v, i) => {
        const emoji = v < 2.0 ? '🔴' : v < 10.0 ? '🟡' : '🟢';
        console.log(`   ${emoji} ${i + 1}. ${v.toFixed(2)}x`);
      });
      
      const media = (velas.reduce((a,b) => a+b, 0) / 4).toFixed(2);
      const baixas = velas.filter(v => v < 2.0).length;
      
      console.log(`\n📈 Média: ${media}x`);
      if (baixas >= 3) {
        console.log('🔥 ALERTA: 3+ velas baixas!');
      }
      console.log('═══════════════════════════════════════\n');
      
      // Enviar
      await enviarParaBackend(velas);
      
    } else if (velas.length === 0) {
      console.log(`⏸️  #${contagemEnvios}: Nenhuma vela encontrada (aguarde o site carregar)`);
    } else {
      console.log(`⚠️ #${contagemEnvios}: Apenas ${velas.length} velas (esperado: 4)`);
    }
  }
  
  /**
   * ⏹️ PARAR
   */
  window.stopSSCaptura = function() {
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
   * ▶️ INICIAR
   */
  window.startSSCaptura = function() {
    if (intervalId) {
      console.log('⚠️ Já está rodando. Use stopSSCaptura() para parar.');
      return;
    }
    
    contagemEnvios = 0;
    ultimasVelasEnviadas = null;
    console.log('✅ Iniciando captura a cada 3 segundos...\n');
    
    executarCaptura();
    intervalId = setInterval(executarCaptura, CONFIG.intervalo);
  };
  
  // 📋 INSTRUÇÕES
  console.log('⚙️  CONFIGURAÇÃO:');
  console.log(`   • Intervalo: ${CONFIG.intervalo / 1000}s`);
  console.log(`   • URL: ${CONFIG.urlBackend}`);
  console.log('\n📋 COMANDOS:');
  console.log('   • stopSSCaptura()  - Para captura');
  console.log('   • startSSCaptura() - Reinicia');
  console.log('\n═══════════════════════════════════════\n');
  
  // 🚀 INICIAR AUTOMATICAMENTE
  window.startSSCaptura();
  
})();
