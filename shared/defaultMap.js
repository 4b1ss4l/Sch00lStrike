import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mapJsonPath = path.resolve(__dirname, '../maps/school_dust/map.json');
let defaultMapData;

try {
  const content = fs.readFileSync(mapJsonPath, 'utf-8');
  defaultMapData = JSON.parse(content);
} catch (e) {
  // Fallback
  defaultMapData = {
    formatVersion: '1.0.0',
    name: 'SCHOOL_DUST',
    author: 'School Strike Architects',
    description: 'Mapa tático inspirado na navegação clássica com temas escolares.',
    dimensions: { width: 90, length: 90, height: 12 },
    spawns: [
      { id: 'spawn_ct_1', team: 'INSPECTORS', position: [0, 0.5, 30], yaw: 3.14, enabled: true },
      { id: 'spawn_ct_2', team: 'INSPECTORS', position: [3, 0.5, 30], yaw: 3.14, enabled: true },
      { id: 'spawn_tr_1', team: 'REBELS', position: [0, 0.5, -30], yaw: 0, enabled: true },
      { id: 'spawn_tr_2', team: 'REBELS', position: [3, 0.5, -30], yaw: 0, enabled: true }
    ],
    objectives: [
      { id: 'obj_a', name: 'Bombsite A - Biblioteca', type: 'BOMBSITE_A', position: [24, 0.5, 18], scale: [10, 2, 10] },
      { id: 'obj_b', name: 'Bombsite B - Ginásio Poliesportivo', type: 'BOMBSITE_B', position: [-24, 0.5, 18], scale: [12, 2, 12] }
    ],
    objects: [
      { id: 'floor_central', type: 'floor', position: [0, 0, 0], rotation: [0, 0, 0], scale: [24, 0.2, 44], color: '#cbd5e1', texture: 'tile', collision: true }
    ]
  };
}

export const DEFAULT_SCHOOL_DUST_MAP = defaultMapData;
export default defaultMapData;
