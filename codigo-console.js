// CÓDIGO PARA COLAR NO CONSOLE DO AVIATOR
// Cole este código no console do navegador enquanto estiver no jogo Aviator

(function() {
  // Configure a URL do seu site publicado
  const URL_SERVIDOR = "https://bot-cyber-hacker-aviator-cashout.replit.app/api/sinais";
  
  let ultimasRodadas = [];
  
  // Função para capturar os sinais do Aviator
  function capturarSinais() {
    try {
      // Tenta encontrar os elementos com os valores das últimas rodadas
      const elementos = document.querySelectorAll('[class*="payoff"]');
      
      if (elementos.length > 0) {
        const novosValores = Array.from(elementos)
          .slice(0, 5)
          .map(el => el.textContent.trim())
          .filter(val => val && val.includes('x'));
        
        if (novosValores.length > 0 && JSON.stringify(novosValores) !== JSON.stringify(ultimasRodadas)) {
          ultimasRodadas = novosValores;
          enviarSinais(novosValores);
        }
      }
    } catch (error) {
      console.error("Erro ao capturar sinais:", error);
    }
  }
  
  // Função para enviar os sinais ao servidor
  async function enviarSinais(rodadas) {
    try {
      const response = await fetch(URL_SERVIDOR, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rodadas })
      });
      
      if (response.ok) {
        console.log("✅ Sinais enviados:", rodadas);
      } else {
        console.error("❌ Erro ao enviar sinais:", response.status);
      }
    } catch (error) {
      console.error("❌ Erro de conexão:", error);
    }
  }
  
  // Captura sinais a cada 2 segundos
  setInterval(capturarSinais, 2000);
  
  console.log("🚀 Sistema de captura de sinais iniciado!");
  console.log("📡 Enviando para:", URL_SERVIDOR);
})();
