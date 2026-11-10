// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';

const eslint = new ESLint({ cwd: process.cwd() });

async function violations(filePath: string, code: string) {
  const [res] = await eslint.lintText(code, { filePath });
  return (res?.messages ?? []).filter((m) => m.ruleId === 'no-restricted-imports');
}

describe('lint de límites entre capas', () => {
  const cases: [string, string, string][] = [
    ['ui no conoce features', 'src/ui/X.tsx', "import { rulebookManifest } from '@/features/rulebook';\nexport const x = rulebookManifest;"],
    ['rules no importa core', 'src/rules/x.ts', "import { hasPermission } from '@/core/permissions';\nexport const x = hasPermission;"],
    ['rules no importa React', 'src/rules/x.ts', "import { useState } from 'react';\nexport const x = useState;"],
    ['feature no usa Dexie', 'src/features/rulebook/x.ts', "import Dexie from 'dexie';\nexport const x = Dexie;"],
    ['feature no entra en otra feature', 'src/features/rulebook/x.ts', "import { A } from '@/features/otra/interno';\nexport const x = A;"],
    ['feature no usa la db', 'src/features/rulebook/x.ts', "import { db } from '@/data/db';\nexport const x = db;"],
    ['core no importa features', 'src/core/x.ts', "import { rulebookManifest } from '@/features/rulebook';\nexport const x = rulebookManifest;"],
    ['rules no importa valores de content', 'src/rules/x.ts', "import { WEAPONS } from '@/content/player';\nexport const x = WEAPONS;"],
    ['content no importa core', 'src/content/x.ts', "import { createSearchIndex } from '@/core/search';\nexport const x = createSearchIndex;"],
    ['content no importa features', 'src/content/x.ts', "import { rulebookManifest } from '@/features/rulebook';\nexport const x = rulebookManifest;"],
    ['ruta relativa también se rechaza', 'src/ui/X.tsx', "import { a } from '../features/rulebook/index';\nexport const x = a;"],
  ];

  it.each(cases)('rechaza: %s', async (_name, file, code) => {
    expect((await violations(file, code)).length).toBeGreaterThan(0);
  });

  it('permite lo legítimo', async () => {
    expect(await violations('src/features/rulebook/x.ts', "import type { FeatureManifest } from '@/core/modules';\nexport type X = FeatureManifest;")).toHaveLength(0);
    expect(await violations('src/features/rulebook/x.ts', "import { Card } from '@/ui/Card';\nexport const x = Card;")).toHaveLength(0);
    expect(await violations('src/rules/x.ts', "import type { Weapon } from '@/content';\nexport type X = Weapon;")).toHaveLength(0);
    expect(await violations('src/content/x.ts', "import { ATTRIBUTES } from '@/rules/types';\nexport const x = ATTRIBUTES;")).toHaveLength(0);
    expect(await violations('src/data/x.ts', "import Dexie from 'dexie';\nexport const x = Dexie;")).toHaveLength(0);
    expect(await violations('src/app/x.ts', "import { rulebookManifest } from '@/features/rulebook';\nexport const x = rulebookManifest;")).toHaveLength(0);
  });
});
