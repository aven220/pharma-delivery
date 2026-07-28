import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { excelApi, excelApiExtended, medicationsApi, systemApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/store/toast.store';
import { getApiErrorMessage } from '@/lib/api-error';
import { Download, Upload } from 'lucide-react';

const QUEUE_RESET_PHRASE = 'REINICIAR COLA';

const TABS = [
  {
    id: 'deliveries',
    label: 'Entregas pendientes',
    permissions: ['excel.import', 'excel.read'] as const,
    roles: ['ADMIN', 'SUPERVISOR'] as const,
  },
  {
    id: 'medications',
    label: 'Medicamentos maestros',
    permissions: ['medications.import', 'medications.write'] as const,
  },
] as const;

type ImportTabId = (typeof TABS)[number]['id'];

async function downloadDeliveriesTemplate() {
  const res = await excelApi.downloadTemplate();
  const blob = new Blob([res.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla-entregas-pendientes.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

function QueueResetAdminCard() {
  const { isAdmin, hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [password, setPassword] = useState('');
  const [understood, setUnderstood] = useState(false);

  const canReset = isAdmin() && hasPermission('system.reset_queue');

  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['queue-reset-preview'],
    queryFn: async () => {
      const res = await systemApi.queueResetPreview();
      return res.data.data as {
        deliveries: number;
        callAssignments: number;
        courierAssignments: number;
        intermunicipalLinks: number;
        confirmationPhrase: string;
      };
    },
    enabled: canReset,
  });

  const resetMutation = useMutation({
    mutationFn: () =>
      systemApi.queueReset({ confirmationPhrase: phrase.trim(), password }),
    onSuccess: (res) => {
      toast.success(res.data.data.message || 'Cola reiniciada');
      setOpen(false);
      setPhrase('');
      setPassword('');
      setUnderstood(false);
      queryClient.invalidateQueries({ queryKey: ['queue-reset-preview'] });
      queryClient.invalidateQueries({ queryKey: ['excel-imports'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['pending-prep'] });
      queryClient.invalidateQueries({ queryKey: ['calls'] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo reiniciar la cola')),
  });

  if (!canReset) return null;

  const canSubmit =
    understood &&
    phrase.trim() === QUEUE_RESET_PHRASE &&
    password.length > 0 &&
    !resetMutation.isPending;

  return (
    <>
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Reiniciar cola de pendientes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Archiva todas las entregas que aún no están entregadas (y sus llamadas/asignaciones
            abiertas) para poder importar un Excel actualizado desde cero. No borra entregas ya
            marcadas como entregadas, ni usuarios, pacientes o medicamentos.
          </p>
          {previewLoading ? (
            <p className="text-sm text-muted-foreground">Calculando conteos...</p>
          ) : preview ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>
                Entregas a archivar: <strong>{preview.deliveries}</strong>
              </li>
              <li>Asignaciones de llamada: {preview.callAssignments}</li>
              <li>Asignaciones a domiciliarios: {preview.courierAssignments}</li>
              <li>Enlaces en rutas intermunicipales: {preview.intermunicipalLinks}</li>
            </ul>
          ) : null}
          <Button
            type="button"
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={() => setOpen(true)}
            disabled={!preview || preview.deliveries === 0}
          >
            Reiniciar cola...
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setPhrase('');
            setPassword('');
            setUnderstood(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar reinicio de cola</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Esta acción es irreversible para la cola operativa. Se archivarán{' '}
              <strong>{preview?.deliveries ?? 0}</strong> entregas pendientes.
            </p>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
              />
              <span>
                Entiendo que la cola pendiente se archivará y deberé importar el Excel nuevo.
              </span>
            </label>
            <div className="space-y-2">
              <Label htmlFor="queue-reset-phrase">
                Escriba exactamente: <code>{QUEUE_RESET_PHRASE}</code>
              </Label>
              <Input
                id="queue-reset-phrase"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="queue-reset-password">Su contraseña de administrador</Label>
              <Input
                id="queue-reset-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={!canSubmit}
              onClick={() => resetMutation.mutate()}
            >
              {resetMutation.isPending ? 'Reiniciando...' : 'Confirmar reinicio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DeliveriesImportTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const { hasPermission } = usePermissions();
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['excel-imports'],
    queryFn: async () => {
      const res = await excelApi.list();
      return res.data.data;
    },
    refetchInterval: 5000,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => excelApi.upload(file),
    onSuccess: () => {
      refetch();
      if (fileRef.current) fileRef.current.value = '';
      toast.success('Archivo cargado. La importación está en proceso');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Error al importar')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => excelApiExtended.delete(id),
    onSuccess: () => {
      refetch();
      toast.success('Importación eliminada');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo eliminar')),
  });

  const reprocessMutation = useMutation({
    mutationFn: (id: string) => excelApiExtended.reprocess(id),
    onSuccess: () => {
      refetch();
      toast.success('Reprocesamiento iniciado');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo reprocesar')),
  });

  const handleUpload = () => {
    const file = fileRef.current?.files?.[0];
    if (file) uploadMutation.mutate(file);
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      await downloadDeliveriesTemplate();
      toast.success('Plantilla descargada');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'No se pudo descargar la plantilla'));
    } finally {
      setDownloadingTemplate(false);
    }
  };

  return (
    <div className="space-y-6">
      <PermissionGate permissions={['excel.import']}>
        <Card>
          <CardHeader>
            <CardTitle>Cargar base de pendientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Acepta su plantilla con columnas como: Cedula/CEDULA, NombrePaciente/NOMBRE_PACIENTE,
              NroDispensacion/COD_DISPENSA, CodigoMedicamento/COD_MEDICAMENTO,
              NombreMedicamento/NOMBRE_MEDICAMENTO, Cantidad/CANTIDAD (y equivalentes). Varias
              filas con la misma cédula y mismo número de dispensación pero distinto código de
              medicamento se agrupan en una sola entrega con varios medicamentos.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
              >
                <Download className="mr-2 h-4 w-4" />
                {downloadingTemplate ? 'Descargando...' : 'Descargar plantilla Excel'}
              </Button>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="block" />
            <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? 'Subiendo...' : 'Importar entregas'}
            </Button>
          </CardContent>
        </Card>
      </PermissionGate>

      <QueueResetAdminCard />

      <PermissionGate permissions={['excel.read']}>
        <Card>
          <CardHeader>
            <CardTitle>Historial de importaciones</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Cargando...</p>
            ) : (
              <div className="space-y-3">
                {(data || []).map(
                  (imp: {
                    id: string;
                    fileName: string;
                    status: string;
                    totalRows: number;
                    insertedCount: number;
                    updatedCount: number;
                    errorCount: number;
                    createdAt: string;
                  }) => (
                    <div
                      key={imp.id}
                      className="flex items-center justify-between rounded-md border p-4"
                    >
                      <div>
                        <p className="font-medium">{imp.fileName}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(imp.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-right text-sm">
                        <span
                          className={`rounded px-2 py-1 ${
                            imp.status === 'COMPLETED'
                              ? 'bg-green-100'
                              : imp.status === 'FAILED'
                                ? 'bg-red-100'
                                : imp.status === 'PROCESSING'
                                  ? 'bg-blue-100'
                                  : 'bg-yellow-100'
                          }`}
                        >
                          {imp.status}
                        </span>
                        <p className="text-muted-foreground">
                          +{imp.insertedCount} / ~{imp.updatedCount} / {imp.errorCount} errores
                        </p>
                        <div className="flex gap-2">
                          {hasPermission('excel.reprocess') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => reprocessMutation.mutate(imp.id)}
                              disabled={reprocessMutation.isPending}
                            >
                              Reprocesar
                            </Button>
                          )}
                          {hasPermission('excel.delete') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteMutation.mutate(imp.id)}
                              disabled={deleteMutation.isPending}
                            >
                              Eliminar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </PermissionGate>
    </div>
  );
}

function MedicationsImportTab() {
  const queryClient = useQueryClient();
  const medFileRef = useRef<HTMLInputElement>(null);

  const importMutation = useMutation({
    mutationFn: (file: File) => medicationsApi.import(file),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      if (medFileRef.current) medFileRef.current.value = '';
      const { inserted, updated, errors, total } = res.data.data;
      toast.success(`Importación completada: ${inserted} nuevos, ${updated} actualizados`);
      if (errors > 0) {
        toast.info(`${errors} fila(s) con error de ${total} procesadas`);
      }
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo importar el archivo')),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cargar catálogo de medicamentos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Actualice el maestro de medicamentos desde Excel o CSV. Columnas: CUM, nombre,
          laboratorio, presentación, concentración, estado. Si el CUM ya existe, se actualiza el
          registro.
        </p>
        <PermissionGate permissions={['medications.import', 'medications.write']}>
          <Label htmlFor="med-import-file" className="cursor-pointer">
            <div className="flex items-center gap-2 rounded-md border border-dashed p-6 hover:bg-muted">
              <Upload className="h-5 w-5" />
              <span>Seleccionar Excel/CSV (.xlsx, .xls, .csv)</span>
            </div>
            <input
              ref={medFileRef}
              id="med-import-file"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importMutation.mutate(file);
              }}
            />
          </Label>
          {importMutation.isPending && (
            <p className="text-sm text-muted-foreground">Procesando archivo...</p>
          )}
          {importMutation.isSuccess && (
            <p className="text-sm text-green-600">
              Importados: {importMutation.data?.data.data.inserted} · Actualizados:{' '}
              {importMutation.data?.data.data.updated}
              {importMutation.data?.data.data.errors > 0
                ? ` · Errores: ${importMutation.data.data.data.errors}`
                : ''}
            </p>
          )}
        </PermissionGate>
        <p className="text-sm text-muted-foreground">
          Después de importar puede revisar y editar registros en{' '}
          <Link to="/medications" className="text-primary underline">
            Medicamentos maestros
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}

export function ExcelImportPage() {
  const { hasPermission, hasRole } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const visibleTabs = TABS.filter((tab) => {
    const hasPerm = hasPermission(...tab.permissions);
    if ('roles' in tab && tab.roles) {
      return hasPerm && hasRole(...tab.roles);
    }
    return hasPerm;
  });

  const tabParam = searchParams.get('tab') as ImportTabId | null;
  const activeTab =
    visibleTabs.find((tab) => tab.id === tabParam)?.id ?? visibleTabs[0]?.id ?? 'deliveries';

  const setTab = (tab: ImportTabId) => setSearchParams({ tab });

  if (visibleTabs.length === 0) {
    return (
      <p className="text-muted-foreground">No tiene permisos para importaciones masivas.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Importaciones masivas</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Centro unificado para cargar la base de entregas pendientes y el catálogo de
          medicamentos.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleTabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant={activeTab === tab.id ? 'default' : 'outline'}
            onClick={() => setTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === 'deliveries' && <DeliveriesImportTab />}
      {activeTab === 'medications' && <MedicationsImportTab />}
    </div>
  );
}
