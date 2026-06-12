'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Plus, MoreVertical, Pencil, Power, Trash2 } from 'lucide-react';
import {
  useAdminVehicles,
  useDeleteVehicle,
  useUpdateVehicle,
  type AdminVehicleListItem,
} from '@/lib/api-client/hooks/admin';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Pagination } from '@/components/admin/Pagination';
import { VehicleDialog } from '@/components/admin/VehicleDialog';

function RowActions({
  vehicle,
  onEdit,
}: {
  vehicle: AdminVehicleListItem;
  onEdit: () => void;
}) {
  const t = useTranslations('admin.fleet');
  const update = useUpdateVehicle(vehicle.id);
  const del = useDeleteVehicle();

  return (
    <DropdownMenu
      align="end"
      triggerLabel={t('actions')}
      trigger={
        <span className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <MoreVertical className="size-4" />
        </span>
      }
    >
      <DropdownMenuItem onSelect={onEdit}>
        <Pencil className="size-4" />
        {t('edit')}
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={update.isPending}
        onSelect={() => update.mutate({ isActive: !vehicle.isActive })}
      >
        <Power className="size-4" />
        {vehicle.isActive ? t('deactivate') : t('activate')}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="text-destructive"
        disabled={del.isPending}
        onSelect={() => {
          if (window.confirm(t('deleteConfirm'))) del.mutate({ id: vehicle.id });
        }}
      >
        <Trash2 className="size-4" />
        {t('delete')}
      </DropdownMenuItem>
    </DropdownMenu>
  );
}

export default function FleetPage() {
  const t = useTranslations('admin.fleet');
  const tAdmin = useTranslations('admin');

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminVehicleListItem | null>(null);

  const query = useAdminVehicles({ page, pageSize: 20, q: q || undefined });

  function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPage(1);
    setQ(searchInput.trim());
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(v: AdminVehicleListItem) {
    setEditing(v);
    setDialogOpen(true);
  }

  const items = query.data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          {t('create')}
        </Button>
      </div>

      <form onSubmit={onSearch} className="relative max-w-md">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={tAdmin('search')}
          className="ps-9"
        />
      </form>

      <Card className="overflow-hidden p-0">
        {query.isError ? (
          <div className="flex flex-col items-center gap-3 p-10">
            <p className="text-sm text-muted-foreground">{tAdmin('error')}</p>
            <Button variant="outline" size="sm" onClick={() => query.refetch()}>
              {tAdmin('retry')}
            </Button>
          </div>
        ) : query.isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">{t('noResults')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('colPlate')}</TableHead>
                <TableHead>{t('colVehicle')}</TableHead>
                <TableHead>{t('colType')}</TableHead>
                <TableHead className="text-end">{t('colCapacity')}</TableHead>
                <TableHead>{t('colDriver')}</TableHead>
                <TableHead>{t('colStatus')}</TableHead>
                <TableHead className="w-10 text-end">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-xs text-ltr">{v.licensePlate}</TableCell>
                  <TableCell className="text-sm">
                    {v.make} {v.model} · {v.year} · {v.color}
                  </TableCell>
                  <TableCell className="text-sm">{v.vehicleType}</TableCell>
                  <TableCell className="text-end text-sm tabular-nums">{v.capacity}</TableCell>
                  <TableCell className="text-sm">{v.driver.name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={v.isActive ? 'secondary' : 'muted'}>
                      {v.isActive ? t('active') : t('inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    <RowActions vehicle={v} onEdit={() => openEdit(v)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {query.data && query.data.total > 0 && (
        <Pagination
          page={page}
          pageSize={query.data.pageSize}
          total={query.data.total}
          onPage={setPage}
        />
      )}

      <VehicleDialog open={dialogOpen} onClose={() => setDialogOpen(false)} vehicle={editing} />
    </div>
  );
}
