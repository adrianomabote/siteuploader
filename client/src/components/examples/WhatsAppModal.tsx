import { useState } from 'react';
import WhatsAppModal from '../WhatsAppModal';

export default function WhatsAppModalExample() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-yellow-600 px-4 py-2 text-white"
      >
        Abrir Modal WhatsApp
      </button>
      <WhatsAppModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
