export type Team = 'INSPECTORS' | 'REBELS';

export type WeaponCategory = 'MELEE' | 'PISTOL' | 'HEAVY_PISTOL' | 'RIFLE' | 'SNIPER' | 'SHOTGUN' | 'GRENADE';

export interface WeaponDef {
  id: string;
  name: string;
  portugueseName: string;
  category: WeaponCategory;
  price: number;
  damage: number;
  headshotMultiplier: number;
  fireRate: number; // shots per second
  magazineSize: number;
  reserveAmmo: number;
  reloadTime: number; // in seconds
  spread: number; // base bullet spread in radians
  recoilX: number; // horizontal camera kick
  recoilY: number; // vertical camera kick
  range: number; // max effective range in meters
  killReward: number;
  description: string;
  color: string;
  isAutomatic?: boolean;
}

export type RoundPhase = 'WAITING' | 'WARMUP' | 'BUY_PHASE' | 'ROUND_ACTIVE' | 'ROUND_END' | 'MATCH_OVER';

export interface BombState {
  carrierId?: string;
  isPlanted: boolean;
  site?: 'A' | 'B';
  position?: [number, number, number];
  plantTimer: number; // 45s countdown after plant
  plantedAt?: number;
  planterId?: string;
  defuseProgress: number; // 0 to 1
  defuserId?: string;
  isExploded: boolean;
  isDefused: boolean;
}

export interface PlayerInput {
  seq: number;
  forward: number; // -1 to 1
  right: number; // -1 to 1
  jump: boolean;
  crouch: boolean;
  walk: boolean;
  interact?: boolean; // E key: Plant/Defuse
  yaw: number;
  pitch: number;
  shooting: boolean;
  activeWeaponId: string;
}

export interface PlayerState {
  id: string;
  name: string;
  team: Team;
  isBot: boolean;
  isAlive: boolean;
  health: number;
  maxHealth: number;
  armor: number;
  money: number;
  position: [number, number, number];
  velocity: [number, number, number];
  yaw: number;
  pitch: number;
  activeWeaponId: string;
  ammoInClip: number;
  reserveAmmo: number;
  inventory: string[]; // list of weapon IDs
  kills: number;
  deaths: number;
  ping: number;
  lastShootTime: number;
  isReloading: boolean;
  reloadFinishTime: number;
  hasBomb?: boolean;
}

export interface MapObjectDef {
  id: string;
  type: 'wall' | 'floor' | 'ceiling' | 'box' | 'desk' | 'locker' | 'bookshelf' | 'stairs' | 'door';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color?: string;
  texture?: 'brick' | 'tile' | 'wood' | 'metal' | 'linoleum' | 'chalkboard';
  collision: boolean;
}

export interface SpawnPointDef {
  id: string;
  team: Team;
  position: [number, number, number];
  yaw: number;
  enabled: boolean;
}

export interface ObjectiveZoneDef {
  id: string;
  name: string;
  type: 'BOMBSITE_A' | 'BOMBSITE_B' | 'BUY_ZONE_INSPECTORS' | 'BUY_ZONE_REBELS';
  position: [number, number, number];
  scale: [number, number, number];
}

export interface SchoolMapData {
  formatVersion: string;
  name: string;
  author: string;
  description: string;
  dimensions: {
    width: number;
    length: number;
    height: number;
  };
  objects: MapObjectDef[];
  spawns: SpawnPointDef[];
  objectives: ObjectiveZoneDef[];
}

export interface KillfeedEntry {
  id: string;
  killerId: string;
  killerName: string;
  killerTeam: Team;
  victimId: string;
  victimName: string;
  victimTeam: Team;
  weaponId: string;
  isHeadshot: boolean;
  timestamp: number;
}

export interface ShootEvent {
  shooterId: string;
  weaponId: string;
  origin: [number, number, number];
  direction: [number, number, number];
  hitPoint?: [number, number, number];
  hitPlayerId?: string;
  isHeadshot?: boolean;
}

export interface ServerGameState {
  phase: RoundPhase;
  roundNumber: number;
  maxRounds: number;
  timer: number;
  inspectorsScore: number;
  rebelsScore: number;
  players: Record<string, PlayerState>;
  mapName: string;
  bomb: BombState;
  winnerTeam?: Team | 'DRAW';
  roundEndReason?: string;
}

export interface ClientToServerMessages {
  'join': { name: string; team: Team };
  'change_team': { team: Team };
  'player_input': PlayerInput;
  'shoot': { origin: [number, number, number]; direction: [number, number, number]; weaponId: string };
  'reload': { weaponId: string };
  'switch_weapon': { weaponId: string };
  'buy_item': { weaponId: string };
  'add_bot': { team: Team };
  'kick_bots': Record<string, never>;
  'admin_load_map': { mapData: SchoolMapData };
  'admin_restart_match': Record<string, never>;
}

export interface ServerToClientMessages {
  'init_welcome': {
    playerId: string;
    serverState: ServerGameState;
    mapData: SchoolMapData;
  };
  'state_snapshot': {
    serverState: ServerGameState;
  };
  'shoot_event': ShootEvent;
  'hit_feedback': {
    damage: number;
    isHeadshot: boolean;
    victimId: string;
    victimHealthRemaining: number;
  };
  'kill_event': KillfeedEntry;
  'bomb_beep': {
    timerRemaining: number;
  };
  'bomb_planted': {
    site: 'A' | 'B';
    position: [number, number, number];
  };
  'bomb_defused': {
    defuserId: string;
  };
  'bomb_exploded': {
    position: [number, number, number];
  };
  'map_updated': {
    mapData: SchoolMapData;
  };
  'server_message': {
    text: string;
    type: 'info' | 'warning' | 'round';
  };
}
