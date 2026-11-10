import type { ReactNode } from 'react';
import {
  ANIMALS,
  ARMORS,
  BACKGROUNDS,
  CLASSES_DATA,
  CONDITIONS,
  FOCI,
  GEAR,
  NARRATIVE_PLAYER,
  PLAYER_TABLES,
  SHIELDS,
  SPELLS,
  STUNTS,
  TALENTS,
  WEAPONS,
  type Creature,
  type DmContent,
  type GameTable,
  type Source,
} from '@/content';
import { ATTACK_ATTRIBUTE, damageAttribute } from '@/rules/attack';
import { ATTRIBUTES, ATTRIBUTE_LABELS, SCHOOL_LABELS, WEAPON_GROUP_FOCUS, type AttributeId } from '@/rules/types';
import { Card } from '@/ui/Card';
import { KeyValue } from '@/ui/KeyValue';
import { Markdown } from '@/ui/Markdown';
import { Notice } from '@/ui/Notice';
import { Table } from '@/ui/Table';
import {
  castingLabel,
  classLabel,
  formatGearPrice,
  formatPrice,
  formatSpellCost,
  formatStuntCost,
  groupLabel,
  raceLabel,
  rankLabel,
  reloadLabel,
  signed,
} from './format';

const BOOKS = { jugador: 'Manual del Jugador', narrador: 'Manual del Narrador' } as const;

function SourceLine({ source, audience }: { source: Source; audience?: 'player' | 'dm' }) {
  return (
    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
      Fuente: {BOOKS[source.book]}, {source.section}
      {source.page ? `, p. ${source.page}` : ''}.{audience === 'dm' ? ' Contenido del DJ.' : ''}
    </p>
  );
}

function Aliases({ aliases }: { aliases: readonly string[] }) {
  if (!aliases.length) return null;
  return <p style={{ color: 'var(--color-text-muted)' }}>También: {aliases.join(', ')}.</p>;
}

function GenericTable({ table }: { table: GameTable }) {
  return (
    <Card title={table.name}>
      <Table columns={table.columns} rows={table.rows} />
      {table.note ? <p>{table.note}</p> : null}
      <SourceLine source={table.source} audience={table.audience} />
    </Card>
  );
}

const stuntName = (id: string, own: Creature['abilities'] = []) => STUNTS.find((s) => s.id === id)?.name ?? own.find((a) => a.id === id)?.name ?? id;
const talentName = (id: string) => TALENTS.find((t) => t.id === id)?.name ?? id;

/** Ficha literal de una criatura o PNJ: los valores se muestran tal como se publican, sin recalcular. */
export function CreatureSheet({ c }: { c: Creature }) {
  const attrs = ATTRIBUTES.map((id) => {
    const names = c.focuses[id] ?? [];
    return [ATTRIBUTE_LABELS[id], `${c.attributes[id]}${names.length ? ` (${names.join(', ')})` : ''}`] as const;
  });
  return (
    <>
      <Card title={c.name}>
        <p>{c.summary}</p>
        <Aliases aliases={c.aliases} />
        {c.classLevel ? <p>{classLabel(c.classLevel.class)} de nivel {c.classLevel.level}.</p> : null}
        {c.noncombatant ? <Notice kind="info">No combatiente: su tirada de ataque siempre es +0.</Notice> : null}
        <h3>Atributos (concentraciones)</h3>
        <KeyValue items={attrs} />
        {c.combat ? (
          <>
            <h3>Valores de combate</h3>
            <KeyValue
              items={[
                ['Velocidad', c.combat.flyingSpeed ? `${c.combat.speed} (${c.combat.flyingSpeed} volando)` : `${c.combat.speed}`],
                ['Salud', `${c.combat.health}`],
                ['Defensa', c.combat.defenseWithShield ? `${c.combat.defense} (${c.combat.defenseWithShield} con escudo)` : `${c.combat.defense}`],
                ['Armadura', `${c.combat.armor}`],
              ]}
            />
          </>
        ) : (
          <p>El manual no publica bloque de combate para este personaje.</p>
        )}
        {c.attacks.length ? (
          <>
            <h3>Ataques</h3>
            <Table
              columns={['Arma', 'Ataque', 'Daño']}
              rows={c.attacks.map((a) => [
                a.name,
                signed(a.bonus),
                `${a.damage.replace('-', '−')}${a.penetrating ? ' (penetrante)' : ''}${a.range ? ` · alcance ${a.range.short}/${a.range.long} m` : ''}`,
              ])}
            />
          </>
        ) : null}
        <KeyValue
          items={[
            ['Proezas predilectas', c.favoredStunts.map((s) => stuntName(s, c.abilities)).join(', ')],
            ['Talentos', c.talents.map((t) => `${talentName(t.talent)} (${rankLabel(t.rank)})`).join(', ')],
            ['Grupos de armas', c.weaponGroups.map(groupLabel).join(', ')],
            ['Equipo', c.equipment],
          ]}
        />
        {c.abilities.length ? (
          <>
            <h3>Aptitudes especiales</h3>
            <ul>
              {c.abilities.map((a) => (
                <li key={a.id}>
                  <strong>{a.name}</strong>
                  {a.stuntCost ? ` (${a.stuntCost} PP)` : ''}: {a.text}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {c.notes ? <p>{c.notes}</p> : null}
        <SourceLine source={c.source} audience={c.audience} />
      </Card>
    </>
  );
}

function stuntReductions(stuntId: string): string[] {
  const out: string[] = [];
  for (const t of TALENTS) for (const sc of t.stuntCosts) if (sc.stuntId === stuntId) out.push(`${t.name} (${rankLabel(sc.rank)}): ${sc.cost} PP${sc.when ? `, ${sc.when}` : ''}`);
  for (const c of CLASSES_DATA) for (const l of c.levels) for (const f of l.features) for (const sc of f.stuntCosts) if (sc.stuntId === stuntId) out.push(`${c.name}, nivel ${l.level}: ${sc.cost} PP`);
  return out;
}

function Weapon({ id }: { id: string }) {
  const w = WEAPONS.find((x) => x.id === id);
  if (!w) return null;
  const atk = ATTACK_ATTRIBUTE[w.group];
  return (
    <Card title={w.name}>
      <p>{w.description}</p>
      <Aliases aliases={w.aliases} />
      <KeyValue
        items={[
          ['Grupo de armas', groupLabel(w.group)],
          ['Tirada de ataque', `${ATTRIBUTE_LABELS[atk]} (${WEAPON_GROUP_FOCUS[w.group]})`],
          ['Daño', `${w.damage.replace('-', '−')} + ${ATTRIBUTE_LABELS[damageAttribute(w.group)]}`],
          ['Fuerza mínima', w.minStrength === null ? '—' : signed(w.minStrength).replace('+', '')],
          ['Alcance corto / largo', w.range ? `${w.range.short} m / ${w.range.long} m (largo alcance: −2 al ataque)` : null],
          ['Recarga', w.reload ? reloadLabel(w.reload) : null],
          ['Dos manos', w.twoHanded ? 'Sí' : null],
          ['Precio', formatPrice(w.price)],
        ]}
      />
      <p>Sin entrenamiento en el grupo: −2 al ataque y mitad del daño (redondeando abajo, tras sumar el atributo); los proyectiles, mitad de alcance. Con Fuerza inferior a la mínima, el arma solo inflige 1d6−1.</p>
      <SourceLine source={w.source} />
    </Card>
  );
}

function Spell({ id }: { id: string }) {
  const s = SPELLS.find((x) => x.id === id);
  if (!s) return null;
  return (
    <Card title={s.name}>
      <p>{s.effect}</p>
      <KeyValue
        items={[
          ['Escuela', SCHOOL_LABELS[s.school]],
          ['Tipo', s.type],
          ['Coste', formatSpellCost(s.cost)],
          ['Preparación', castingLabel(s.casting)],
          ['NO de lanzamiento', `${s.target}`],
          ['Resistencia', s.resistance ? `${ATTRIBUTE_LABELS[s.resistance.attribute]}${s.resistance.focus ? ` (${s.resistance.focus})` : ''} contra Potencia mágica` : 'ninguna'],
          ['Alcance / área', s.range],
          ['Duración', s.duration],
        ]}
      />
      <p>Tirada de hechizo = 3d6 + Magia + concentración de la escuela. Con armadura se suma su impedimento mágico al coste.</p>
      <SourceLine source={s.source} />
    </Card>
  );
}

const attrList = (list: readonly AttributeId[]) => list.map((a) => ATTRIBUTE_LABELS[a]).join(', ');

/** Contenido de jugador: busca en los catálogos y devuelve la ficha, o `null` si no existe. */
export function renderPlayerRecord(kind: string, id: string): ReactNode | null {
  switch (kind) {
    case 'weapon':
      return WEAPONS.some((w) => w.id === id) ? <Weapon id={id} /> : null;
    case 'armor': {
      const a = ARMORS.find((x) => x.id === id);
      if (!a) return null;
      return (
        <Card title={a.name}>
          <p>{a.description}</p>
          <Aliases aliases={a.aliases} />
          <KeyValue
            items={[
              ['Valor de armadura (VA)', `${a.armorValue}`],
              ['Penalización', a.impediment ? `−${a.impediment}` : '0'],
              ['Maná adicional por hechizo', `+${a.spellManaExtra}`],
              ['Precio', formatPrice(a.price)],
            ]}
          />
          <p>Con entrenamiento la penalización resta a la Velocidad; sin él, a la Destreza (y por tanto a la Velocidad). La armadura no protege contra el daño penetrante.</p>
          <SourceLine source={a.source} />
        </Card>
      );
    }
    case 'shield': {
      const s = SHIELDS.find((x) => x.id === id);
      if (!s) return null;
      return (
        <Card title={s.name}>
          <p>{s.description}</p>
          <Aliases aliases={s.aliases} />
          <KeyValue items={[['Bonificación a la Defensa', `+${s.defenseBonus}`], ['Precio', formatPrice(s.price)]]} />
          <p>Sin el talento Combate con arma y escudo, la bonificación máxima es +1.</p>
          <SourceLine source={s.source} />
        </Card>
      );
    }
    case 'gear': {
      const g = GEAR.find((x) => x.id === id);
      if (!g) return null;
      return (
        <Card title={g.name}>
          {g.description ? <p>{g.description}</p> : null}
          <Aliases aliases={g.aliases} />
          <KeyValue items={[['Precio', formatGearPrice(g.price)]]} />
          <SourceLine source={g.source} />
        </Card>
      );
    }
    case 'stunt': {
      const s = STUNTS.find((x) => x.id === id);
      if (!s) return null;
      const reductions = stuntReductions(s.id);
      return (
        <Card title={s.name}>
          <p>{s.effect}</p>
          <KeyValue
            items={[
              ['Tipo', s.kind === 'combate' ? 'Proeza de combate' : 'Proeza mágica'],
              ['Coste', formatStuntCost(s)],
              ['Frecuencia', s.oncePerRound ? 'Una vez por asalto' : 'Puede repetirse mientras haya PP'],
              ['Puntos adicionales', s.noExtraPoints ? 'La tirada adicional no genera PP aunque salgan dobles' : null],
            ]}
          />
          {reductions.length ? (
            <>
              <h3>Rebajas de coste</h3>
              <ul>{reductions.map((r) => <li key={r}>{r}</li>)}</ul>
            </>
          ) : null}
          <p>Se obtienen con una tirada con éxito y dobles en dos dados cualesquiera: tantos PP como el dado dragón.</p>
          <SourceLine source={s.source} />
        </Card>
      );
    }
    case 'talent': {
      const t = TALENTS.find((x) => x.id === id);
      if (!t) return null;
      return (
        <Card title={t.name}>
          <p>{t.summary}</p>
          <KeyValue items={[['Clases', t.classes.map(classLabel).join(', ')], ['Requisitos', t.requirements.text], ['Aprendiz', t.apprentice], ['Experto', t.expert]]} />
          <SourceLine source={t.source} />
        </Card>
      );
    }
    case 'class': {
      const c = CLASSES_DATA.find((x) => x.id === id);
      if (!c) return null;
      return (
        <Card title={c.name}>
          <p>{c.summary}</p>
          <KeyValue
            items={[
              ['Atributos primarios', attrList(c.primaryAttributes)],
              ['Atributos secundarios', attrList(c.secondaryAttributes)],
              ['Salud inicial', `${c.baseHealth} + Constitución + 1d6`],
              ['Maná inicial', c.startingMana ? '10 + Magia + 1d6 (y Magia + 1d6 por nivel)' : null],
              ['Grupos de armas', [...c.weaponGroups.fixed.map(groupLabel), c.weaponGroups.choose ? `${c.weaponGroups.choose.count} a elegir entre ${c.weaponGroups.choose.from.map(groupLabel).join(', ')}` : null].filter(Boolean).join(' · ')],
            ]}
          />
          <h3>Equipo inicial</h3>
          <ul>{c.startingEquipment.map((e) => <li key={e}>{e}</li>)}</ul>
          <h3>Aptitudes por nivel</h3>
          {c.levels.map((l) => (
            <div key={l.level}>
              <h4>Nivel {l.level}</h4>
              <ul>
                {l.features.map((f) => (
                  <li key={f.id}>
                    <strong>{f.name}.</strong> {f.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <SourceLine source={c.source} />
        </Card>
      );
    }
    case 'background': {
      const b = BACKGROUNDS.find((x) => x.id === id);
      if (!b) return null;
      return (
        <>
          <Card title={b.name}>
            <p>{b.summary}</p>
            <Aliases aliases={b.aliases} />
            <KeyValue
              items={[
                ['Raza', b.races.map(raceLabel).join(' o ')],
                ['Atributo', `+${b.attributeBonus.value} ${ATTRIBUTE_LABELS[b.attributeBonus.attribute]}`],
                ['Concentración (a elegir una)', b.focusChoices.map((f) => `${ATTRIBUTE_LABELS[f.attribute]} (${f.focus})`).join(' o ')],
                ['Idiomas', b.languages.map((l) => `${l.skill === 'hablar' ? 'habla' : l.skill === 'leer' ? 'lee' : 'habla y lee'} ${l.language}`).join('; ')],
                ['Clases', b.classes.map(classLabel).join(' o ')],
                ['Beneficios adicionales', `${b.benefitRolls} tiradas de 2d6 en la tabla; si se repite un resultado, se vuelve a tirar`],
                ['Inconveniente', b.drawback],
              ]}
            />
            <SourceLine source={b.source} />
          </Card>
          {b.benefitTables.map((t) => (
            <Card key={t.appliesTo.join('-')} title={`Beneficios adicionales${b.benefitTables.length > 1 ? `: ${t.appliesTo.map(raceLabel).join(', ')}` : ''}`}>
              <Table columns={['2d6', 'Beneficio']} rows={t.rows.map((r) => [r.min === r.max ? `${r.min}` : `${r.min}–${r.max}`, r.label])} />
            </Card>
          ))}
        </>
      );
    }
    case 'spell':
      return SPELLS.some((s) => s.id === id) ? <Spell id={id} /> : null;
    case 'condition': {
      const c = CONDITIONS.find((x) => x.id === id);
      if (!c) return null;
      return (
        <Card title={c.name}>
          <p>{c.summary}</p>
          <Aliases aliases={c.aliases} />
          <Notice kind="info">No existe una lista oficial de estados: cualquier otro efecto es un «efecto libre del DJ».</Notice>
          <SourceLine source={c.source} />
        </Card>
      );
    }
    case 'table': {
      const t = PLAYER_TABLES.find((x) => x.id === id);
      return t ? <GenericTable table={t} /> : null;
    }
    case 'focus': {
      const attr = ATTRIBUTES.find((a) => a === id);
      if (!attr) return null;
      const list = FOCI.filter((f) => f.attribute === attr);
      return (
        <Card title={`Concentraciones de ${ATTRIBUTE_LABELS[attr]}`}>
          <p>Con una concentración aplicable se suma +2 a la tirada (solo una por tirada).</p>
          <ul>{list.map((f) => <li key={f.name}>{f.name}</li>)}</ul>
          <SourceLine source={list[0]!.source} />
        </Card>
      );
    }
    case 'animal': {
      const a = ANIMALS.find((x) => x.id === id);
      return a ? <CreatureSheet c={a} /> : null;
    }
    case 'narrative': {
      const n = NARRATIVE_PLAYER.find((x) => x.id === id);
      if (!n) return null;
      return (
        <Card title={`${n.id}. ${n.title}`}>
          <p style={{ color: 'var(--color-text-muted)' }}>{n.chapter}</p>
          <Markdown source={n.body} />
        </Card>
      );
    }
    default:
      return null;
  }
}

/** Contenido del DJ: solo se llama con el chunk del DJ ya cargado (permiso `dm.compendium`). */
export function renderDmRecord(dm: DmContent, kind: string, id: string): ReactNode | null {
  switch (kind) {
    case 'creature': {
      const c = dm.CREATURES.find((x) => x.id === id);
      return c ? <CreatureSheet c={c} /> : null;
    }
    case 'npc': {
      const c = dm.NPCS.find((x) => x.id === id);
      return c ? <CreatureSheet c={c} /> : null;
    }
    case 'item': {
      const i = dm.MAGIC_ITEMS.find((x) => x.id === id);
      if (!i) return null;
      return (
        <Card title={i.name}>
          <p>{i.effect}</p>
          <Aliases aliases={i.aliases} />
          <KeyValue items={[['Tipo', i.kind === 'temporal' ? 'Objeto mágico temporal' : 'Objeto mágico permanente'], ['Restricción', i.restriction]]} />
          <SourceLine source={i.source} audience="dm" />
        </Card>
      );
    }
    case 'table': {
      const t = dm.DM_TABLES.find((x) => x.id === id);
      return t ? <GenericTable table={t} /> : null;
    }
    case 'narrative': {
      const n = dm.NARRATIVE_DM.find((x) => x.id === id);
      if (!n) return null;
      return (
        <Card title={`${n.id}. ${n.title}`}>
          <p style={{ color: 'var(--color-text-muted)' }}>{n.chapter} · Contenido del DJ</p>
          <Markdown source={n.body} />
        </Card>
      );
    }
    default:
      return null;
  }
}
