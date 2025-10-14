interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WhatsAppModal({ isOpen, onClose }: WhatsAppModalProps) {
  if (!isOpen) return null;

  const handleEntrarGrupo = () => {
    onClose();
    window.open("https://chat.whatsapp.com/D2NlMN4tkkL54m2EhS7o6Y?mode=ems_copy_t", "_blank");
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
      data-testid="modal-whatsapp"
    >
      <div className="relative mx-4 w-full max-w-md rounded-2xl border-[3px] border-yellow-600 bg-gradient-to-br from-[#1a2332] to-[#0f1419] p-7">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-2xl leading-none text-muted-foreground transition-colors hover:text-foreground"
          data-testid="button-close-whatsapp"
        >
          ×
        </button>

        <h2 className="mb-5 text-center text-xl font-bold uppercase tracking-wide text-primary">
          Grupo Oficial WhatsApp
        </h2>

        <p className="mb-4 text-center text-sm font-medium leading-relaxed text-white">
          Entre agora no grupo de WhatsApp e tenha acesso a dicas exclusivas, outros bots 100%
          assertivos e suporte 24/24 para tirar todas as suas dúvidas.
        </p>

        <p className="mb-6 text-center text-sm leading-relaxed text-muted-foreground">
          No grupo você encontra tudo o que precisa para ganhar no Aviator todos os dias com
          segurança.
        </p>

        <button
          onClick={handleEntrarGrupo}
          className="w-full rounded-lg bg-primary px-5 py-4 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-primary/90"
          data-testid="button-entrar-grupo"
        >
          Entrar no Grupo
        </button>
      </div>
    </div>
  );
}
