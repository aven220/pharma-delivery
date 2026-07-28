import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/usePermissions';
import { PendingCallsPage } from '@/pages/PendingCallsPage';
import { MyCallsPage } from '@/pages/MyCallsPage';
import { CallsPage } from '@/pages/CallsPage';

const TABS = [
  { id: 'pending', label: 'Pendientes', permissions: ['calls.assign'] as const },
  { id: 'my-calls', label: 'Mis llamadas', permissions: ['calls.write'] as const },
  { id: 'history', label: 'Historial', permissions: ['calls.read', 'calls.write'] as const },
] as const;

type CallsTabId = (typeof TABS)[number]['id'];

export function CallsHubPage() {
  const { hasPermission } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();

  const visibleTabs = TABS.filter((tab) => hasPermission(...tab.permissions));
  const tabParam = searchParams.get('tab') as CallsTabId | null;
  const activeTab =
    visibleTabs.find((tab) => tab.id === tabParam)?.id ?? visibleTabs[0]?.id ?? 'history';

  const setTab = (tab: CallsTabId) => setSearchParams({ tab });

  if (visibleTabs.length === 0) {
    return <p className="text-muted-foreground">No tiene permisos para gestionar llamadas.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Llamadas</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          1) Asigne pendientes · 2) Opere en Mis llamadas (marcar → resultado → guardar) · 3) Revise historial y monitoreo.
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

      {activeTab === 'pending' && <PendingCallsPage embedded />}
      {activeTab === 'my-calls' && <MyCallsPage embedded />}
      {activeTab === 'history' && <CallsPage embedded />}
    </div>
  );
}
