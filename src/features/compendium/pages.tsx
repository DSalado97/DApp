import { useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { RecordFrame, SearchPanel, renderDmRecord, renderPlayerRecord } from '@/features/rulebook';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Notice } from '@/ui/Notice';
import { loadCompendium, type Compendium } from './data';

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; compendium: Compendium };

function useCompendium(): [State, () => void] {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    loadCompendium().then(
      (compendium) => alive && setState({ status: 'ready', compendium }),
      (e: unknown) => alive && setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      alive = false;
    };
  }, [attempt]);
  return [
    state,
    () => {
      setState({ status: 'loading' });
      setAttempt((n) => n + 1);
    },
  ];
}

function Gate({ children }: { children: (c: Compendium) => ReactNode }) {
  const [state, retry] = useCompendium();
  if (state.status === 'loading') return <Notice kind="info">Cargando el compendio del DJ…</Notice>;
  if (state.status === 'error')
    return (
      <Card title="No se pudo cargar el compendio">
        <Notice kind="error">{state.message}</Notice>
        <Button onClick={retry}>Reintentar</Button>
      </Card>
    );
  return <>{children(state.compendium)}</>;
}

export function CompendiumPage() {
  const [dmOnly, setDmOnly] = useState(false);
  return (
    <Gate>
      {(c) => (
        <>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minHeight: 'var(--tap-min)' }}>
            <input type="checkbox" checked={dmOnly} onChange={(e) => setDmOnly(e.target.checked)} style={{ width: 24, height: 24 }} />
            Solo contenido del DJ
          </label>
          <SearchPanel
            index={dmOnly ? c.dmOnly : c.all}
            basePath="/dm/compendio"
            title="Compendio del DJ"
            intro="Bestiario, PNJ, objetos mágicos, tablas del DJ y reglas de dirección, junto con todo el reglamento del jugador."
          />
        </>
      )}
    </Gate>
  );
}

export function CompendiumRecordPage() {
  const { kind = '', id = '' } = useParams();
  return (
    <RecordFrame backTo="/dm/compendio" backLabel="Volver al compendio">
      <Gate>{(c) => <RecordOrMissing node={renderDmRecord(c.dm, kind, id) ?? renderPlayerRecord(kind, id)} />}</Gate>
    </RecordFrame>
  );
}

function RecordOrMissing({ node }: { node: ReactNode | null }) {
  return node ?? <Notice kind="error">No se ha encontrado ese registro.</Notice>;
}
