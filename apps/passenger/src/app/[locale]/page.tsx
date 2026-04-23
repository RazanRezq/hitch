import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations('landing');
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold text-center">{t('hero.title')}</h1>
      <p className="text-lg text-muted-foreground text-center">{t('hero.subtitle')}</p>
      <p className="text-sm text-muted-foreground mt-8">Landing page coming soon</p>
    </main>
  );
}
