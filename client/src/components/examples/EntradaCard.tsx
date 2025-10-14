import EntradaCard from '../EntradaCard';

export default function EntradaCardExample() {
  return (
    <EntradaCard
      placar="GREEN 2.50x"
      placarStatus="green"
      aposDe="1.50x"
      cashout="2.00x"
      gales="2 vezes"
      onApostar={() => console.log('Apostar clicked')}
      onAtivarPush={() => console.log('Ativar Push clicked')}
    />
  );
}
