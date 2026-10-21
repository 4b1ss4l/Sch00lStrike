import { SchoolMapData, SpawnPointDef, ObjectiveZoneDef, MapObjectDef } from '../types/game';

export interface MapValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSchoolMap(map: unknown): MapValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!map || typeof map !== 'object') {
    return { valid: false, errors: ['O mapa fornecido não é um objeto JSON válido.'], warnings: [] };
  }

  const m = map as Partial<SchoolMapData>;

  // Format version
  if (!m.formatVersion || typeof m.formatVersion !== 'string') {
    errors.push('Campo formatVersion é obrigatório.');
  }

  // Name
  if (!m.name || typeof m.name !== 'string' || m.name.trim().length === 0) {
    errors.push('Nome do mapa é obrigatório.');
  }

  // Dimensions
  if (!m.dimensions || typeof m.dimensions !== 'object') {
    errors.push('Dimensões do mapa ausentes ou inválidas.');
  } else {
    const { width, length, height } = m.dimensions;
    if (typeof width !== 'number' || width <= 10 || isNaN(width)) {
      errors.push('Dimensão width deve ser um número maior que 10.');
    }
    if (typeof length !== 'number' || length <= 10 || isNaN(length)) {
      errors.push('Dimensão length deve ser um número maior que 10.');
    }
    if (typeof height !== 'number' || height <= 3 || isNaN(height)) {
      errors.push('Dimensão height deve ser um número maior que 3.');
    }
  }

  // Spawns validation
  if (!Array.isArray(m.spawns) || m.spawns.length === 0) {
    errors.push('O mapa deve conter uma lista de pontos de nascimento (spawns).');
  } else {
    const inspectorsSpawns = m.spawns.filter(s => s.team === 'INSPECTORS' && s.enabled !== false);
    const rebelsSpawns = m.spawns.filter(s => s.team === 'REBELS' && s.enabled !== false);

    if (inspectorsSpawns.length < 2) {
      errors.push(`Spawns insuficientes para Inspetores: requer ao menos 2, encontrados ${inspectorsSpawns.length}.`);
    }
    if (rebelsSpawns.length < 2) {
      errors.push(`Spawns insuficientes para Rebeldes: requer ao menos 2, encontrados ${rebelsSpawns.length}.`);
    }

    // Check spawn coordinate validity and overlaps
    const spawnIds = new Set<string>();
    for (let i = 0; i < m.spawns.length; i++) {
      const s = m.spawns[i];
      if (!s.id || typeof s.id !== 'string') {
        errors.push(`Spawn #${i} com identificador (id) inválido.`);
      } else {
        if (spawnIds.has(s.id)) {
          errors.push(`Identificador de spawn duplicado: '${s.id}'.`);
        }
        spawnIds.add(s.id);
      }

      if (!Array.isArray(s.position) || s.position.length !== 3 || s.position.some(isNaN)) {
        errors.push(`Spawn '${s.id || i}' com coordenadas inválidas.`);
      }

      // Proximity check between active spawns
      for (let j = i + 1; j < m.spawns.length; j++) {
        const s2 = m.spawns[j];
        if (s.enabled !== false && s2.enabled !== false && Array.isArray(s.position) && Array.isArray(s2.position)) {
          const dx = s.position[0] - s2.position[0];
          const dy = s.position[1] - s2.position[1];
          const dz = s.position[2] - s2.position[2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < 1.2) {
            errors.push(`Spawns '${s.id}' e '${s2.id}' estão muito próximos (${dist.toFixed(2)}m < 1.2m).`);
          }
        }
      }
    }
  }

  // Objectives validation
  if (!Array.isArray(m.objectives)) {
    warnings.push('Nenhum objetivo definido no mapa.');
  } else {
    const hasSiteA = m.objectives.some(o => o.type === 'BOMBSITE_A');
    const hasSiteB = m.objectives.some(o => o.type === 'BOMBSITE_B');

    if (!hasSiteA) {
      warnings.push('Aviso: Objetivo BOMBSITE_A não foi encontrado.');
    }
    if (!hasSiteB) {
      warnings.push('Aviso: Objetivo BOMBSITE_B não foi encontrado.');
    }
  }

  // Objects validation
  if (!Array.isArray(m.objects) || m.objects.length === 0) {
    errors.push('O mapa deve possuir pelo menos 1 objeto de geometria/cenário.');
  } else {
    const objectIds = new Set<string>();
    for (let i = 0; i < m.objects.length; i++) {
      const obj = m.objects[i];
      if (!obj.id) {
        errors.push(`Objeto de cena #${i} sem id.`);
      } else {
        if (objectIds.has(obj.id)) {
          errors.push(`Id de objeto de cena duplicado: '${obj.id}'.`);
        }
        objectIds.add(obj.id);
      }

      if (!Array.isArray(obj.position) || obj.position.length !== 3 || obj.position.some(isNaN)) {
        errors.push(`Objeto '${obj.id || i}' possui posições inválidas.`);
      }
      if (!Array.isArray(obj.scale) || obj.scale.length !== 3 || obj.scale.some(v => isNaN(v) || v <= 0)) {
        errors.push(`Objeto '${obj.id || i}' possui escala inválida (deve ser > 0).`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function serializeSchoolMap(map: SchoolMapData): string {
  return JSON.stringify(map, null, 2);
}

export function parseSchoolMap(jsonStr: string): { success: boolean; data?: SchoolMapData; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    const validation = validateSchoolMap(parsed);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(' | ') };
    }
    return { success: true, data: parsed as SchoolMapData };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Erro de sintaxe JSON: ${msg}` };
  }
}
