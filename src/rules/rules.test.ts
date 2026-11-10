import { describe, expect, it } from 'vitest';
import {
  ATTACK_ATTRIBUTE,
  advanceProgress,
  applyDamage,
  applyHealing,
  armorEffect,
  attackBonus,
  attributeCheck,
  attributeFromRoll,
  breatherHealing,
  canTakeBreather,
  castSpell,
  damageAttribute,
  defense,
  diesAtTurnStart,
  dyingRounds,
  effectiveArmor,
  effectiveRange,
  effectiveShieldBonus,
  effectiveStuntCost,
  evaluateCheck,
  firstAidHealing,
  formatDice,
  generateAttributes,
  hasDoubles,
  healthPerLevel,
  initialHealth,
  initialMana,
  levelForXp,
  makeRoll3d6,
  opposedWinner,
  parseDice,
  rangeBand,
  rangeModifier,
  recoverMana,
  resolveAttack,
  rollExpr,
  rollLiteralDamage,
  rollWeaponDamage,
  d3,
  seededRng,
  sequenceRng,
  sleepHealing,
  speed,
  spellManaCost,
  spellPotency,
  startAdvanced,
  startingSilver,
  surgeonHealing,
  swapAttributes,
  trainedInArmor,
  validateStuntSpend,
  xpToNextLevel,
  ATTRIBUTES,
  type AttributeScores,
  type StuntDefinition,
  type WeaponStats,
} from '@/rules';

const attrs = (over: Partial<AttributeScores> = {}): AttributeScores => ({
  astucia: 0,
  comunicacion: 0,
  constitucion: 0,
  destreza: 0,
  fuerza: 0,
  magia: 0,
  percepcion: 0,
  voluntad: 0,
  ...over,
});

const weapon = (over: Partial<WeaponStats> = {}): WeaponStats => ({
  group: 'hojas-pesadas',
  damage: parseDice('2d6'),
  minStrength: 1,
  ...over,
});

describe('dados', () => {
  it('interpreta y formatea expresiones', () => {
    expect(parseDice('2d6+3')).toEqual({ count: 2, sides: 6, bonus: 3 });
    expect(parseDice('1d6−1')).toEqual({ count: 1, sides: 6, bonus: -1 });
    expect(parseDice('1d3+1')).toEqual({ count: 1, sides: 3, bonus: 1 });
    expect(formatDice(parseDice('3d6'))).toBe('3d6');
    expect(formatDice(parseDice('1d6-1'))).toBe('1d6-1');
    expect(() => parseDice('2d8')).toThrow();
  });

  it('1d3 = 1d6 / 2 redondeando arriba', () => {
    const results = [1, 2, 3, 4, 5, 6].map((face) => d3(sequenceRng([face])));
    expect(results).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it('el RNG determinista es reproducible y cubre las seis caras', () => {
    const a = seededRng(7);
    const b = seededRng(7);
    const seqA = Array.from({ length: 50 }, () => rollExpr(a, parseDice('1d6')).total);
    const seqB = Array.from({ length: 50 }, () => rollExpr(b, parseDice('1d6')).total);
    expect(seqA).toEqual(seqB);
    expect(new Set(seqA).size).toBe(6);
  });

  it('rollExpr suma la bonificación', () => {
    expect(rollExpr(sequenceRng([4, 5]), parseDice('2d6+3'))).toEqual({ dice: [4, 5], bonus: 3, total: 12 });
  });
});

describe('tiradas de atributo y dobles', () => {
  it('detecta dobles en dos dados cualesquiera, incluido el dragón', () => {
    expect(hasDoubles([3, 3, 5])).toBe(true); // los dos primeros
    expect(hasDoubles([3, 5, 3])).toBe(true); // primero y dragón
    expect(hasDoubles([5, 3, 3])).toBe(true); // segundo y dragón
    expect(hasDoubles([1, 2, 3])).toBe(false);
    expect(hasDoubles([4, 4, 4])).toBe(true);
  });

  it('PP igual al dado dragón solo con éxito y dobles', () => {
    const roll = makeRoll3d6([2, 5, 5]); // dobles, dragón 5, suma 12
    expect(evaluateCheck(roll, { attribute: 1 }, 13).stuntPoints).toBe(5); // 13 ≥ 13 éxito
    expect(evaluateCheck(roll, { attribute: 0 }, 13).stuntPoints).toBe(0); // 12 < 13 fallo: sin PP
    expect(evaluateCheck(makeRoll3d6([1, 2, 6]), { attribute: 9 }, 10).stuntPoints).toBe(0); // éxito sin dobles
    expect(evaluateCheck(roll, { attribute: 5 }).stuntPoints).toBe(0); // sin objetivo no hay éxito que premiar
  });

  it('suma atributo, concentración (+2) y modificadores; igualar el NO es éxito', () => {
    const input = { attribute: 2, concentration: true, modifier: -1 };
    const r = evaluateCheck(makeRoll3d6([2, 3, 4]), input, 13);
    expect(r.total).toBe(9 + 2 + 2 - 1);
    expect(r.success).toBe(false);
    expect(evaluateCheck(makeRoll3d6([2, 3, 4]), input, 12).success).toBe(true); // igualar el NO basta
  });

  it('attributeCheck usa tres dados del RNG con el último como dragón', () => {
    const r = attributeCheck(sequenceRng([1, 2, 6]), { attribute: 0 }, 5);
    expect(r.dice).toEqual([1, 2, 6]);
    expect(r.dragon).toBe(6);
  });
});

describe('tiradas enfrentadas', () => {
  const mk = (dice: [number, number, number], attribute: number) => evaluateCheck(makeRoll3d6(dice), { attribute });

  it('gana el resultado más alto', () => {
    const a = mk([1, 2, 3], 5); // 6 + 5 = 11
    const b = mk([2, 2, 3], 1); // 7 + 1 = 8
    expect(opposedWinner(a, b)).toBe('a');
    expect(opposedWinner(b, a)).toBe('b');
  });
  it('empate de total: decide el dado dragón más alto', () => {
    const a = mk([2, 3, 5], 0); // 10, dragón 5
    const b = mk([4, 3, 3], 0); // 10, dragón 3
    expect(opposedWinner(a, b)).toBe('a');
    expect(opposedWinner(b, a)).toBe('b');
  });
  it('empate de total y dragón: decide el atributo más alto', () => {
    const a = mk([2, 4, 4], 1); // 10 + 1 = 11, dragón 4, atributo 1
    const b = mk([1, 3, 4], 3); // 8 + 3 = 11, dragón 4, atributo 3
    expect(a.total).toBe(b.total);
    expect(a.dragon).toBe(b.dragon);
    expect(opposedWinner(a, b)).toBe('b');
    expect(opposedWinner(b, a)).toBe('a');
  });
  it('si todo coincide, el empate se mantiene', () => {
    expect(opposedWinner(mk([2, 3, 4], 3), mk([3, 2, 4], 3))).toBe('tie');
  });
});

describe('tiradas avanzadas', () => {
  it('solo suman los éxitos y termina al alcanzar el umbral', () => {
    let st = startAdvanced(15);
    const roll = (dice: [number, number, number]) => evaluateCheck(makeRoll3d6(dice), { attribute: 0 }, 13);
    st = advanceProgress(st, roll([1, 1, 2])); // fallo (4)
    expect(st.progress).toBe(0);
    st = advanceProgress(st, roll([6, 5, 2])); // 13 éxito, dragón 2
    st = advanceProgress(st, roll([6, 6, 5])); // 17 éxito, dragón 5
    st = advanceProgress(st, roll([6, 6, 4])); // 16 éxito, dragón 4
    expect(st).toMatchObject({ progress: 11, rolls: 4, complete: false });
    st = advanceProgress(st, roll([6, 6, 4])); // otro 4 → 15
    expect(st).toMatchObject({ progress: 15, complete: true });
  });

  it('el ejemplo del manual: 2, 5, 4 y 6 superan el umbral de 15', () => {
    let st = startAdvanced(15);
    const win = (dragon: number) => evaluateCheck(makeRoll3d6([6, 6, dragon]), { attribute: 5 }, 13);
    for (const d of [2, 5, 4, 6]) st = advanceProgress(st, win(d));
    expect(st.progress).toBe(17);
    expect(st.complete).toBe(true);
  });

  it('Erudición (Experto) suma +1 por dado dragón', () => {
    const win = evaluateCheck(makeRoll3d6([6, 6, 3]), { attribute: 5 }, 13);
    expect(advanceProgress(startAdvanced(10), win, 1).progress).toBe(4);
  });

  it('exige una tirada con objetivo', () => {
    expect(() => advanceProgress(startAdvanced(5), evaluateCheck(makeRoll3d6([1, 2, 3]), { attribute: 0 }))).toThrow();
  });
});

describe('atributos iniciales', () => {
  it('tabla de 3d6 a valor', () => {
    const table: [number, number][] = [
      [3, -2], [4, -1], [5, -1], [6, 0], [7, 0], [8, 0], [9, 1], [10, 1], [11, 1], [12, 2], [13, 2], [14, 2], [15, 3], [16, 3], [17, 3], [18, 4],
    ];
    for (const [total, value] of table) expect(attributeFromRoll(total)).toBe(value);
    expect(() => attributeFromRoll(2)).toThrow();
    expect(() => attributeFromRoll(19)).toThrow();
  });

  it('ejemplo del manual: 8, 13, 5, 16, 11, 11, 6, 15 en orden alfabético', () => {
    // Cada total se obtiene con tres dados que suman ese valor.
    const triples: Record<number, [number, number, number]> = {
      8: [3, 2, 3], 13: [4, 4, 5], 5: [1, 2, 2], 16: [5, 5, 6], 11: [3, 4, 4], 6: [1, 2, 3], 15: [5, 5, 5],
    };
    const faces = [8, 13, 5, 16, 11, 11, 6, 15].flatMap((t) => triples[t] as number[]);
    const { scores } = generateAttributes(sequenceRng(faces));
    expect(scores).toEqual({
      astucia: 0, comunicacion: 2, constitucion: -1, destreza: 3, fuerza: 1, magia: 1, percepcion: 0, voluntad: 3,
    });
    expect(swapAttributes(scores, 'percepcion', 'voluntad')).toMatchObject({ percepcion: 3, voluntad: 0 });
  });

  it('genera ocho atributos entre −2 y 4 y dinero inicial 50 + 3d6', () => {
    const { scores } = generateAttributes(seededRng(3));
    expect(Object.keys(scores)).toEqual([...ATTRIBUTES]);
    for (const v of Object.values(scores)) expect(v >= -2 && v <= 4).toBe(true);
    expect(startingSilver(sequenceRng([4, 4, 4]))).toBe(62);
  });
});

describe('valores derivados', () => {
  it('Defensa = 10 + Destreza + escudo; sin Combate con arma y escudo el escudo queda en +1', () => {
    expect(defense(4)).toBe(14);
    expect(defense(4, 1)).toBe(15);
    expect(effectiveShieldBonus(2, false)).toBe(1);
    expect(effectiveShieldBonus(3, true)).toBe(3);
    expect(effectiveShieldBonus(1, false)).toBe(1);
  });

  it('Velocidad por raza + Destreza; ejemplo del manual (elfa con Destreza 4 y cuero ligera = 16)', () => {
    expect(speed('elfo', 4, 0)).toBe(16);
    expect(speed('humano', 1)).toBe(11);
    expect(speed('enano', 0, 0)).toBe(8);
  });

  it('armadura: con entrenamiento resta a la Velocidad; sin él, a la Destreza (y por tanto a la Velocidad y la Defensa)', () => {
    const trained = armorEffect({ destreza: 2, impediment: 2, trained: true });
    expect(trained).toEqual({ destreza: 2, speedPenalty: 2 });
    expect(speed('humano', trained.destreza, trained.speedPenalty)).toBe(10);
    expect(defense(trained.destreza)).toBe(12);

    const untrained = armorEffect({ destreza: 2, impediment: 2, trained: false });
    expect(untrained).toEqual({ destreza: 0, speedPenalty: 0 });
    expect(speed('humano', untrained.destreza, untrained.speedPenalty)).toBe(10);
    expect(defense(untrained.destreza)).toBe(10);
  });

  it('armadura de pícaro ignora el cuero; impedimento 0 no penaliza', () => {
    expect(armorEffect({ destreza: 3, impediment: 1, trained: false, ignoredByRogue: true })).toEqual({ destreza: 3, speedPenalty: 0 });
    expect(armorEffect({ destreza: 3, impediment: 0, trained: false })).toEqual({ destreza: 3, speedPenalty: 0 });
  });

  it('Entrenamiento con armaduras: Aprendiz cuero y malla; Experto, corazas', () => {
    expect(trainedInArmor('cuero', 'aprendiz')).toBe(true);
    expect(trainedInArmor('malla', 'aprendiz')).toBe(true);
    expect(trainedInArmor('coraza', 'aprendiz')).toBe(false);
    expect(trainedInArmor('coraza', 'experto')).toBe(true);
    expect(trainedInArmor('cuero', null)).toBe(false);
  });

  it('Salud y Maná iniciales y por nivel', () => {
    expect(initialHealth('guerrero', 2, 4)).toBe(36);
    expect(initialHealth('picaro', -1, 3)).toBe(27);
    expect(initialHealth('mago', 0, 1)).toBe(21);
    expect(initialMana(3, 5)).toBe(18);
    expect(healthPerLevel(-1, 4)).toBe(3); // ejemplo del manual
    expect(healthPerLevel(2, 6)).toBe(8);
  });

  it('niveles y experiencia', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(1999)).toBe(1);
    expect(levelForXp(2000)).toBe(2);
    expect(levelForXp(4499)).toBe(2);
    expect(levelForXp(4500)).toBe(3);
    expect(levelForXp(7500)).toBe(4);
    expect(levelForXp(10999)).toBe(4);
    expect(levelForXp(11000)).toBe(5);
    expect(levelForXp(14999)).toBe(5);
    expect(xpToNextLevel(1500)).toBe(500);
    expect(xpToNextLevel(11000)).toBeNull();
  });

  it('Potencia mágica = 10 + Magia + concentración', () => {
    expect(spellPotency(3, false)).toBe(13);
    expect(spellPotency(3, true)).toBe(15);
    expect(spellPotency(3, true, 1)).toBe(16); // Voluta de Hechizos
  });
});

describe('Salud, muerte y recuperación', () => {
  it('la Salud nunca baja de 0 ni supera el máximo', () => {
    expect(applyDamage(5, 9)).toBe(0);
    expect(applyDamage(5, 0)).toBe(5);
    expect(applyDamage(0, 4)).toBe(0);
    expect(applyDamage(5, -3)).toBe(5);
    expect(applyHealing(10, 14, 9)).toBe(14);
    expect(applyHealing(10, 14, 2)).toBe(12);
  });

  it('moribundo: 2 + Constitución asaltos; muere al comienzo de su turno en el último', () => {
    expect(dyingRounds(2)).toBe(4); // ejemplo del manual: Gerhard, Constitución 2
    expect(diesAtTurnStart(2, 3)).toBe(false);
    expect(diesAtTurnStart(2, 4)).toBe(true);
    expect(dyingRounds(-2)).toBe(0);
  });

  it('primeros auxilios y recuperación', () => {
    expect(firstAidHealing(4, 1)).toBe(5); // ejemplo del manual
    expect(surgeonHealing(4, 1)).toBe(10); // el doble de (dado dragón + Astucia)
    expect(breatherHealing(2, 2)).toBe(9); // ejemplo del manual
    expect(sleepHealing(2, 2)).toBe(14);
    expect(canTakeBreather(0)).toBe(false);
    expect(canTakeBreather(3)).toBe(true);
  });

  it('recuperación de Maná: 1d6 + Magia por hora; ocho horas seguidas lo recuperan todo', () => {
    expect(recoverMana(sequenceRng([3, 4]), { current: 2, max: 20, magia: 2, hours: 2 })).toBe(2 + 5 + 6);
    expect(recoverMana(sequenceRng([6]), { current: 2, max: 8, magia: 3, hours: 1 })).toBe(8);
    expect(recoverMana(sequenceRng([1]), { current: 0, max: 30, magia: 1, hours: 8, uninterrupted: true })).toBe(30);
  });
});

describe('ataque', () => {
  it('atributo de ataque por grupo y de daño (Percepción en arcos)', () => {
    expect(ATTACK_ATTRIBUTE).toMatchObject({
      arcos: 'destreza', bastones: 'destreza', 'hojas-ligeras': 'destreza', pelea: 'destreza',
      contundentes: 'fuerza', hachas: 'fuerza', 'hojas-pesadas': 'fuerza', lanzas: 'fuerza',
    });
    expect(damageAttribute('arcos')).toBe('percepcion');
    expect(damageAttribute('hachas')).toBe('fuerza');
    expect(damageAttribute('pelea')).toBe('fuerza');
  });

  it('ejemplo del manual: Fuerza 3, concentración Hachas y carga = 15 contra Defensa 12', () => {
    const ctx = { attributes: attrs({ fuerza: 3 }), weapon: weapon({ group: 'hachas' }), trained: true, groupFocus: true, modifier: 1 };
    const r = resolveAttack(makeRoll3d6([3, 3, 3]), ctx, 12);
    expect(r.total).toBe(9 + 3 + 2 + 1);
    expect(r.hit).toBe(true);
  });

  it('sin entrenamiento: −2 al ataque', () => {
    const ctx = { attributes: attrs({ fuerza: 1 }), weapon: weapon(), trained: false };
    expect(attackBonus(ctx)).toMatchObject({ attribute: 'fuerza', total: -1, untrainedPenalty: -2 });
    expect(resolveAttack(makeRoll3d6([2, 3, 4]), ctx, 8).total).toBe(9 + 1 - 2);
  });

  it('daño del manual: 3d6 + Fuerza − Armadura (10 + 3 − 4 = 9)', () => {
    const w = weapon({ group: 'hachas', damage: parseDice('3d6'), minStrength: 3 });
    const d = rollWeaponDamage(sequenceRng([4, 3, 3]), { attributes: attrs({ fuerza: 3 }), weapon: w, trained: true, targetArmor: 4 });
    expect(d.total).toBe(9);
    expect(d).toMatchObject({ weaponRoll: 10, attribute: 'fuerza', armor: 4, beforeArmor: 13, underStrength: false });
  });

  it('el daño nunca es negativo', () => {
    const d = rollWeaponDamage(sequenceRng([1]), {
      attributes: attrs({ fuerza: 0 }),
      weapon: weapon({ damage: parseDice('1d6'), minStrength: null }),
      trained: true,
      targetArmor: 10,
    });
    expect(d.total).toBe(0);
  });

  it('los arcos suman Percepción en lugar de Fuerza', () => {
    const w = weapon({ group: 'arcos', damage: parseDice('1d6+3'), minStrength: 1 });
    const d = rollWeaponDamage(sequenceRng([2]), { attributes: attrs({ fuerza: 1, percepcion: 4 }), weapon: w, trained: true, targetArmor: 0 });
    expect(d.attribute).toBe('percepcion');
    expect(d.total).toBe(2 + 3 + 4);
  });

  it('armadura y daño penetrante: el penetrante la ignora; Atravesar armadura la reduce a la mitad (abajo)', () => {
    const base = { attributes: attrs({ fuerza: 2 }), weapon: weapon({ damage: parseDice('2d6'), minStrength: 1 }), trained: true, targetArmor: 5 };
    expect(rollWeaponDamage(sequenceRng([3, 3]), base).total).toBe(6 + 2 - 5);
    expect(rollWeaponDamage(sequenceRng([3, 3]), { ...base, penetrating: true }).total).toBe(8);
    expect(rollWeaponDamage(sequenceRng([3, 3]), { ...base, armorHalved: true }).total).toBe(8 - 2);
    expect(effectiveArmor(5, { armorHalved: true })).toBe(2);
    expect(effectiveArmor(5, { penetrating: true, armorHalved: true })).toBe(0);
    expect(effectiveArmor(0, { armorHalved: true })).toBe(0);
  });

  it('sin entrenamiento: mitad del daño (abajo) tras sumar la Fuerza', () => {
    const ctx = { attributes: attrs({ fuerza: 3 }), weapon: weapon({ damage: parseDice('2d6'), minStrength: 1 }), trained: false, targetArmor: 0 };
    // 2d6 = 9, +3 = 12 → 6
    expect(rollWeaponDamage(sequenceRng([4, 5]), ctx).total).toBe(6);
    // 2d6 = 8, +3 = 11 → 5 (redondea abajo)
    expect(rollWeaponDamage(sequenceRng([4, 4]), ctx).total).toBe(5);
    // con armadura 2: 5 − 2 = 3
    expect(rollWeaponDamage(sequenceRng([4, 4]), { ...ctx, targetArmor: 2 }).total).toBe(3);
  });

  it('Fuerza mínima no alcanzada: el arma inflige solo 1d6−1', () => {
    const w = weapon({ group: 'hojas-pesadas', damage: parseDice('3d6'), minStrength: 3 });
    const d = rollWeaponDamage(sequenceRng([5]), { attributes: attrs({ fuerza: 1 }), weapon: w, trained: true, targetArmor: 0 });
    expect(d.underStrength).toBe(true);
    expect(d.expr).toEqual({ count: 1, sides: 6, bonus: -1 });
    expect(d.weaponRoll).toBe(4);
    expect(d.total).toBe(4 + 1); // 1d6−1 + Fuerza 1
  });

  it('daño adicional (Golpe poderoso, Puñalada) se suma antes de la armadura', () => {
    const ctx = { attributes: attrs({ fuerza: 1 }), weapon: weapon({ damage: parseDice('1d6'), minStrength: null }), trained: true, targetArmor: 3, extraDamage: 4 };
    expect(rollWeaponDamage(sequenceRng([2]), ctx).total).toBe(2 + 1 + 4 - 3);
  });

  it('alcance: corto, largo (−2) y fuera; sin entrenamiento el alcance se reduce a la mitad', () => {
    const arcoCorto = { short: 16, long: 32 };
    expect(rangeBand(arcoCorto, 16, true)).toBe('corto');
    expect(rangeBand(arcoCorto, 17, true)).toBe('largo');
    expect(rangeBand(arcoCorto, 32, true)).toBe('largo');
    expect(rangeBand(arcoCorto, 33, true)).toBe('fuera');
    expect(effectiveRange(arcoCorto, false)).toEqual({ short: 8, long: 16 });
    expect(rangeBand(arcoCorto, 9, false)).toBe('largo');
    expect(rangeModifier('largo')).toBe(-2);
    expect(rangeModifier('corto')).toBe(0);
  });

  it('valores literales de criaturas no se recalculan', () => {
    // Cazador avvarita: hacha de batalla 2d6+2 contra Armadura 3
    const d = rollLiteralDamage(sequenceRng([3, 4]), { damage: '2d6+2' }, 3);
    expect(d).toMatchObject({ rolled: 9, armor: 3, total: 6 });
    // Sombra: daño penetrante
    expect(rollLiteralDamage(sequenceRng([3]), { damage: '1d6+4', penetrating: true }, 5).total).toBe(7);
  });
});

describe('magia', () => {
  it('coste con armadura: se suma el impedimento mágico (ejemplo del manual: Virote 2 + malla ligera 3 = 5)', () => {
    expect(spellManaCost({ baseCost: 2 })).toBe(2);
    expect(spellManaCost({ baseCost: 2, armor: 'malla-ligera' })).toBe(5);
    expect(spellManaCost({ baseCost: 3, armor: 'cuero-ligera' })).toBe(4);
    expect(spellManaCost({ baseCost: 3, armor: 'coraza-pesada' })).toBe(9);
  });

  it('talento de escuela (Experto) −1 con mínimo 1; Lanzamiento hábil −1 hasta 0', () => {
    expect(spellManaCost({ baseCost: 3, schoolExpert: true })).toBe(2);
    expect(spellManaCost({ baseCost: 1, schoolExpert: true })).toBe(1);
    expect(spellManaCost({ baseCost: 1, skilledCast: true })).toBe(0);
    expect(spellManaCost({ baseCost: 2, schoolExpert: true, skilledCast: true })).toBe(0);
    expect(spellManaCost({ baseCost: 2, schoolExpert: true, skilledCast: true, armor: 'malla-ligera' })).toBe(3);
  });

  it('tirada de hechizo = 3d6 + Magia + concentración contra el NO; dobles con éxito generan PP', () => {
    const r = castSpell(sequenceRng([2, 4, 2]), { magia: 3, schoolFocus: true }, 12);
    expect(r.total).toBe(8 + 3 + 2);
    expect(r.success).toBe(true);
    expect(r.stuntPoints).toBe(2);
    const fail = castSpell(sequenceRng([1, 1, 1]), { magia: 0, schoolFocus: false }, 10);
    expect(fail.success).toBe(false);
    expect(fail.stuntPoints).toBe(0);
  });
});

describe('proezas', () => {
  const catalog = new Map<string, StuntDefinition>([
    ['golpe-poderoso', { id: 'golpe-poderoso', cost: 2, oncePerRound: true }],
    ['atravesar-armadura', { id: 'atravesar-armadura', cost: 2, oncePerRound: true }],
    ['hostigar', { id: 'hostigar', cost: 1, variable: true, oncePerRound: false }],
    ['lanzamiento-energico', { id: 'lanzamiento-energico', cost: 1, maxCost: 3, variable: true, oncePerRound: true }],
  ]);

  it('costes reducidos por clase, talento u objeto', () => {
    const golpe = catalog.get('golpe-poderoso')!;
    const atravesar = catalog.get('atravesar-armadura')!;
    expect(effectiveStuntCost(golpe, [])).toBe(2);
    expect(effectiveStuntCost(golpe, [{ stuntId: 'golpe-poderoso', replaceCost: 1, source: 'Combate con armas a dos manos (Experto)' }])).toBe(1);
    expect(effectiveStuntCost(atravesar, [{ stuntId: 'atravesar-armadura', replaceCost: 1, source: 'Pícaro nivel 2' }])).toBe(1);
    expect(effectiveStuntCost(atravesar, [{ stuntId: 'golpe-poderoso', replaceCost: 1, source: 'otra' }])).toBe(2);
    expect(effectiveStuntCost(atravesar, [{ stuntId: 'atravesar-armadura', delta: -1, source: 'Eslabón de la Ira' }])).toBe(1);
  });

  it('cada proeza una vez por asalto, salvo Hostigar', () => {
    const twice = validateStuntSpend(6, [{ stuntId: 'golpe-poderoso' }, { stuntId: 'golpe-poderoso' }], catalog);
    expect(twice.ok).toBe(false);
    const hostigar = validateStuntSpend(5, [{ stuntId: 'hostigar', spend: 1 }, { stuntId: 'hostigar', spend: 1 }, { stuntId: 'golpe-poderoso' }], catalog);
    expect(hostigar).toMatchObject({ ok: true, spent: 4, remaining: 1 });
  });

  it('no se gasta más de lo generado ni se sale del rango de las proezas variables', () => {
    expect(validateStuntSpend(3, [{ stuntId: 'golpe-poderoso' }, { stuntId: 'atravesar-armadura' }], catalog).ok).toBe(false);
    expect(validateStuntSpend(4, [{ stuntId: 'lanzamiento-energico', spend: 4 }], catalog).ok).toBe(false);
    expect(validateStuntSpend(3, [{ stuntId: 'lanzamiento-energico', spend: 3 }], catalog).ok).toBe(true);
    expect(validateStuntSpend(3, [{ stuntId: 'inventada' }], catalog).ok).toBe(false);
  });

  it('una proeza ya usada este asalto no puede repetirse', () => {
    const r = validateStuntSpend(4, [{ stuntId: 'golpe-poderoso' }], catalog, [], new Set(['golpe-poderoso']));
    expect(r.ok).toBe(false);
  });
});
