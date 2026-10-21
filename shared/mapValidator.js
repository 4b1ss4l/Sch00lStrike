export function validateSchoolMap(map) {
  const errors = [];
  const warnings = [];

  if (!map || typeof map !== 'object') {
    return { valid: false, errors: ['O mapa fornecido não é um objeto JSON válido.'], warnings: [] };
  }

  if (!map.formatVersion || typeof map.formatVersion !== 'string') {
    errors.push('Campo formatVersion é obrigatório.');
  }

  if (!map.name || typeof map.name !== 'string' || map.name.trim().length === 0) {
    errors.push('Nome do mapa é obrigatório.');
  }

  if (!map.dimensions || typeof map.dimensions !== 'object') {
    errors.push('Dimensões do mapa ausentes ou inválidas.');
  } else {
    const { width, length, height } = map.dimensions;
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

  if (!Array.isArray(map.spawns) || map.spawns.length === 0) {
    errors.push('O mapa deve conter uma lista de pontos de nascimento (spawns).');
  } else {
    const inspectorsSpawns = map.spawns.filter(s => s.team === 'INSPECTORS' && s.enabled !== false);
    const rebelsSpawns = map.spawns.filter(s => s.team === 'REBELS' && s.enabled !== false);

    if (inspectorsSpawns.length < 2) {
      errors.push(`Spawns insuficientes para Inspetores: requer ao menos 2, encontrados ${inspectorsSpawns.length}.`);
    }
    if (rebelsSpawns.length < 2) {
      errors.push(`Spawns insuficientes para Rebeldes: requer ao menos 2, encontrados ${rebelsSpawns.length}.`);
    }

    const spawnIds = new Set();
    for (let i = 0; i < map.spawns.length; i++) {
      const s = map.spawns[i];
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

      for (let j = i + 1; j < map.spawns.length; j++) {
        const s2 = map.spawns[j];
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

  if (!Array.isArray(map.objectives)) {
    warnings.push('Nenhum objetivo definido no mapa.');
  }

  if (!Array.isArray(map.objects) || map.objects.length === 0) {
    errors.push('O mapa deve possuir pelo menos 1 objeto de geometria/cenário.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function serializeSchoolMap(map) {
  return JSON.stringify(map, null, 2);
}

export function parseSchoolMap(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr);
    const validation = validateSchoolMap(parsed);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(' | ') };
    }
    return { success: true, data: parsed };
  } catch (err) {
    return { success: false, error: `Erro de sintaxe JSON: ${err.message}` };
  }
}
