'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronDown, Download } from 'lucide-react';
import type { Locale } from '@/lib/types';
import { cn } from '@/lib/ui';
import {
  useAdminEarnings,
  type DriverEarningsDto,
  type EarningsReportDto,
} from '@/lib/api-client/hooks/admin';
import { formatCurrencyMinor, formatDate } from '@/lib/i18n-shared';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

/** YYYY-MM-DD (UTC) for a date input value. */
function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Whole-day UTC window from two date-input values (Iceland is UTC+0). */
function toIsoRange(fromDate: string, toDate: string): { from: string; to: string } {
  return {
    from: new Date(`${fromDate}T00:00:00.000Z`).toISOString(),
    to: new Date(`${toDate}T23:59:59.999Z`).toISOString(),
  };
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** Per-trip CSV (localized headers) — the payroll backup for manual transfers. */
function buildCsv(report: EarningsReportDto, headers: string[]): string {
  const rows: string[][] = [headers];
  for (const d of report.drivers) {
    for (const t of d.trips) {
      rows.push([
        d.driverName ?? '',
        d.driverEmail,
        t.scheduledTime.slice(0, 10),
        t.code ?? t.id,
        t.pickupAddress,
        t.dropoffAddress,
        String(t.amountISK),
      ]);
    }
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}

export default function EarningsPage() {
  const t = useTranslations('admin.earnings');
  const tAdmin = useTranslations('admin');
  const locale = useLocale() as Locale;

  const now = new Date();
  const [fromDate, setFromDate] = useState(
    toDateInput(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))),
  );
  const [toDate, setToDate] = useState(toDateInput(now));

  const range = toIsoRange(fromDate, toDate);
  const query = useAdminEarnings(range);
  const [expanded, setExpanded] = useState<string | null>(null);

  const report = query.data;
  const hasExcluded =
    !!report &&
    report.excluded.refunded + report.excluded.unpaid + report.excluded.unassigned > 0;

  function onExport() {
    if (!report) return;
    const csv = buildCsv(report, [
      t('colDriver'),
      t('colEmail'),
      t('colDate'),
      t('colCode'),
      t('colPickup'),
      t('colDropoff'),
      'ISK',
    ]);
    // BOM so Excel reads the Icelandic characters as UTF-8.
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `earnings_${fromDate}_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="earnings-from">{t('fromLabel')}</Label>
            <Input
              id="earnings-from"
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="earnings-to">{t('toLabel')}</Label>
            <Input
              id="earnings-to"
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            onClick={onExport}
            disabled={!report || report.drivers.length === 0}
          >
            <Download className="me-2 size-4" />
            {t('exportCsv')}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{t('basisNote')}</p>

      {query.isLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      )}

      {query.isError && (
        <div className="flex flex-col items-center gap-3 py-16">
          <p className="text-sm text-muted-foreground">{tAdmin('error')}</p>
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            {tAdmin('retry')}
          </Button>
        </div>
      )}

      {report && report.drivers.length === 0 && !query.isError && (
        <p className="py-16 text-center text-sm text-muted-foreground">{t('empty')}</p>
      )}

      {report && report.drivers.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>{t('colDriver')}</TableHead>
                <TableHead className="text-end">{t('colTrips')}</TableHead>
                <TableHead className="text-end">{t('colGross')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.drivers.map((d) => (
                <DriverRows
                  key={d.driverId}
                  driver={d}
                  locale={locale}
                  expanded={expanded === d.driverId}
                  onToggle={() =>
                    setExpanded(expanded === d.driverId ? null : d.driverId)
                  }
                />
              ))}
              <TableRow className="font-semibold">
                <TableCell />
                <TableCell>{t('totalsLabel')}</TableCell>
                <TableCell className="text-end">{report.totals.tripCount}</TableCell>
                <TableCell className="text-end">
                  {formatCurrencyMinor(report.totals.grossISK, 'ISK', locale)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      )}

      {hasExcluded && report && (
        <p className="text-xs text-muted-foreground">
          {t('excludedNote', {
            refunded: report.excluded.refunded,
            unpaid: report.excluded.unpaid,
            unassigned: report.excluded.unassigned,
          })}
        </p>
      )}
    </div>
  );
}

function DriverRows({
  driver,
  locale,
  expanded,
  onToggle,
}: {
  driver: DriverEarningsDto;
  locale: Locale;
  expanded: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations('admin.earnings');
  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell>
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={t('showTrips')}
            className="rounded p-1 hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            <ChevronDown
              className={cn('size-4 transition-transform', expanded && 'rotate-180')}
            />
          </button>
        </TableCell>
        <TableCell>
          <span className="font-medium">{driver.driverName ?? driver.driverEmail}</span>
          {driver.driverName && (
            <span className="ms-2 text-xs text-muted-foreground">{driver.driverEmail}</span>
          )}
        </TableCell>
        <TableCell className="text-end">{driver.tripCount}</TableCell>
        <TableCell className="text-end font-medium">
          {formatCurrencyMinor(driver.grossISK, 'ISK', locale)}
        </TableCell>
      </TableRow>
      {expanded &&
        driver.trips.map((trip) => (
          <TableRow key={trip.id} className="bg-muted/40">
            <TableCell />
            <TableCell className="text-sm text-muted-foreground">
              <span className="text-ltr font-mono text-xs">{trip.code ?? trip.id}</span>
              <span className="ms-3">
                {trip.pickupAddress} → {trip.dropoffAddress}
              </span>
            </TableCell>
            <TableCell className="text-end text-sm text-muted-foreground">
              {formatDate(trip.scheduledTime, locale)}
            </TableCell>
            <TableCell className="text-end text-sm">
              {formatCurrencyMinor(trip.amountISK, 'ISK', locale)}
            </TableCell>
          </TableRow>
        ))}
    </>
  );
}
