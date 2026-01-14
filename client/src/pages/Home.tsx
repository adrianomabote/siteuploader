import { useState, useEffect } from "react";
import AppBar from "@/components/AppBar";
import VelasCard from "@/components/VelasCard";
import EntradaCard from "@/components/EntradaCard";
import HistoricoCard, { type HistoricoItem } from "@/components/HistoricoCard";
import AvisoModal from "@/components/AvisoModal";
import WhatsAppModal from "@/components/WhatsAppModal";
import BotPremiumModal from "@/components/BotPremiumModal";
import CTAPush from "@/components/CTAPush";

export default function Home() {
  const [isOnline, setIsOnline] = useState(false);
  const [velas, setVelas] = useState<number[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [onlineCount, setOnlineCount] = useState(0);
  
  const [placar, setPlacar] = useState("Aguarde…");
  const [placarStatus, setPlacarStatus] = useState<"green" | "loss" | "waiting">("waiting");
  const [aposDe, setAposDe] = useState("--");
  const [cashout, setCashout] = useState("--");
  const [gales, setGales] = useState("--");

  const [historico, setHistorico] = useState<HistoricoItem[]>([]);

  // Conectar ao SSE para receber atualizações em tempo real
  useEffect(() => {
    const eventSource = new EventSource('/api/stream');

    eventSource.onopen = () => {
      console.log('✅ Conectado ao servidor SSE');
      setIsOnline(true);
    };

    eventSource.onerror = () => {
      console.log('❌ Erro na conexão SSE');
      setIsOnline(false);
    };

    eventSource.onmessage = (event) => {
      try {
        const { event: eventType, data } = JSON.parse(event.data);

        switch (eventType) {
          case 'online':
            setOnlineCount(data.count);
            break;

          case 'velas':
            setVelas(data.velas);
            setIsAnalyzing(true);
            break;

          case 'servidor_status':
            setIsOnline(data.online);
            break;

          case 'sinal':
            setPlacar("ENTRAR AGORA!");
            setPlacarStatus("green");
            setAposDe(data.apos_de.toFixed(2) + "x");
            setCashout(data.cashout.toFixed(2) + "x");
            setGales(data.max_gales.toString());
            break;

          case 'resultado':
            // Atualizar placar para mostrar GREEN ou LOSS
            if (data.status === 'green') {
              setPlacar("GREEN ✓");
              setPlacarStatus("green");
            } else {
              setPlacar("LOSS ✗");
              setPlacarStatus("loss");
            }
            
            // Só adicionar ao histórico se houver uma entrada válida
            if (aposDe !== "--" && cashout !== "--") {
              adicionarHistorico(data);
            }
            break;

          case 'limpar_entrada':
            limparSinal();
            break;
        }
      } catch (error) {
        console.error('Erro ao processar mensagem SSE:', error);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const adicionarHistorico = (resultado: any) => {
    const agora = new Date();
    const hora = agora.toLocaleTimeString('pt-BR');
    
    const novoItem: HistoricoItem = {
      id: resultado.id || Date.now().toString(),
      hora,
      aposDe: aposDe,
      cashout: cashout,
      vela: resultado.vela_final.toFixed(2) + "x",
      status: resultado.status,
    };

    setHistorico(prev => [novoItem, ...prev].slice(0, 20));
  };

  const limparSinal = () => {
    setPlacar("Aguarde…");
    setPlacarStatus("waiting");
    setAposDe("--");
    setCashout("--");
    setGales("--");
  };
  
  const [showAvisoModal, setShowAvisoModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showBotPremiumModal, setShowBotPremiumModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowAvisoModal(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  const handleCloseAvisoModal = () => {
    setShowAvisoModal(false);
    setTimeout(() => setShowWhatsAppModal(true), 40000);
  };

  const handleCloseWhatsAppModal = () => {
    setShowWhatsAppModal(false);
    setTimeout(() => setShowBotPremiumModal(true), 40000);
  };

  const handleCloseBotPremiumModal = () => {
    setShowBotPremiumModal(false);
    setTimeout(() => setShowAvisoModal(true), 180000);
  };

  const handleAtivarPush = () => {
    alert("Push ativado!");
  };

  const handleApostar = () => {
    console.log("Apostar clicked");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="safe-area pb-safe">
        <AppBar
          connectionStatus={isOnline ? "Aguarde entrada" : "Conectando ..."}
          isOnline={isOnline}
          onlineCount={onlineCount}
        />

        <main className="space-y-3 p-3">
          <VelasCard velas={velas} isAnalyzing={isAnalyzing} />
          
          <EntradaCard
            placar={placar}
            placarStatus={placarStatus}
            aposDe={aposDe}
            cashout={cashout}
            gales={gales}
            onApostar={handleApostar}
            onAtivarPush={handleAtivarPush}
          />

          <HistoricoCard items={historico} />

          <CTAPush onAtivar={handleAtivarPush} />
          
          <div className="w-full h-[600px] mt-4 rounded-md overflow-hidden border border-border">
            <iframe 
              src="https://go.aff.oddsbest.co/3iaj17cv" 
              className="w-full h-full border-0"
              title="OddsBest"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </main>

        <AvisoModal isOpen={showAvisoModal} onClose={handleCloseAvisoModal} />
        <WhatsAppModal isOpen={showWhatsAppModal} onClose={handleCloseWhatsAppModal} />
        <BotPremiumModal isOpen={showBotPremiumModal} onClose={handleCloseBotPremiumModal} />
        
        <footer className="mt-6 pb-4 text-center">
          <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5" data-testid="text-footer-credits">
            <span className="text-xs">🖥️</span>
            <span>Sistema desenvolvido por</span>
            <span className="text-primary font-bold">CYBER HACKER OFFICE</span>
            <span className="text-xs">🔒</span>
          </p>
        </footer>
      </div>
    </div>
  );
}
