import { SchoolMapData } from '../types/game';

export const DEFAULT_SCHOOL_DUST_MAP: SchoolMapData = {
  formatVersion: '1.0.0',
  name: 'SCHOOL_DUST',
  author: 'School Strike Architects',
  description: 'Mapa tático inspirado na navegação clássica com temas escolares: Pátio, Biblioteca (A), Ginásio (B), Corredor de Armários e Refeitório.',
  dimensions: {
    width: 90,
    length: 90,
    height: 12,
  },
  spawns: [
    // Inspectors Spawns (Secretaria / CT Spawn - North side)
    { id: 'spawn_ct_1', team: 'INSPECTORS', position: [0, 0.5, 30], yaw: Math.PI, enabled: true },
    { id: 'spawn_ct_2', team: 'INSPECTORS', position: [3, 0.5, 30], yaw: Math.PI, enabled: true },
    { id: 'spawn_ct_3', team: 'INSPECTORS', position: [-3, 0.5, 30], yaw: Math.PI, enabled: true },
    { id: 'spawn_ct_4', team: 'INSPECTORS', position: [0, 0.5, 33], yaw: Math.PI, enabled: true },

    // Rebels Spawns (Bicicletário / T Spawn - South side)
    { id: 'spawn_tr_1', team: 'REBELS', position: [0, 0.5, -30], yaw: 0, enabled: true },
    { id: 'spawn_tr_2', team: 'REBELS', position: [3, 0.5, -30], yaw: 0, enabled: true },
    { id: 'spawn_tr_3', team: 'REBELS', position: [-3, 0.5, -30], yaw: 0, enabled: true },
    { id: 'spawn_tr_4', team: 'REBELS', position: [0, 0.5, -33], yaw: 0, enabled: true },
  ],
  objectives: [
    {
      id: 'obj_a',
      name: 'Bombsite A - Biblioteca',
      type: 'BOMBSITE_A',
      position: [24, 0.5, 18],
      scale: [10, 2, 10],
    },
    {
      id: 'obj_b',
      name: 'Bombsite B - Ginásio Poliesportivo',
      type: 'BOMBSITE_B',
      position: [-24, 0.5, 18],
      scale: [12, 2, 12],
    },
    {
      id: 'buy_ct',
      name: 'Zona de Compra Inspetores',
      type: 'BUY_ZONE_INSPECTORS',
      position: [0, 0.5, 30],
      scale: [18, 4, 18],
    },
    {
      id: 'buy_tr',
      name: 'Zona de Compra Rebeldes',
      type: 'BUY_ZONE_REBELS',
      position: [0, 0.5, -30],
      scale: [18, 4, 18],
    },
  ],
  objects: [
    // --- MAIN GROUNDS & FLOORS ---
    // Central Courtyard ground (tile/linoleum)
    {
      id: 'floor_central',
      type: 'floor',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [24, 0.2, 44],
      color: '#cbd5e1',
      texture: 'tile',
      collision: true,
    },
    // Library floor (A site - wood)
    {
      id: 'floor_library',
      type: 'floor',
      position: [24, 0, 18],
      rotation: [0, 0, 0],
      scale: [22, 0.2, 26],
      color: '#d97706',
      texture: 'wood',
      collision: true,
    },
    // Long corridor floor (A Long)
    {
      id: 'floor_long_a',
      type: 'floor',
      position: [24, 0, -10],
      rotation: [0, 0, 0],
      scale: [12, 0.2, 32],
      color: '#94a3b8',
      texture: 'linoleum',
      collision: true,
    },
    // Gymnasium floor (B site - court parquet)
    {
      id: 'floor_gym',
      type: 'floor',
      position: [-24, 0, 18],
      rotation: [0, 0, 0],
      scale: [24, 0.2, 28],
      color: '#b45309',
      texture: 'wood',
      collision: true,
    },
    // Cafeteria / B Tunnels floor
    {
      id: 'floor_cafeteria',
      type: 'floor',
      position: [-24, 0, -10],
      rotation: [0, 0, 0],
      scale: [14, 0.2, 32],
      color: '#e2e8f0',
      texture: 'tile',
      collision: true,
    },
    // CT Spawn floor
    {
      id: 'floor_ct_spawn',
      type: 'floor',
      position: [0, 0, 31],
      rotation: [0, 0, 0],
      scale: [30, 0.2, 18],
      color: '#3b82f6',
      texture: 'tile',
      collision: true,
    },
    // T Spawn floor
    {
      id: 'floor_t_spawn',
      type: 'floor',
      position: [0, 0, -31],
      rotation: [0, 0, 0],
      scale: [30, 0.2, 18],
      color: '#ef4444',
      texture: 'tile',
      collision: true,
    },

    // --- PERIMETER & BOUNDARY WALLS ---
    // North outer wall (CT back)
    {
      id: 'wall_north_outer',
      type: 'wall',
      position: [0, 2.5, 40],
      rotation: [0, 0, 0],
      scale: [74, 5, 1],
      color: '#64748b',
      texture: 'brick',
      collision: true,
    },
    // South outer wall (T back)
    {
      id: 'wall_south_outer',
      type: 'wall',
      position: [0, 2.5, -40],
      rotation: [0, 0, 0],
      scale: [74, 5, 1],
      color: '#64748b',
      texture: 'brick',
      collision: true,
    },
    // East outer wall (Library & Long A boundary)
    {
      id: 'wall_east_outer',
      type: 'wall',
      position: [36, 2.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 5, 80],
      color: '#64748b',
      texture: 'brick',
      collision: true,
    },
    // West outer wall (Gym & Cafeteria boundary)
    {
      id: 'wall_west_outer',
      type: 'wall',
      position: [-36, 2.5, 0],
      rotation: [0, 0, 0],
      scale: [1, 5, 80],
      color: '#64748b',
      texture: 'brick',
      collision: true,
    },

    // --- INTERIOR DIVISION WALLS (MID TO A / B) ---
    // East Mid Wall (Separating Mid Courtyard from Long A)
    {
      id: 'wall_mid_east_south',
      type: 'wall',
      position: [12, 2.5, -16],
      rotation: [0, 0, 0],
      scale: [1, 5, 20],
      color: '#475569',
      texture: 'brick',
      collision: true,
    },
    {
      id: 'wall_mid_east_north',
      type: 'wall',
      position: [12, 2.5, 14],
      rotation: [0, 0, 0],
      scale: [1, 5, 18],
      color: '#475569',
      texture: 'brick',
      collision: true,
    },
    // West Mid Wall (Separating Mid Courtyard from Cafeteria / Gym)
    {
      id: 'wall_mid_west_south',
      type: 'wall',
      position: [-12, 2.5, -16],
      rotation: [0, 0, 0],
      scale: [1, 5, 20],
      color: '#475569',
      texture: 'brick',
      collision: true,
    },
    {
      id: 'wall_mid_west_north',
      type: 'wall',
      position: [-12, 2.5, 14],
      rotation: [0, 0, 0],
      scale: [1, 5, 18],
      color: '#475569',
      texture: 'brick',
      collision: true,
    },

    // Mid double doors partition / arch
    {
      id: 'wall_mid_arch_left',
      type: 'wall',
      position: [-3.5, 2.5, 6],
      rotation: [0, 0, 0],
      scale: [5, 5, 1],
      color: '#334155',
      texture: 'metal',
      collision: true,
    },
    {
      id: 'wall_mid_arch_right',
      type: 'wall',
      position: [3.5, 2.5, 6],
      rotation: [0, 0, 0],
      scale: [5, 5, 1],
      color: '#334155',
      texture: 'metal',
      collision: true,
    },

    // --- COVERS & SCHOOL OBSTACLES ---
    // Mid Planter Box (Courtyard Center Cover)
    {
      id: 'planter_mid',
      type: 'box',
      position: [0, 0.75, -6],
      rotation: [0, 0, 0],
      scale: [3, 1.5, 6],
      color: '#15803d',
      texture: 'wood',
      collision: true,
    },
    // Mid Bench
    {
      id: 'bench_mid',
      type: 'desk',
      position: [4, 0.5, -6],
      rotation: [0, 0, 0],
      scale: [1.2, 0.9, 3],
      color: '#854d0e',
      texture: 'wood',
      collision: true,
    },

    // --- BOMBSITE A: BIBLIOTECA (LIBRARY) ---
    // Big Bookshelf 1
    {
      id: 'bookshelf_a_1',
      type: 'bookshelf',
      position: [20, 1.75, 18],
      rotation: [0, 0, 0],
      scale: [1.2, 3.5, 8],
      color: '#78350f',
      texture: 'wood',
      collision: true,
    },
    // Big Bookshelf 2
    {
      id: 'bookshelf_a_2',
      type: 'bookshelf',
      position: [28, 1.75, 18],
      rotation: [0, 0, 0],
      scale: [1.2, 3.5, 8],
      color: '#78350f',
      texture: 'wood',
      collision: true,
    },
    // Study Table Stack at site A
    {
      id: 'study_desks_a',
      type: 'desk',
      position: [24, 0.6, 24],
      rotation: [0, 0, 0],
      scale: [4, 1.2, 2.5],
      color: '#a16207',
      texture: 'wood',
      collision: true,
    },
    // Chalkboard at Bombsite A
    {
      id: 'chalkboard_a',
      type: 'wall',
      position: [24, 2.5, 30],
      rotation: [0, 0, 0],
      scale: [8, 3, 0.3],
      color: '#064e3b',
      texture: 'chalkboard',
      collision: true,
    },

    // --- BOMBSITE B: GINÁSIO (GYM) ---
    // Gym Bleachers / Benches
    {
      id: 'bleachers_b_1',
      type: 'box',
      position: [-32, 0.6, 18],
      rotation: [0, 0, 0],
      scale: [2.5, 1.2, 14],
      color: '#0284c7',
      texture: 'metal',
      collision: true,
    },
    // Basketball equipment storage crate
    {
      id: 'gym_crate_b',
      type: 'box',
      position: [-22, 1.0, 24],
      rotation: [0, 0, 0],
      scale: [3, 2.0, 3],
      color: '#ea580c',
      texture: 'metal',
      collision: true,
    },
    // Gym Mats stack (crouch cover)
    {
      id: 'gym_mats_b',
      type: 'box',
      position: [-24, 0.5, 12],
      rotation: [0, 0, 0],
      scale: [3.5, 1.0, 2],
      color: '#dc2626',
      texture: 'linoleum',
      collision: true,
    },

    // --- LOCKER HALL (LONG A) ---
    // Student Lockers Row Left
    {
      id: 'lockers_long_a_1',
      type: 'locker',
      position: [19, 1.3, -8],
      rotation: [0, 0, 0],
      scale: [0.8, 2.6, 14],
      color: '#2563eb',
      texture: 'metal',
      collision: true,
    },
    // Student Lockers Row Right
    {
      id: 'lockers_long_a_2',
      type: 'locker',
      position: [29, 1.3, -8],
      rotation: [0, 0, 0],
      scale: [0.8, 2.6, 14],
      color: '#059669',
      texture: 'metal',
      collision: true,
    },
    // Corner locker cover at A Long pit
    {
      id: 'corner_cover_a',
      type: 'box',
      position: [31, 0.75, -22],
      rotation: [0, 0, 0],
      scale: [2, 1.5, 2],
      color: '#475569',
      texture: 'metal',
      collision: true,
    },

    // --- CAFETERIA / B TUNNELS ---
    // Cafeteria lunch table 1
    {
      id: 'cafeteria_table_1',
      type: 'desk',
      position: [-22, 0.55, -8],
      rotation: [0, 0, 0],
      scale: [2, 1.1, 5],
      color: '#f8fafc',
      texture: 'linoleum',
      collision: true,
    },
    // Cafeteria lunch table 2
    {
      id: 'cafeteria_table_2',
      type: 'desk',
      position: [-28, 0.55, -8],
      rotation: [0, 0, 0],
      scale: [2, 1.1, 5],
      color: '#f8fafc',
      texture: 'linoleum',
      collision: true,
    },
    // Snack Vending Machine cover
    {
      id: 'vending_machine',
      type: 'box',
      position: [-33, 1.4, -18],
      rotation: [0, 0, 0],
      scale: [1.2, 2.8, 2.2],
      color: '#ef4444',
      texture: 'metal',
      collision: true,
    },

    // --- T SPAWN & CT SPAWN COVERS ---
    // Bike Rack at T Spawn
    {
      id: 'bike_rack_t',
      type: 'box',
      position: [7, 0.6, -28],
      rotation: [0, 0, 0],
      scale: [1, 1.2, 6],
      color: '#64748b',
      texture: 'metal',
      collision: true,
    },
    // Principal's desk at CT Spawn
    {
      id: 'principals_desk_ct',
      type: 'desk',
      position: [-6, 0.6, 28],
      rotation: [0, 0, 0],
      scale: [3, 1.2, 2],
      color: '#451a03',
      texture: 'wood',
      collision: true,
    },
  ],
};
