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
    ['ui no conoce features', 'src/ui/X.tsx', "import { exampleManifest } from '@/features/example';\nexport const x = exampleManifest;"],
    ['rules no importa core', 'src/rules/x.ts', "import { hasPermission } from '@/core/permissions';\nexport const x = hasPermission;"],
    ['rules no importa React', 'src/rules/x.ts', "import { useState } from 'react';\nexport const x = useState;"],
    ['feature no usa Dexie', 'src/features/example/x.ts', "import Dexie from 'dexie';\nexport const x = Dexie;"],
    ['feature no entra en otra feature', 'src/features/example/x.ts', "import { A } from '@/features/otra/interno';\nexport const x = A;"],
    ['feature no usa la db', 'src/features/example/x.ts', "import { db } from '@/data/db';\nexport const x = db;"],
    ['core no importa features', 'src/core/x.ts', "import { exampleManifest } from '@/features/example';\nexport const x = exampleManifest;"],
    ['ruta relativa también se rechaza', 'src/ui/X.tsx', "import { a } from '../features/example/index';\nexport const x = a;"],
  ];

  it.each(cases)('rechaza: %s', async (_name, file, code) => {
    expect((await violations(file, code)).length).toBeGreaterThan(0);
  });

  it('permite lo legítimo', async () => {
    expect(await violations('src/features/example/x.ts', "import type { FeatureManifest } from '@/core/modules';\nexport type X = FeatureManifest;")).toHaveLength(0);
    expect(await violations('src/features/example/x.ts', "import { Card } from '@/ui/Card';\nexport const x = Card;")).toHaveLength(0);
    expect(await violations('src/data/x.ts', "import Dexie from 'dexie';\nexport const x = Dexie;")).toHaveLength(0);
    expect(await violations('src/app/x.ts', "import { exampleManifest } from '@/features/example';\nexport const x = exampleManifest;")).toHaveLength(0);
  });
});
