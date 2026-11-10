import { useId, useMemo, useState, type ReactNode } from 'react';
import { PLAYER_TABLES } from '@/content';
import { advanceProgress, attributeCheck, cryptoRng, opposedCheck, parseDice, rollExpr, startAdvanced, type AdvancedProgress, type CheckResult, type Rng } from '@/rules';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Field } from '@/ui/Field';
import { Notice } from '@/ui/Notice';
import styles from './DicePage.module.css';

type Mode = 'atributo' | 'enfrentada' | 'avanzada' | 'dados';
const MODES: { id: Mode; label: string }[] = [
  { id: 'atributo', label: 'Atributo' },
  { id: 'enfrentada', label: 'Enfrentada' },
  { id: 'avanzada', label: 'Avanzada' },
  { id: 'dados', label: 'Dados' },
];

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
const DIFFICULTIES = (PLAYER_TABLES.find((t) => t.id === 'dificultad-tiradas-basicas')?.rows ?? []).map((r) => ({ name: r[0] as string, no: Number(r[1]) }));
const THRESHOLDS = (PLAYER_TABLES.find((t) => t.id === 'tiradas-avanzadas')?.rows ?? []).map((r) => ({ name: r[0] as string, value: Number(r[1]) }));

/** Campo numérico entero que permite teclear «−» y valores intermedios; `value` es `null` si no es un entero. */
function useInt(initial: string) {
  const [text, setText] = useState(initial);
  const trimmed = text.trim().replace('−', '-');
  const value = /^-?\d+$/.test(trimmed) ? Number(trimmed) : null;
  return { text, setText, value };
}
type IntField = ReturnType<typeof useInt>;

function IntInput({ label, field, hint, optional }: { label: string; field: IntField; hint?: string; optional?: boolean }) {
  const invalid = field.value === null && !(optional && field.text.trim() === '');
  return (
    <Field
      label={label}
      inputMode="numeric"
      value={field.text}
      onChange={(e) => field.setText(e.target.value)}
      error={invalid ? 'Introduce un número entero' : null}
      {...(hint ? { hint } : {})}
    />
  );
}

function Dice({ roll }: { roll: Pick<CheckResult, 'dice' | 'dragon'> }) {
  return (
    <span className={styles.dice} aria-label={`Dados ${roll.dice.slice(0, 2).join(', ')} y dado dragón ${roll.dragon}`}>
      <span className={styles.die}>{roll.dice[0]}</span>
      <span className={styles.die}>{roll.dice[1]}</span>
      <span className={`${styles.die} ${styles.dragon}`}>{roll.dice[2]}</span>
    </span>
  );
}

function CheckLine({ r, label }: { r: CheckResult; label?: string }) {
  const parts = [`3d6 ${r.sum}`, `atributo ${signed(r.attribute)}`];
  if (r.concentrationBonus) parts.push(`concentración +${r.concentrationBonus}`);
  if (r.modifier) parts.push(`modificador ${signed(r.modifier)}`);
  return (
    <div className={styles.result}>
      {label ? <strong>{label}</strong> : null}
      <Dice roll={r} />
      <span>
        Total <strong>{r.total}</strong> ({parts.join(' · ')})
      </span>
      {r.doubles ? <span className={styles.note}>Dobles: el dado dragón vale {r.dragon}</span> : null}
    </div>
  );
}

const useRng = (): Rng => useMemo(() => cryptoRng(), []);

function CheckFields({ prefix, attr, conc, mod }: { prefix: string; attr: IntField; conc: [boolean, (v: boolean) => void]; mod: IntField }) {
  const id = useId();
  return (
    <>
      <IntInput label={`${prefix}Atributo`} field={attr} />
      <div className={styles.check}>
        <input id={`${id}-conc`} type="checkbox" checked={conc[0]} onChange={(e) => conc[1](e.target.checked)} />
        <label htmlFor={`${id}-conc`}>{prefix}Concentración aplicable (+2)</label>
      </div>
      <IntInput label={`${prefix}Modificador`} field={mod} />
    </>
  );
}

function AttributeMode({ log }: { log: (s: string) => void }) {
  const rng = useRng();
  const attr = useInt('1');
  const mod = useInt('0');
  const no = useInt('11');
  const [conc, setConc] = useState(false);
  const [useTarget, setUseTarget] = useState(true);
  const [result, setResult] = useState<CheckResult | null>(null);
  const valid = attr.value !== null && mod.value !== null && (!useTarget || no.value !== null);

  const roll = () => {
    if (attr.value === null || mod.value === null) return;
    const r = attributeCheck(rng, { attribute: attr.value, concentration: conc, modifier: mod.value }, useTarget && no.value !== null ? no.value : undefined);
    setResult(r);
    log(`Atributo: ${r.dice.join('+')} → ${r.total}${r.success === undefined ? '' : r.success ? ` ✓ (NO ${r.target})` : ` ✗ (NO ${r.target})`}${r.stuntPoints ? ` · ${r.stuntPoints} PP` : ''}`);
  };

  return (
    <Card title="Tirada de atributo">
      <p>3d6 + atributo + 2 si se aplica una concentración. El último dado (rojo) es el dado dragón.</p>
      <CheckFields prefix="" attr={attr} conc={[conc, setConc]} mod={mod} />
      <div className={styles.check}>
        <input id="use-target" type="checkbox" checked={useTarget} onChange={(e) => setUseTarget(e.target.checked)} />
        <label htmlFor="use-target">Comparar con un número objetivo (NO)</label>
      </div>
      {useTarget ? (
        <>
          <IntInput label="NO" field={no} />
          <div className={styles.chips} role="group" aria-label="Dificultades habituales">
            {DIFFICULTIES.map((d) => (
              <Button key={d.name} variant={no.value === d.no ? 'primary' : 'secondary'} onClick={() => no.setText(String(d.no))}>
                {d.name} {d.no}
              </Button>
            ))}
          </div>
        </>
      ) : null}
      <Button onClick={roll} disabled={!valid}>
        Tirar 3d6
      </Button>
      {result ? (
        <div className={styles.output} aria-live="polite">
          <CheckLine r={result} />
          {result.success === undefined ? null : (
            <Notice kind={result.success ? 'ok' : 'warn'}>
              {result.success ? 'Éxito' : 'Fallo'}: {result.total} {result.success ? '≥' : '<'} {result.target}.
              {result.stuntPoints ? ` Dobles con éxito: ${result.stuntPoints} puntos de Proeza.` : ''}
            </Notice>
          )}
        </div>
      ) : null}
    </Card>
  );
}

function OpposedMode({ log }: { log: (s: string) => void }) {
  const rng = useRng();
  const aAttr = useInt('2');
  const aMod = useInt('0');
  const bAttr = useInt('1');
  const bMod = useInt('0');
  const [aConc, setAConc] = useState(false);
  const [bConc, setBConc] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof opposedCheck> | null>(null);
  const valid = [aAttr, aMod, bAttr, bMod].every((f) => f.value !== null);

  const roll = () => {
    if (!valid) return;
    const r = opposedCheck(rng, { attribute: aAttr.value ?? 0, concentration: aConc, modifier: aMod.value ?? 0 }, { attribute: bAttr.value ?? 0, concentration: bConc, modifier: bMod.value ?? 0 });
    setResult(r);
    log(`Enfrentada: A ${r.a.total} contra B ${r.b.total} → ${r.winner === 'tie' ? 'empate' : `gana ${r.winner.toUpperCase()}`}`);
  };

  const why = result
    ? result.a.total !== result.b.total
      ? 'por mayor resultado'
      : result.a.dragon !== result.b.dragon
        ? 'empate de resultado: gana el dado dragón más alto'
        : result.a.attribute !== result.b.attribute
          ? 'empate de resultado y de dado dragón: gana el atributo más alto'
          : 'empate total'
    : '';

  return (
    <Card title="Tirada enfrentada">
      <p>Gana el resultado más alto; el empate se resuelve por el dado dragón y, si persiste, por el atributo más alto.</p>
      <div className={styles.columns}>
        <div>
          <h3>Bando A</h3>
          <CheckFields prefix="A · " attr={aAttr} conc={[aConc, setAConc]} mod={aMod} />
        </div>
        <div>
          <h3>Bando B</h3>
          <CheckFields prefix="B · " attr={bAttr} conc={[bConc, setBConc]} mod={bMod} />
        </div>
      </div>
      <Button onClick={roll} disabled={!valid}>
        Tirar enfrentada
      </Button>
      {result ? (
        <div className={styles.output} aria-live="polite">
          <CheckLine r={result.a} label="A" />
          <CheckLine r={result.b} label="B" />
          <Notice kind={result.winner === 'tie' ? 'warn' : 'ok'}>
            {result.winner === 'tie' ? 'Empate: lo decide el DJ.' : `Gana ${result.winner.toUpperCase()}`} ({why}).
          </Notice>
        </div>
      ) : null}
    </Card>
  );
}

function AdvancedMode({ log }: { log: (s: string) => void }) {
  const rng = useRng();
  const attr = useInt('2');
  const mod = useInt('0');
  const no = useInt('11');
  const threshold = useInt('15');
  const [conc, setConc] = useState(false);
  const [erudite, setErudite] = useState(false);
  const [state, setState] = useState<AdvancedProgress | null>(null);
  const [rolls, setRolls] = useState<CheckResult[]>([]);
  const valid = [attr, mod, no, threshold].every((f) => f.value !== null) && (threshold.value ?? 0) > 0;

  const roll = () => {
    if (!valid) return;
    const current = state ?? startAdvanced(threshold.value ?? 1);
    const r = attributeCheck(rng, { attribute: attr.value ?? 0, concentration: conc, modifier: mod.value ?? 0 }, no.value ?? 0);
    const next = advanceProgress(current, r, erudite ? 1 : 0);
    setState(next);
    setRolls((prev) => [...prev, r]);
    log(`Avanzada: ${r.total} ${r.success ? '✓' : '✗'} → progreso ${next.progress}/${next.threshold}`);
  };
  const reset = () => {
    setState(null);
    setRolls([]);
  };

  return (
    <Card title="Tirada avanzada">
      <p>Cada tirada superada suma el resultado del dado dragón al progreso; los fallos no suman. Termina al alcanzar el umbral de éxito.</p>
      <CheckFields prefix="" attr={attr} conc={[conc, setConc]} mod={mod} />
      <IntInput label="NO de cada tirada" field={no} />
      <IntInput label="Umbral de éxito" field={threshold} />
      <div className={styles.chips} role="group" aria-label="Umbrales habituales">
        {THRESHOLDS.map((t) => (
          <Button key={t.name} variant={threshold.value === t.value ? 'primary' : 'secondary'} onClick={() => { threshold.setText(String(t.value)); reset(); }}>
            {t.name} {t.value}
          </Button>
        ))}
      </div>
      <div className={styles.check}>
        <input id="erudition" type="checkbox" checked={erudite} onChange={(e) => setErudite(e.target.checked)} />
        <label htmlFor="erudition">Erudición (Experto) en Astucia (Investigación): +1 por dado dragón</label>
      </div>
      <div className={styles.actions}>
        <Button onClick={roll} disabled={!valid || state?.complete === true}>
          Tirar
        </Button>
        <Button variant="secondary" onClick={reset} disabled={!state}>
          Reiniciar
        </Button>
      </div>
      {state ? (
        <div className={styles.output} aria-live="polite">
          <p>
            Progreso <strong>{state.progress}</strong> / {state.threshold} tras {state.rolls} {state.rolls === 1 ? 'tirada' : 'tiradas'}
          </p>
          <progress max={state.threshold} value={Math.min(state.progress, state.threshold)} className={styles.progress} />
          {rolls.map((r, i) => (
            <div key={i} className={styles.result}>
              <span>#{i + 1}</span>
              <Dice roll={r} />
              <span>
                {r.total} {r.success ? `✓ +${r.dragon + (erudite ? 1 : 0)}` : '✗ +0'}
              </span>
            </div>
          ))}
          {state.complete ? <Notice kind="ok">Tarea completada en {state.rolls} tiradas.</Notice> : null}
        </div>
      ) : null}
    </Card>
  );
}

const QUICK = ['1d3', '1d6', '2d6', '3d6'];

function FreeDiceMode({ log }: { log: (s: string) => void }) {
  const rng = useRng();
  const [expr, setExpr] = useState('2d6+3');
  const [result, setResult] = useState<{ expr: string; dice: number[]; bonus: number; total: number } | null>(null);
  let parseError: string | null = null;
  try {
    parseDice(expr);
  } catch {
    parseError = 'Usa la forma 2d6+3, 1d6−1 o 1d3 (dados de 3 o 6 caras)';
  }

  const roll = (text: string) => {
    try {
      const r = rollExpr(rng, parseDice(text));
      setResult({ expr: text, ...r });
      log(`${text}: ${r.dice.join('+')}${r.bonus ? `${r.bonus > 0 ? '+' : '−'}${Math.abs(r.bonus)}` : ''} = ${r.total}`);
    } catch {
      /* la entrada no válida ya se avisa bajo el campo */
    }
  };

  return (
    <Card title="Dados sueltos">
      <p>El 1d3 se tira como 1d6 dividido entre dos redondeando hacia arriba.</p>
      <div className={styles.chips} role="group" aria-label="Tiradas rápidas">
        {QUICK.map((q) => (
          <Button key={q} onClick={() => { setExpr(q); roll(q); }}>
            {q}
          </Button>
        ))}
      </div>
      <Field label="Expresión" value={expr} onChange={(e) => setExpr(e.target.value)} error={parseError} autoComplete="off" />
      <Button onClick={() => roll(expr)} disabled={parseError !== null}>
        Tirar
      </Button>
      {result ? (
        <div className={styles.output} aria-live="polite">
          <div className={styles.result}>
            <strong>{result.expr}</strong>
            <span>
              {result.dice.join(' + ')}
              {result.bonus ? ` ${result.bonus > 0 ? '+' : '−'} ${Math.abs(result.bonus)}` : ''} = <strong>{result.total}</strong>
            </span>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

export function DicePage() {
  const [mode, setMode] = useState<Mode>('atributo');
  const [history, setHistory] = useState<string[]>([]);
  const log = (s: string) => setHistory((h) => [s, ...h].slice(0, 12));
  const body: Record<Mode, ReactNode> = {
    atributo: <AttributeMode log={log} />,
    enfrentada: <OpposedMode log={log} />,
    avanzada: <AdvancedMode log={log} />,
    dados: <FreeDiceMode log={log} />,
  };
  return (
    <>
      <div className={styles.tabs} role="group" aria-label="Tipo de tirada">
        {MODES.map((m) => (
          <Button key={m.id} variant={mode === m.id ? 'primary' : 'secondary'} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
            {m.label}
          </Button>
        ))}
      </div>
      {body[mode]}
      {history.length ? (
        <Card title="Historial">
          <ol className={styles.history}>
            {history.map((h, i) => (
              <li key={`${i}-${h}`}>{h}</li>
            ))}
          </ol>
          <Button variant="secondary" onClick={() => setHistory([])}>
            Borrar historial
          </Button>
        </Card>
      ) : null}
    </>
  );
}
