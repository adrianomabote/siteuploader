interface BotPremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BotPremiumModal({ isOpen, onClose }: BotPremiumModalProps) {
  if (!isOpen) return null;

  const handleAtivarAgora = () => {
    onClose();
    window.open("https://robo-cyber-hacker.onrender.com/", "_blank");
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
      data-testid="modal-bot-premium"
    >
      <div className="relative mx-4 w-full max-w-md rounded-2xl border-[3px] border-red-700 bg-gradient-to-br from-[#1a2332] to-[#0f1419] p-7">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-2xl leading-none text-muted-foreground transition-colors hover:text-foreground"
          data-testid="button-close-bot-premium"
        >
          ×
        </button>

        <h2 className="mb-5 text-center text-xl font-bold uppercase tracking-wide text-green-500">
          BOT AVIATOR 100% ACERTO*
        </h2>

        <p className="mb-4 text-center text-sm leading-relaxed text-white">
          Pare de usar a versão gratuita e ative agora a versão paga do Bot Aviator.
        </p>

        <p className="mb-4 text-center text-sm leading-relaxed text-white">
          Com a versão premium, você terá acesso aos sinais com 100% de acerto, mostrando exatamente onde o Aviator vai cair.
        </p>

        <p className="mb-6 text-center text-sm leading-relaxed text-white">
          Garanta já a sua vantagem exclusiva por{" "}
          <span className="inline-block rounded-md bg-red-700 px-3 py-1 font-bold text-white">
            450 MT
          </span>{" "}
          e comece a faturar.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-[#4b5563] px-5 py-3.5 text-sm font-semibold uppercase text-white transition-colors hover:bg-[#374151]"
            data-testid="button-depois-bot-premium"
          >
            Depois
          </button>
          <button
            onClick={handleAtivarAgora}
            className="flex-1 rounded-lg bg-red-700 px-5 py-3.5 text-sm font-semibold uppercase text-white transition-colors hover:bg-red-800"
            data-testid="button-ativar-bot-premium"
          >
            Ver Agora
          </button>
        </div>
      </div>
    </div>
  );
}
