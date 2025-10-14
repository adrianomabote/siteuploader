/**
 * 🎮 SCRIPT AVANÇADO DE CAPTURA DE VELAS DO AVIATOR
 * Com envio automático para o backend CashOutFlow
 * 
 * COMO USAR:
 * 1. Abra o site do Aviator (Placard.co.mz)
 * 2. Pressione F12 para abrir o Console
 * 3. Cole TODO este código e pressione ENTER
 * 4. O script captura velas a cada 3s e envia para seu servidor
 * 5. Para parar: stopAviator()
 */

(function() {
  console.log('🚀 Script Avançado CashOutFlow iniciando...');
  
  // ⚙️ CONFIGURAÇÕES - AJUSTE AQUI
  const CONFIG = {
    intervaloCaptura: 3000,        // 3 segundos
    quantidadeVelas: 4,            // Últimas 4 velas
    enviarParaBackend: false,      // Mudar para true para ativar envio
    urlBackend: 'http://localhost:5000/api/velas-capturadas', // Sua URL
  };
  
  window.aviatorInterval = null;
  let contagemCaptura = 0;
  
  /**
   * 🔍 BUSCA VELAS NO DOM
   * Tenta múltiplos seletores para encontrar as velas
   */
  let seletorEncontrado = null;
  let fallbackLogShown = false;
  
  function buscarVelas() {
    // Se já encontrou um seletor que funciona, usar ele
    if (seletorEncontrado) {
      return Array.from(document.querySelectorAll(seletorEncontrado));
    }
    
    // Lista de seletores possíveis (ajuste conforme o site)
    const seletores = [
      '.bubble-multiplier',
      '.payouts-block__item',
      '.payout-value',
      '.game-history-item',
      '[class*="history"] [class*="item"]',
      '[class*="payout"]',
      '[data-multiplier]',
      '[data-payout]',
    ];
    
    for (const seletor of seletores) {
      const elementos = document.querySelectorAll(seletor);
      if (elementos.length > 0) {
        seletorEncontrado = seletor;
        console.log(`✅ Velas encontradas com seletor: ${seletor}`);
        return Array.from(elementos);
      }
    }
    
    // Fallback: buscar por padrão de texto (ex: "2.50x")
    const todosElementos = document.querySelectorAll('*');
    const elementosComMultiplicador = Array.from(todosElementos).filter(el => {
      const texto = el.textContent?.trim();
      return texto && /^\d+\.\d{2}x?$/i.test(texto) && el.children.length === 0;
    });
    
    if (elementosComMultiplicador.length > 0 && !fallbackLogShown) {
      console.log('✅ Velas encontradas por padrão de texto');
      fallbackLogShown = true;
    }
    
    return elementosComMultiplicador;
  }
  
  /**
   * 📊 EXTRAI VALOR NUMÉRICO
   */
  function extrairValor(elemento) {
    const texto = elemento.textContent || elemento.innerText || elemento.getAttribute('data-multiplier') || '';
    const match = texto.match(/(\d+\.\d{2})/);
    return match ? parseFloat(match[1]) : null;
  }
  
  /**
   * 🎯 CAPTURA AS ÚLTIMAS VELAS
   */
  function capturarVelas() {
    try {
      const elementos = buscarVelas();
      
      if (elementos.length === 0) {
        if (contagemCaptura === 0) {
          console.warn('⚠️ Nenhuma vela encontrada. Possíveis razões:');
          console.warn('   1. Não está na página do jogo Aviator');
          console.warn('   2. O jogo ainda não começou');
          console.warn('   3. Seletores precisam ser ajustados');
          console.warn('\n💡 Ajuda: Inspecione a página (F12) e encontre o elemento das velas');
          console.warn('   Depois ajuste a lista de seletores na função buscarVelas()');
        }
        return null;
      }
      
      const ultimasVelas = elementos
        .slice(0, CONFIG.quantidadeVelas)
        .map(el => extrairValor(el))
        .filter(v => v !== null && v > 0);
      
      if (ultimasVelas.length === 0) {
        console.warn('⚠️ Elementos encontrados mas valores não extraídos');
        return null;
      }
      
      return ultimasVelas;
      
    } catch (erro) {
      console.error('❌ Erro ao capturar:', erro);
      return null;
    }
  }
  
  /**
   * 📈 ANALISA E EXIBE VELAS
   */
  function analisarVelas(velas) {
    if (!velas || velas.length === 0) return null;
    
    const timestamp = new Date();
    const media = (velas.reduce((a, b) => a + b, 0) / velas.length).toFixed(2);
    const maxima = Math.max(...velas).toFixed(2);
    const minima = Math.min(...velas).toFixed(2);
    
    // Análise de padrão
    const baixas = velas.filter(v => v < 2.0).length;
    const altas = velas.filter(v => v >= 2.0 && v < 10.0).length;
    const muitoAltas = velas.filter(v => v >= 10.0).length;
    
    let sinal = '⚪ NEUTRO';
    if (baixas >= 3) sinal = '🟢 POSSÍVEL ENTRADA (3+ baixas)';
    if (muitoAltas >= 2) sinal = '🔴 CUIDADO (2+ muito altas)';
    
    const analise = {
      timestamp: timestamp.toISOString(),
      velas: velas,
      media: parseFloat(media),
      maxima: parseFloat(maxima),
      minima: parseFloat(minima),
      sinal: sinal,
      estatisticas: { baixas, altas, muitoAltas }
    };
    
    // Exibir no console
    console.log('\n╔═══════════════════════════════════════╗');
    console.log(`║ 🕐 ${timestamp.toLocaleTimeString('pt-PT').padEnd(32)}║`);
    console.log('╠═══════════════════════════════════════╣');
    console.log('║ 📊 ÚLTIMAS 4 VELAS:                   ║');
    velas.forEach((v, i) => {
      const emoji = v < 2.0 ? '🔴' : v < 10.0 ? '🟡' : '🟢';
      console.log(`║   ${emoji} ${(i+1)}. ${v.toFixed(2)}x`.padEnd(39) + '║');
    });
    console.log('╠═══════════════════════════════════════╣');
    console.log(`║ 📈 Média: ${media}x`.padEnd(39) + '║');
    console.log(`║ ⬆️  Máxima: ${maxima}x`.padEnd(39) + '║');
    console.log(`║ ⬇️  Mínima: ${minima}x`.padEnd(39) + '║');
    console.log('╠═══════════════════════════════════════╣');
    console.log(`║ ${sinal.padEnd(37)}║`);
    console.log('╚═══════════════════════════════════════╝\n');
    
    return analise;
  }
  
  /**
   * 📤 ENVIA PARA O BACKEND
   */
  async function enviarParaBackend(analise) {
    if (!CONFIG.enviarParaBackend) return;
    
    try {
      const response = await fetch(CONFIG.urlBackend, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analise)
      });
      
      if (response.ok) {
        console.log('✅ Dados enviados para o backend');
      } else {
        console.warn('⚠️ Erro ao enviar (status:', response.status, ')');
      }
    } catch (erro) {
      console.error('❌ Erro ao enviar para backend:', erro.message);
    }
  }
  
  /**
   * ▶️ EXECUÇÃO PRINCIPAL
   */
  async function executarCaptura() {
    contagemCaptura++;
    const velas = capturarVelas();
    
    if (velas && velas.length > 0) {
      const analise = analisarVelas(velas);
      if (analise && CONFIG.enviarParaBackend) {
        await enviarParaBackend(analise);
      }
    }
  }
  
  /**
   * ⏹️ PARAR CAPTURA
   */
  window.stopAviator = function() {
    if (window.aviatorInterval) {
      clearInterval(window.aviatorInterval);
      window.aviatorInterval = null;
      console.log('🛑 Captura parada.');
      console.log(`📊 Total de capturas: ${contagemCaptura}`);
    } else {
      console.log('⚠️ Nenhuma captura ativa.');
    }
  };
  
  /**
   * ⚙️ ALTERAR CONFIGURAÇÕES
   */
  window.configAviator = function(novoConfig) {
    Object.assign(CONFIG, novoConfig);
    console.log('✅ Configuração atualizada:', CONFIG);
    
    // Reiniciar com novas configurações
    if (window.aviatorInterval) {
      window.stopAviator();
      window.startAviator();
    }
  };
  
  /**
   * ▶️ INICIAR CAPTURA
   */
  window.startAviator = function() {
    if (window.aviatorInterval) {
      console.log('⚠️ Já está rodando. Use stopAviator() primeiro.');
      return;
    }
    
    contagemCaptura = 0;
    executarCaptura(); // Primeira execução imediata
    window.aviatorInterval = setInterval(executarCaptura, CONFIG.intervaloCaptura);
    console.log('✅ Captura iniciada!');
  };
  
  // 🚀 INICIAR AUTOMATICAMENTE
  console.log('═══════════════════════════════════════');
  console.log('  CashOutFlow - Captura de Velas v2.0  ');
  console.log('═══════════════════════════════════════');
  console.log('\n📋 COMANDOS DISPONÍVEIS:');
  console.log('  • stopAviator()     - Para a captura');
  console.log('  • startAviator()    - Inicia captura');
  console.log('  • configAviator({}) - Altera config\n');
  console.log('⚙️  CONFIGURAÇÕES ATUAIS:');
  console.log('  • Intervalo:', CONFIG.intervaloCaptura / 1000, 'segundos');
  console.log('  • Quantidade:', CONFIG.quantidadeVelas, 'velas');
  console.log('  • Enviar backend:', CONFIG.enviarParaBackend ? 'SIM' : 'NÃO');
  if (CONFIG.enviarParaBackend) {
    console.log('  • URL:', CONFIG.urlBackend);
  }
  console.log('═══════════════════════════════════════\n');
  
  window.startAviator();
  
})();
