import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { createSearchIndex, type SearchIndex } from '@/core/search';
import { buildPlayerDocs } from '@/core/searchDocs';
import { Notice } from '@/ui/Notice';
import { renderPlayerRecord } from './RecordView';
import { SearchPanel } from './SearchPanel';

let playerIndex: SearchIndex | null = null;

/** Índice de búsqueda del jugador: se construye una vez, solo con contenido de jugador. */
export function getPlayerIndex(): SearchIndex {
  playerIndex ??= createSearchIndex(buildPlayerDocs());
  return playerIndex;
}

export function RulebookPage() {
  return (
    <SearchPanel
      index={getPlayerIndex()}
      basePath="/reglas"
      title="Reglamento"
      intro="Reglas, equipo, hechizos y ambientación de la Caja Básica. Funciona sin conexión."
    />
  );
}

/** Marco común de las pantallas de detalle: enlace de vuelta y aviso si el registro no existe. */
export function RecordFrame({ backTo, backLabel, children }: { backTo: string; backLabel: string; children: ReactNode | null }) {
  return (
    <>
      <p>
        <Link to={backTo}>← {backLabel}</Link>
      </p>
      {children ?? <Notice kind="error">No se ha encontrado ese registro.</Notice>}
    </>
  );
}

export function RulebookRecordPage() {
  const { kind = '', id = '' } = useParams();
  return (
    <RecordFrame backTo="/reglas" backLabel="Volver al reglamento">
      {renderPlayerRecord(kind, id)}
    </RecordFrame>
  );
}
