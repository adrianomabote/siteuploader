/**
 * 🎮 SCRIPT DE CAPTURA DE VELAS DO AVIATOR
 * 
 * COMO USAR:
 * 1. Abra o site do Aviator (Placard.co.mz)
 * 2. Pressione F12 para abrir o Console do navegador
 * 3. Cole TODO este código no console e pressione ENTER
 * 4. O script vai capturar as últimas 4 velas a cada 3 segundos
 * 5. Para parar: digite stopAviator() no console
 */

(function() {
  console.log('🚀 Iniciando captura de velas do Aviator...');
  
  // Configurações
  const INTERVALO_CAPTURA = 3000; // 3 segundos
  const QUANTIDADE_VELAS = 4;
  
  // Variável global para controlar o loop
  window.aviatorInterval = null;
  
  /**
   * Busca os elementos das velas no DOM
   * NOTA: Você precisa ajustar os seletores baseado na estrutura real do site
   */
  function buscarVelas() {
    // Tentativa 1: Seletores comuns para histórico de velas
    let velas = document.querySelectorAll('.bubble-multiplier, .payouts-block__item, .payout-value, [class*="history"] [class*="item"]');
    
    // Tentativa 2: Buscar por data-* attributes
    if (velas.length === 0) {
      velas = document.querySelectorAll('[data-multiplier], [data-payout], [data-crash]');
    }
    
    // Tentativa 3: Buscar elementos com padrão de multiplicador (ex: "2.50x")
    if (velas.length === 0) {
      const todosElementos = document.querySelectorAll('*');
      velas = Array.from(todosElementos).filter(el => {
        const texto = el.textContent?.trim();
        return texto && /^\d+\.\d{2}x?$/i.test(texto);
      });
    }
    
    return velas;
  }
  
  /**
   * Extrai o valor numérico de uma vela
   */
  function extrairValor(elemento) {
    const texto = elemento.textContent || elemento.innerText || '';
    const match = texto.match(/(\d+\.\d{2})/);
    return match ? parseFloat(match[1]) : null;
  }
  
  /**
   * Captura as últimas 4 velas
   */
  function capturarVelas() {
    try {
      const elementos = buscarVelas();
      
      if (elementos.length === 0) {
        console.warn('⚠️ Nenhuma vela encontrada. Verifique se está na página correta do Aviator.');
        return null;
      }
      
      // Pegar as últimas 4 velas
      const ultimasVelas = Array.from(elementos)
        .slice(0, QUANTIDADE_VELAS)
        .map(el => extrairValor(el))
        .filter(v => v !== null);
      
      if (ultimasVelas.length === 0) {
        console.warn('⚠️ Não foi possível extrair valores das velas.');
        return null;
      }
      
      return ultimasVelas;
    } catch (erro) {
      console.error('❌ Erro ao capturar velas:', erro);
      return null;
    }
  }
  
  /**
   * Analisa as velas e mostra no console
   */
  function analisarVelas(velas) {
    if (!velas || velas.length === 0) return;
    
    const timestamp = new Date().toLocaleTimeString('pt-PT');
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🕐 ${timestamp}`);
    console.log('📊 Últimas 4 velas:');
    console.log(velas.map((v, i) => `  ${i+1}. ${v}x`).join('\n'));
    
    // Calcular média
    const media = (velas.reduce((a, b) => a + b, 0) / velas.length).toFixed(2);
    console.log(`📈 Média: ${media}x`);
    
    // Detectar padrão
    const baixas = velas.filter(v => v < 2.0).length;
    if (baixas >= 3) {
      console.log('🔥 ATENÇÃO: 3+ velas baixas detectadas!');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
  
  /**
   * Função principal que roda a cada 3 segundos
   */
  function executarCaptura() {
    const velas = capturarVelas();
    if (velas) {
      analisarVelas(velas);
    }
  }
  
  /**
   * Para a captura
   */
  window.stopAviator = function() {
    if (window.aviatorInterval) {
      clearInterval(window.aviatorInterval);
      window.aviatorInterval = null;
      console.log('🛑 Captura de velas parada.');
    } else {
      console.log('⚠️ Nenhuma captura ativa.');
    }
  };
  
  /**
   * Inicia a captura
   */
  window.startAviator = function() {
    if (window.aviatorInterval) {
      console.log('⚠️ Captura já está ativa. Use stopAviator() primeiro.');
      return;
    }
    
    executarCaptura();
    window.aviatorInterval = setInterval(executarCaptura, INTERVALO_CAPTURA);
    console.log('✅ Captura iniciada! Rodando a cada 3 segundos...');
  };
  
  // Parar qualquer captura anterior
  if (window.aviatorInterval) {
    clearInterval(window.aviatorInterval);
  }
  
  // Iniciar automaticamente
  window.startAviator();
  
  console.log('💡 Comandos disponíveis:');
  console.log('  • stopAviator()  - Para a captura');
  console.log('  • startAviator() - Inicia captura');
  
})();
