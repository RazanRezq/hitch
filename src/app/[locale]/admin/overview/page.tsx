import { useTranslations } from 'next-intl';

export default function OverviewPage() {
  const t = useTranslations('nav');
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">{t('overview')}</h1>
      <p className="text-muted-foreground">
        Live dispatch map coming soon — Reykjavík/KEF corridor.
      </p>
    </section>
  );
}
