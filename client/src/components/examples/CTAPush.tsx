import CTAPush from '../CTAPush';

export default function CTAPushExample() {
  return <CTAPush onAtivar={() => console.log('Ativar notificações clicked')} />;
}
