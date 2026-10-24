import {
  PlayerState,
  Team,
  ServerGameState,
  RoundPhase,
  SchoolMapData,
  PlayerInput,
  ShootEvent,
  KillfeedEntry,
} from '../types/game';
import { WEAPONS, DEFAULT_INSPECTORS_LOADOUT, DEFAULT_REBELS_LOADOUT } from '../shared/weapons';
import { GAME_CONSTANTS } from '../shared/constants';
import { DEFAULT_SCHOOL_DUST_MAP } from '../shared/defaultMap';
import { validateSchoolMap } from '../shared/mapValidator';

export interface HitResult {
  hit: boolean;
  damage: number;
  isHeadshot: boolean;
  victimId?: string;
  victimDied?: boolean;
}

// Ray-box intersection algorithm for authoritative bullet penetration and bot line-of-sight
export function rayIntersectsAABB(
  rayOrigin: [number, number, number],
  rayDir: [number, number, number],
  boxMin: [number, number, number],
  boxMax: [number, number, number]
): number | null {
  let tmin = -Infinity;
  let tmax = Infinity;

  for (let i = 0; i < 3; i++) {
    const d = rayDir[i];
    const invD = 1.0 / (Math.abs(d) < 1e-7 ? (d >= 0 ? 1e-7 : -1e-7) : d);
    let t0 = (boxMin[i] - rayOrigin[i]) * invD;
    let t1 = (boxMax[i] - rayOrigin[i]) * invD;
    if (invD < 0) {
      const tmp = t0;
      t0 = t1;
      t1 = tmp;
    }
    tmin = Math.max(tmin, t0);
    tmax = Math.min(tmax, t1);
    if (tmax <= tmin) return null;
  }

  return tmin > 0 ? tmin : tmax > 0 ? tmax : null;
}

export class GameRoom {
  public state: ServerGameState;
  public mapData: SchoolMapData;
  private consecutiveLosses: Record<Team, number> = { INSPECTORS: 0, REBELS: 0 };
  private roundTimerSeconds: number = 0;
  private lastTickTime: number = Date.now();
  private onKillfeedCallback?: (entry: KillfeedEntry) => void;
  private onShootCallback?: (event: ShootEvent) => void;
  private onMessageCallback?: (text: string, type: 'info' | 'warning' | 'round') => void;
  private onBombBeepCallback?: (timerRemaining: number) => void;
  private onBombPlantedCallback?: (site: 'A' | 'B', position: [number, number, number]) => void;
  private onBombDefusedCallback?: (defuserId: string) => void;
  private onBombExplodedCallback?: (position: [number, number, number]) => void;

  private lastBombBeepTime: number = 0;
  private plantHoldProgress: number = 0;
  private defuseHoldProgress: number = 0;
  private activePlanterId: string | null = null;
  private activeDefuserId: string | null = null;
  private playerLastInputTimes: Map<string, number> = new Map();
  private lastPlayerInputs: Map<string, PlayerInput> = new Map();

  constructor(initialMap: SchoolMapData = DEFAULT_SCHOOL_DUST_MAP) {
    this.mapData = initialMap;
    this.state = {
      phase: 'WAITING',
      roundNumber: 1,
      maxRounds: GAME_CONSTANTS.MAX_ROUNDS,
      timer: 0,
      inspectorsScore: 0,
      rebelsScore: 0,
      players: {},
      mapName: initialMap.name,
      bomb: {
        isPlanted: false,
        plantTimer: 45,
        defuseProgress: 0,
        isExploded: false,
        isDefused: false,
      },
    };
  }

  public setCallbacks(callbacks: {
    onKillfeed?: (entry: KillfeedEntry) => void;
    onShoot?: (event: ShootEvent) => void;
    onMessage?: (text: string, type: 'info' | 'warning' | 'round') => void;
    onBombBeep?: (timerRemaining: number) => void;
    onBombPlanted?: (site: 'A' | 'B', position: [number, number, number]) => void;
    onBombDefused?: (defuserId: string) => void;
    onBombExploded?: (position: [number, number, number]) => void;
  }) {
    this.onKillfeedCallback = callbacks.onKillfeed;
    this.onShootCallback = callbacks.onShoot;
    this.onMessageCallback = callbacks.onMessage;
    this.onBombBeepCallback = callbacks.onBombBeep;
    this.onBombPlantedCallback = callbacks.onBombPlanted;
    this.onBombDefusedCallback = callbacks.onBombDefused;
    this.onBombExplodedCallback = callbacks.onBombExploded;
  }

  public addPlayer(id: string, name: string, team?: Team): PlayerState {
    const assignedTeam: Team = team || (this.getTeamCount('INSPECTORS') <= this.getTeamCount('REBELS') ? 'INSPECTORS' : 'REBELS');
    const defaultLoadout = assignedTeam === 'INSPECTORS' ? [...DEFAULT_INSPECTORS_LOADOUT] : [...DEFAULT_REBELS_LOADOUT];

    const player: PlayerState = {
      id,
      name: name.slice(0, 20),
      team: assignedTeam,
      isBot: false,
      isAlive: true,
      health: 100,
      maxHealth: 100,
      armor: 0,
      money: GAME_CONSTANTS.STARTING_MONEY,
      position: [0, 1, 0],
      velocity: [0, 0, 0],
      yaw: 0,
      pitch: 0,
      activeWeaponId: defaultLoadout[0],
      ammoInClip: WEAPONS[defaultLoadout[0]].magazineSize,
      reserveAmmo: WEAPONS[defaultLoadout[0]].reserveAmmo,
      inventory: defaultLoadout,
      kills: 0,
      deaths: 0,
      ping: 10,
      lastShootTime: 0,
      isReloading: false,
      reloadFinishTime: 0,
    };

    this.state.players[id] = player;
    this.spawnPlayer(player);

    if (this.state.phase === 'WAITING' && this.getTotalPlayerCount() >= 1) {
      this.startRound();
    }

    return player;
  }

  public addBot(team: Team): PlayerState {
    const botId = `bot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const botNames = [
      'Monitor Bruno', 'Inspetora Silvia', 'Monitor Lucas', 'Inspetora Carla',
      'Rebelde Leo', 'Rebelde Amanda', 'Rebelde Enzo', 'Rebelde Bia',
    ];
    const name = `[BOT] ${botNames[Math.floor(Math.random() * botNames.length)]}`;
    const defaultLoadout = team === 'INSPECTORS' ? [...DEFAULT_INSPECTORS_LOADOUT] : [...DEFAULT_REBELS_LOADOUT];

    const bot: PlayerState = {
      id: botId,
      name,
      team,
      isBot: true,
      isAlive: true,
      health: 100,
      maxHealth: 100,
      armor: 50,
      money: 3000,
      position: [0, 1, 0],
      velocity: [0, 0, 0],
      yaw: 0,
      pitch: 0,
      activeWeaponId: 'paper_rifle_m4',
      ammoInClip: 30,
      reserveAmmo: 90,
      inventory: ['paper_rifle_m4', 'highlighter_pistol', 'ruler_melee'],
      kills: 0,
      deaths: 0,
      ping: 5,
      lastShootTime: 0,
      isReloading: false,
      reloadFinishTime: 0,
    };

    this.state.players[botId] = bot;
    this.spawnPlayer(bot);
    return bot;
  }

  public kickBots(): void {
    for (const [id, player] of Object.entries(this.state.players)) {
      if (player.isBot) {
        delete this.state.players[id];
      }
    }
  }

  public removePlayer(id: string): void {
    delete this.state.players[id];
    if (this.getTotalPlayerCount() === 0) {
      this.state.phase = 'WAITING';
      this.state.roundNumber = 1;
      this.state.inspectorsScore = 0;
      this.state.rebelsScore = 0;
    }
  }

  public setPlayerTeam(id: string, newTeam: Team): void {
    const player = this.state.players[id];
    if (!player || player.team === newTeam) return;

    player.team = newTeam;
    // If during buy or warmup, respawn immediately
    if (this.state.phase === 'BUY_PHASE' || this.state.phase === 'WAITING' || this.state.phase === 'WARMUP') {
      this.spawnPlayer(player);
    } else {
      player.isAlive = false; // counts as elimination for balance if switching mid-round
    }
  }

  public handleInput(id: string, input: PlayerInput): void {
    const player = this.state.players[id];
    if (!player || !player.isAlive) return;

    const now = Date.now();
    const lastInputTime = this.playerLastInputTimes.get(id);
    this.playerLastInputTimes.set(id, now);

    // Sanitize input values
    const safeForward = typeof input.forward === 'number' && Number.isFinite(input.forward)
      ? Math.max(-1, Math.min(1, input.forward))
      : 0;
    const safeRight = typeof input.right === 'number' && Number.isFinite(input.right)
      ? Math.max(-1, Math.min(1, input.right))
      : 0;
    const safeYaw = typeof input.yaw === 'number' && Number.isFinite(input.yaw) ? input.yaw : player.yaw;
    const safePitch = typeof input.pitch === 'number' && Number.isFinite(input.pitch) ? input.pitch : player.pitch;

    const sanitizedInput: PlayerInput = {
      ...input,
      forward: safeForward,
      right: safeRight,
      yaw: safeYaw,
      pitch: safePitch,
    };

    player.yaw = safeYaw;
    player.pitch = safePitch;
    this.lastPlayerInputs.set(id, sanitizedInput);

    // If rapid inputs are sent, simulate only the elapsed real time to prevent packet flooding speedups
    const rawDt = lastInputTime ? (now - lastInputTime) / 1000 : (1 / GAME_CONSTANTS.SERVER_TICK_RATE);
    const dt = Math.max(0.005, Math.min(0.05, rawDt));
    this.simulatePlayerMovement(player, sanitizedInput, dt);
  }

  public simulatePlayerMovement(player: PlayerState, input: PlayerInput, dt: number): void {
    if (!player.isAlive) return;

    // Movement calculation
    const speed = GAME_CONSTANTS.MOVE_SPEED *
      (input.crouch ? GAME_CONSTANTS.CROUCH_SPEED_FACTOR : input.walk ? GAME_CONSTANTS.WALK_SPEED_FACTOR : 1.0);

    const cosY = Math.cos(player.yaw);
    const sinY = Math.sin(player.yaw);

    // Forward/back and strafe with diagonal vector normalization
    let moveX = input.forward * -sinY + input.right * cosY;
    let moveZ = input.forward * -cosY + input.right * -sinY;
    const moveLen = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (moveLen > 1.0) {
      moveX /= moveLen;
      moveZ /= moveLen;
    }

    const dx = moveX * speed * dt;
    const dz = moveZ * speed * dt;

    const newX = player.position[0] + dx;
    const newZ = player.position[2] + dz;

    // Boundary clamping
    const halfW = (this.mapData.dimensions.width / 2) - 1.5;
    const halfL = (this.mapData.dimensions.length / 2) - 1.5;

    let finalX = Math.max(-halfW, Math.min(halfW, newX));
    let finalZ = Math.max(-halfL, Math.min(halfL, newZ));

    const radius = GAME_CONSTANTS.PLAYER_RADIUS;
    for (const obj of this.mapData.objects) {
      if (!obj.collision) continue;
      // Walkable surfaces (floors and ceilings) must not block horizontal movement!
      if (obj.type === 'floor' || obj.type === 'ceiling') continue;

      // Obstacle AABB
      const minX = obj.position[0] - obj.scale[0] / 2 - radius;
      const maxX = obj.position[0] + obj.scale[0] / 2 + radius;
      const minZ = obj.position[2] - obj.scale[2] / 2 - radius;
      const maxZ = obj.position[2] + obj.scale[2] / 2 + radius;

      // Check if player Y intersects obstacle height (must be higher than step height 0.35m)
      const pY = player.position[1];
      const objMinY = obj.position[1] - obj.scale[1] / 2;
      const objMaxY = obj.position[1] + obj.scale[1] / 2;

      if (objMaxY > pY + 0.35 && objMinY < pY + GAME_CONSTANTS.PLAYER_HEIGHT) {
        if (finalX > minX && finalX < maxX && finalZ > minZ && finalZ < maxZ) {
          const prevX = player.position[0];
          const prevZ = player.position[2];

          // Allow sliding along open axis
          if (prevX <= minX || prevX >= maxX) {
            finalX = prevX;
          } else if (prevZ <= minZ || prevZ >= maxZ) {
            finalZ = prevZ;
          } else {
            finalX = prevX;
            finalZ = prevZ;
          }
        }
      }
    }

    player.position[0] = finalX;
    player.position[2] = finalZ;
    player.velocity[0] = dx / (dt || 0.033);
    player.velocity[2] = dz / (dt || 0.033);

    // Handle jumping
    if (input.jump && player.position[1] <= 0.6) {
      player.velocity[1] = GAME_CONSTANTS.JUMP_IMPULSE;
    }
  }

  public handleShoot(id: string, shootData: { origin: [number, number, number]; direction: [number, number, number]; weaponId?: string }): HitResult {
    const player = this.state.players[id];
    if (!player || !player.isAlive || (this.state.phase !== 'ROUND_ACTIVE' && this.state.phase !== 'WARMUP')) {
      return { hit: false, damage: 0, isHeadshot: false };
    }

    // Authoritative weapon check: prioritized equipped weapon or weapon key
    const activeWeaponKey = (shootData.weaponId && WEAPONS[shootData.weaponId])
      ? shootData.weaponId
      : player.activeWeaponId && WEAPONS[player.activeWeaponId]
      ? player.activeWeaponId
      : 'highlighter_pistol';
    const weapon = WEAPONS[activeWeaponKey];
    if (!weapon) return { hit: false, damage: 0, isHeadshot: false };

    // Cancel reload if firing
    if (player.isReloading) {
      player.isReloading = false;
      player.reloadingWeaponId = undefined;
      player.reloadFinishTime = 0;
    }

    // Fire rate check
    const now = Date.now();
    const minInterval = 1000 / weapon.fireRate;
    if (now - player.lastShootTime < minInterval * 0.82) {
      return { hit: false, damage: 0, isHeadshot: false };
    }

    // Check ammo
    if (weapon.category !== 'MELEE') {
      if (player.ammoInClip <= 0) {
        return { hit: false, damage: 0, isHeadshot: false };
      }
      player.ammoInClip -= 1;
    }
    player.lastShootTime = now;

    // Authoritative origin calculation strictly from server player position and eye height
    const serverEyeHeight = player.position[1] + GAME_CONSTANTS.PLAYER_EYE_HEIGHT;
    const ox = player.position[0];
    const oy = (shootData.origin && Math.abs(shootData.origin[1] - serverEyeHeight) < 0.75)
      ? shootData.origin[1]
      : serverEyeHeight;
    const oz = player.position[2];

    const [dx, dy, dz] = shootData.direction;
    const dirLen = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const ndx = dx / dirLen;
    const ndy = dy / dirLen;
    const ndz = dz / dirLen;

    // Check closest solid obstacle intersection along the ray to block shots through walls
    let closestWallDist = weapon.range;
    for (const obj of this.mapData.objects) {
      if (!obj.collision || obj.type === 'floor' || obj.type === 'ceiling') continue;

      const halfX = obj.scale[0] / 2;
      const halfY = obj.scale[1] / 2;
      const halfZ = obj.scale[2] / 2;
      const boxMin: [number, number, number] = [
        obj.position[0] - halfX,
        obj.position[1] - halfY,
        obj.position[2] - halfZ,
      ];
      const boxMax: [number, number, number] = [
        obj.position[0] + halfX,
        obj.position[1] + halfY,
        obj.position[2] + halfZ,
      ];

      const tHit = rayIntersectsAABB([ox, oy, oz], [ndx, ndy, ndz], boxMin, boxMax);
      if (tHit !== null && tHit > 0 && tHit < closestWallDist) {
        closestWallDist = tHit;
      }
    }

    let closestHitDist = Math.min(weapon.range, closestWallDist);
    let hitVictim: PlayerState | null = null;
    let isHeadshotHit = false;

    // Raycast against all enemy players (only valid if closer than any solid wall)
    for (const victim of Object.values(this.state.players)) {
      if (!victim.isAlive || victim.id === player.id || victim.team === player.team) continue;

      // Sphere intersection test for Head and Capsule/Cylinder for Torso
      const [vx, vy, vz] = victim.position;
      const headHeight = vy + GAME_CONSTANTS.PLAYER_EYE_HEIGHT;

      // Vector to victim
      const toVx = vx - ox;
      const toVy = headHeight - oy;
      const toVz = vz - oz;

      // Projection along ray
      const proj = toVx * ndx + toVy * ndy + toVz * ndz;
      if (proj > 0 && proj < closestHitDist) {
        // Closest point on ray to victim center
        const cx = ox + ndx * proj;
        const cy = oy + ndy * proj;
        const cz = oz + ndz * proj;

        const distSq = (cx - vx) * (cx - vx) + (cz - vz) * (cz - vz);
        const yDiff = cy - vy;

        if (distSq < (GAME_CONSTANTS.PLAYER_RADIUS * 1.35) ** 2 && yDiff >= 0 && yDiff <= GAME_CONSTANTS.PLAYER_HEIGHT + 0.2) {
          closestHitDist = proj;
          hitVictim = victim;
          isHeadshotHit = yDiff >= GAME_CONSTANTS.PLAYER_EYE_HEIGHT - 0.2;
        }
      }
    }

    // Broadcast shoot event for visuals & audio
    const hitPoint: [number, number, number] = [
      ox + ndx * closestHitDist,
      oy + ndy * closestHitDist,
      oz + ndz * closestHitDist,
    ];

    const shootEvent: ShootEvent = {
      shooterId: player.id,
      weaponId: weapon.id,
      origin: [ox, oy, oz],
      direction: [ndx, ndy, ndz],
      hitPoint,
      hitPlayerId: hitVictim ? hitVictim.id : undefined,
      isHeadshot: isHeadshotHit,
    };
    if (this.onShootCallback) {
      this.onShootCallback(shootEvent);
    }

    if (hitVictim) {
      let finalDamage = weapon.damage;
      if (isHeadshotHit) {
        finalDamage *= weapon.headshotMultiplier;
      }

      // Armor reduction
      if (hitVictim.armor > 0) {
        const absorbed = Math.min(hitVictim.armor, finalDamage * GAME_CONSTANTS.ARMOR_DAMAGE_REDUCTION);
        finalDamage -= absorbed;
        hitVictim.armor = Math.max(0, hitVictim.armor - absorbed);
      }

      finalDamage = Math.round(finalDamage);
      hitVictim.health = Math.max(0, hitVictim.health - finalDamage);

      const victimDied = hitVictim.health <= 0;
      if (victimDied) {
        hitVictim.isAlive = false;
        hitVictim.deaths += 1;
        player.kills += 1;
        player.money = Math.min(GAME_CONSTANTS.MAX_MONEY, player.money + weapon.killReward);

        const killfeedEntry: KillfeedEntry = {
          id: `kill_${now}_${Math.random()}`,
          killerId: player.id,
          killerName: player.name,
          killerTeam: player.team,
          victimId: hitVictim.id,
          victimName: hitVictim.name,
          victimTeam: hitVictim.team,
          weaponId: weapon.id,
          isHeadshot: isHeadshotHit,
          timestamp: now,
        };

        if (this.onKillfeedCallback) {
          this.onKillfeedCallback(killfeedEntry);
        }

        this.checkWinConditions();
      }

      return {
        hit: true,
        damage: finalDamage,
        isHeadshot: isHeadshotHit,
        victimId: hitVictim.id,
        victimDied,
      };
    }

    return { hit: false, damage: 0, isHeadshot: false };
  }

  public handleReload(playerId: string, weaponId?: string): boolean {
    const player = this.state.players[playerId];
    if (!player || !player.isAlive || player.isReloading) return false;

    const activeId = weaponId && player.inventory.includes(weaponId) ? weaponId : player.activeWeaponId;
    const weapon = WEAPONS[activeId];
    if (!weapon || weapon.category === 'MELEE') return false;

    const needed = weapon.magazineSize - player.ammoInClip;
    if (needed <= 0 || player.reserveAmmo <= 0) return false;

    player.isReloading = true;
    player.reloadingWeaponId = activeId;
    player.reloadFinishTime = Date.now() + weapon.reloadTime * 1000;
    return true;
  }

  public handleSwitchWeapon(playerId: string, weaponId: string): boolean {
    const player = this.state.players[playerId];
    if (!player || !player.isAlive) return false;
    if (!player.inventory.includes(weaponId)) return false;

    const weapon = WEAPONS[weaponId];
    if (!weapon) return false;

    player.activeWeaponId = weaponId;
    // Switching weapons cancels any active reload consistently
    player.isReloading = false;
    player.reloadingWeaponId = undefined;
    player.reloadFinishTime = 0;
    return true;
  }

  public handleBuyItem(playerId: string, itemId: string): { success: boolean; message: string } {
    const player = this.state.players[playerId];
    if (!player || !player.isAlive) {
      return { success: false, message: 'Jogador precisa estar vivo.' };
    }

    // Can buy during BUY_PHASE, WAITING, or first 25 seconds of ROUND_ACTIVE
    const isRoundStartGracePeriod = this.state.phase === 'ROUND_ACTIVE' && (GAME_CONSTANTS.ROUND_TIME_SECONDS - this.roundTimerSeconds) <= 25;
    if (this.state.phase !== 'BUY_PHASE' && this.state.phase !== 'WAITING' && !isRoundStartGracePeriod) {
      return { success: false, message: 'Tempo de compra esgotado!' };
    }

    if (itemId === 'armor_vest') {
      if (player.money < GAME_CONSTANTS.ARMOR_VEST_PRICE) {
        return { success: false, message: 'Dinheiro insuficiente.' };
      }
      player.money -= GAME_CONSTANTS.ARMOR_VEST_PRICE;
      player.armor = 100;
      return { success: true, message: 'Colete escolar adquirido!' };
    }

    const weapon = WEAPONS[itemId];
    if (!weapon) {
      return { success: false, message: 'Equipamento não encontrado.' };
    }

    // If player already has this weapon, prevent double-charge if already fully stocked
    if (player.inventory.includes(weapon.id)) {
      if (player.ammoInClip >= weapon.magazineSize && player.reserveAmmo >= weapon.reserveAmmo) {
        return { success: false, message: 'Você já possui este equipamento e sua munição está completa!' };
      }
      const ammoCost = Math.min(100, player.money);
      player.money -= ammoCost;
      player.ammoInClip = weapon.magazineSize;
      player.reserveAmmo = weapon.reserveAmmo;
      return { success: true, message: 'Munição recarregada com sucesso!' };
    }

    if (player.money < weapon.price) {
      return { success: false, message: 'Dinheiro insuficiente para este item.' };
    }

    player.money -= weapon.price;

    // Add to inventory or replace in slot
    if (!player.inventory.includes(weapon.id)) {
      // Remove other weapons in same primary/secondary category if applicable
      if (weapon.category === 'RIFLE' || weapon.category === 'SNIPER' || weapon.category === 'SHOTGUN') {
        player.inventory = player.inventory.filter(id => {
          const w = WEAPONS[id];
          return w && w.category !== 'RIFLE' && w.category !== 'SNIPER' && w.category !== 'SHOTGUN';
        });
      } else if (weapon.category === 'PISTOL' || weapon.category === 'HEAVY_PISTOL') {
        player.inventory = player.inventory.filter(id => {
          const w = WEAPONS[id];
          return w && w.category !== 'PISTOL' && w.category !== 'HEAVY_PISTOL';
        });
      }
      player.inventory.push(weapon.id);
    }

    player.activeWeaponId = weapon.id;
    player.ammoInClip = weapon.magazineSize;
    player.reserveAmmo = weapon.reserveAmmo;
    player.isReloading = false;
    player.reloadingWeaponId = undefined;

    return { success: true, message: `${weapon.portugueseName} adquirido!` };
  }

  public tick(mockDt?: number): void {
    const now = Date.now();
    const dt = mockDt !== undefined ? mockDt : Math.min((now - this.lastTickTime) / 1000, 0.05);
    this.lastTickTime = now;

    // Process Reload completion
    for (const player of Object.values(this.state.players)) {
      if (player.isReloading && now >= player.reloadFinishTime) {
        if (!player.reloadingWeaponId || player.reloadingWeaponId === player.activeWeaponId) {
          const weapon = WEAPONS[player.activeWeaponId];
          if (weapon) {
            const needed = weapon.magazineSize - player.ammoInClip;
            const transfer = Math.min(needed, player.reserveAmmo);
            player.ammoInClip += transfer;
            player.reserveAmmo -= transfer;
          }
        }
        player.isReloading = false;
        player.reloadingWeaponId = undefined;
      }

      // Physics (Gravity & vertical velocity)
      if (player.position[1] > 0.5 || player.velocity[1] !== 0) {
        player.velocity[1] += GAME_CONSTANTS.GRAVITY * dt;
        player.position[1] += player.velocity[1] * dt;
        if (player.position[1] <= 0.5) {
          player.position[1] = 0.5;
          player.velocity[1] = 0;
        }
      }

      // Bot AI
      if (player.isBot && player.isAlive && this.state.phase === 'ROUND_ACTIVE') {
        this.tickBotAI(player, dt, now);
      }
    }

    // Process Bomb Planting & Defusing during active rounds
    if (this.state.phase === 'ROUND_ACTIVE') {
      this.updateBombMechanics(dt, now);
    }

    // State machine timers
    if (this.roundTimerSeconds > 0) {
      this.roundTimerSeconds -= dt;
      this.state.timer = Math.ceil(this.roundTimerSeconds);

      if (this.roundTimerSeconds <= 0) {
        this.onTimerExpired();
      }
    }
  }

  private updateBombMechanics(dt: number, now: number): void {
    const bomb = this.state.bomb;

    // If bomb is NOT yet planted: check if any Rebel is planting in Bombsite A or B
    if (!bomb.isPlanted && !bomb.isExploded && !bomb.isDefused) {
      // Validate current active planter
      let currentPlanter: PlayerState | null = null;
      if (this.activePlanterId) {
        const p = this.state.players[this.activePlanterId];
        const input = this.lastPlayerInputs.get(this.activePlanterId);
        if (p && p.isAlive && p.team === 'REBELS' && input && input.interact && this.getBombsiteAtPosition(p.position)) {
          currentPlanter = p;
        } else {
          this.activePlanterId = null;
          this.plantHoldProgress = 0;
        }
      }

      // If no active planter, pick first eligible rebel
      if (!currentPlanter) {
        for (const player of Object.values(this.state.players)) {
          if (!player.isAlive || player.team !== 'REBELS') continue;
          const input = this.lastPlayerInputs.get(player.id);
          if (!input || !input.interact) continue;

          const site = this.getBombsiteAtPosition(player.position);
          if (site) {
            this.activePlanterId = player.id;
            currentPlanter = player;
            break;
          }
        }
      }

      if (currentPlanter) {
        const site = this.getBombsiteAtPosition(currentPlanter.position);
        if (site) {
          this.plantHoldProgress += dt / 3.0; // 3 seconds to plant
          if (this.plantHoldProgress >= 1.0) {
            // Bomb planted!
            bomb.isPlanted = true;
            bomb.site = site;
            bomb.position = [currentPlanter.position[0], 0.2, currentPlanter.position[2]];
            bomb.plantedAt = now;
            bomb.planterId = currentPlanter.id;
            bomb.plantTimer = 45;
            this.plantHoldProgress = 0;
            this.activePlanterId = null;

            if (this.onBombPlantedCallback) {
              this.onBombPlantedCallback(site, bomb.position);
            }
            if (this.onMessageCallback) {
              this.onMessageCallback(`A Mochila Bombástica foi armada no Ponto ${site}! (45s para detonação)`, 'round');
            }
          }
        }
      } else {
        this.plantHoldProgress = Math.max(0, this.plantHoldProgress - dt * 2.0);
      }
    }

    // If bomb IS planted: tick countdown, beep, and check defusing
    if (bomb.isPlanted && !bomb.isExploded && !bomb.isDefused && bomb.position) {
      bomb.plantTimer -= dt;

      // Accelerating beep
      let beepInterval = 1.0;
      if (bomb.plantTimer <= 4) beepInterval = 0.15;
      else if (bomb.plantTimer <= 10) beepInterval = 0.3;
      else if (bomb.plantTimer <= 20) beepInterval = 0.6;

      if (now - this.lastBombBeepTime >= beepInterval * 1000) {
        this.lastBombBeepTime = now;
        if (this.onBombBeepCallback) {
          this.onBombBeepCallback(bomb.plantTimer);
        }
      }

      // Check if an Inspector is defusing
      const [bx, , bz] = bomb.position;
      let currentDefuser: PlayerState | null = null;

      if (this.activeDefuserId) {
        const p = this.state.players[this.activeDefuserId];
        const input = this.lastPlayerInputs.get(this.activeDefuserId);
        if (p && p.isAlive && p.team === 'INSPECTORS' && input && input.interact) {
          const dx = p.position[0] - bx;
          const dz = p.position[2] - bz;
          if (Math.sqrt(dx * dx + dz * dz) <= 2.8) {
            currentDefuser = p;
          }
        }
        if (!currentDefuser) {
          this.activeDefuserId = null;
          this.defuseHoldProgress = 0;
          bomb.defuseProgress = 0;
          bomb.defuserId = undefined;
        }
      }

      if (!currentDefuser) {
        for (const player of Object.values(this.state.players)) {
          if (!player.isAlive || player.team !== 'INSPECTORS') continue;
          const input = this.lastPlayerInputs.get(player.id);
          if (!input || !input.interact) continue;

          const dx = player.position[0] - bx;
          const dz = player.position[2] - bz;
          if (Math.sqrt(dx * dx + dz * dz) <= 2.8) {
            this.activeDefuserId = player.id;
            currentDefuser = player;
            break;
          }
        }
      }

      if (currentDefuser) {
        this.defuseHoldProgress += dt / 5.0; // 5 seconds defuse
        bomb.defuseProgress = Math.min(1.0, this.defuseHoldProgress);
        bomb.defuserId = currentDefuser.id;

        if (this.defuseHoldProgress >= 1.0) {
          // Defused!
          bomb.isDefused = true;
          this.activeDefuserId = null;
          if (this.onBombDefusedCallback) {
            this.onBombDefusedCallback(currentDefuser.id);
          }
          this.endRound('INSPECTORS', 'A Mochila Bombástica foi desarmada com sucesso pelos Inspetores!');
        }
      } else {
        this.defuseHoldProgress = Math.max(0, this.defuseHoldProgress - dt * 2.5);
        bomb.defuseProgress = this.defuseHoldProgress;
        bomb.defuserId = undefined;
      }

      // Detonation check
      if (bomb.plantTimer <= 0) {
        bomb.isExploded = true;
        this.activeDefuserId = null;
        if (this.onBombExplodedCallback) {
          this.onBombExplodedCallback(bomb.position);
        }
        this.endRound('REBELS', 'A Mochila Bombástica detonou! Vitória dos Rebeldes do Recreio!');
      }
    }
  }

  public getBombsiteAtPosition(pos: [number, number, number]): 'A' | 'B' | null {
    for (const obj of this.mapData.objectives) {
      if (obj.type === 'BOMBSITE_A' || obj.type === 'BOMBSITE_B') {
        const rx = pos[0] - obj.position[0];
        const rz = pos[2] - obj.position[2];
        const rotY = obj.rotation ? obj.rotation[1] : 0;
        const cosR = Math.cos(-rotY);
        const sinR = Math.sin(-rotY);
        const localX = rx * cosR - rz * sinR;
        const localZ = rx * sinR + rz * cosR;

        const halfX = obj.scale[0] / 2 + 1.2;
        const halfZ = obj.scale[2] / 2 + 1.2;
        if (Math.abs(localX) <= halfX && Math.abs(localZ) <= halfZ) {
          return obj.type === 'BOMBSITE_A' ? 'A' : 'B';
        }
      }
    }
    return null;
  }

  private tickBotAI(bot: PlayerState, dt: number, now: number): void {
    // Objective orientation: if bomb is planted and bot is Inspector, move towards bomb
    const bomb = this.state.bomb;
    let targetPos: [number, number] | null = null;

    if (bomb.isPlanted && bomb.position) {
      if (bot.team === 'INSPECTORS') {
        targetPos = [bomb.position[0], bomb.position[2]];
      }
    }

    // Find closest enemy
    let closestEnemy: PlayerState | null = null;
    let minDist = 45;

    for (const enemy of Object.values(this.state.players)) {
      if (enemy.id === bot.id || enemy.team === bot.team || !enemy.isAlive) continue;
      const dx = enemy.position[0] - bot.position[0];
      const dz = enemy.position[2] - bot.position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minDist) {
        minDist = dist;
        closestEnemy = enemy;
      }
    }

    if (closestEnemy) {
      // Look toward enemy
      const dx = closestEnemy.position[0] - bot.position[0];
      const dz = closestEnemy.position[2] - bot.position[2];
      bot.yaw = Math.atan2(-dx, -dz);

      // Check solid wall line-of-sight before shooting
      const shootOrigin: [number, number, number] = [bot.position[0], bot.position[1] + 1.12, bot.position[2]];
      const shootDir: [number, number, number] = [-Math.sin(bot.yaw), 0.04, -Math.cos(bot.yaw)];

      let wallInBetween = false;
      for (const obj of this.mapData.objects) {
        if (!obj.collision || obj.type === 'floor' || obj.type === 'ceiling') continue;
        const halfX = obj.scale[0] / 2;
        const halfY = obj.scale[1] / 2;
        const halfZ = obj.scale[2] / 2;
        const boxMin: [number, number, number] = [obj.position[0] - halfX, obj.position[1] - halfY, obj.position[2] - halfZ];
        const boxMax: [number, number, number] = [obj.position[0] + halfX, obj.position[1] + halfY, obj.position[2] + halfZ];
        const tHit = rayIntersectsAABB(shootOrigin, shootDir, boxMin, boxMax);
        if (tHit !== null && tHit > 0 && tHit < minDist) {
          wallInBetween = true;
          break;
        }
      }

      // Advance if > 9m, retreat if < 4m
      if (minDist > 9) {
        bot.position[0] += Math.sin(bot.yaw) * GAME_CONSTANTS.MOVE_SPEED * 0.5 * dt;
        bot.position[2] += Math.cos(bot.yaw) * GAME_CONSTANTS.MOVE_SPEED * 0.5 * dt;
      }

      // Shoot bursts only if direct LOS exists without solid wall obstruction
      if (!wallInBetween && now - bot.lastShootTime > 400 && Math.random() < 0.65) {
        this.handleShoot(bot.id, {
          origin: shootOrigin,
          direction: shootDir,
          weaponId: bot.activeWeaponId,
        });
      }
    } else if (targetPos) {
      // Move toward objective
      const dx = targetPos[0] - bot.position[0];
      const dz = targetPos[1] - bot.position[2];
      bot.yaw = Math.atan2(-dx, -dz);
      bot.position[0] += Math.sin(bot.yaw) * GAME_CONSTANTS.MOVE_SPEED * 0.45 * dt;
      bot.position[2] += Math.cos(bot.yaw) * GAME_CONSTANTS.MOVE_SPEED * 0.45 * dt;
    }
  }

  private onTimerExpired(): void {
    if (this.state.phase === 'BUY_PHASE') {
      // Transition to active combat
      this.state.phase = 'ROUND_ACTIVE';
      this.roundTimerSeconds = GAME_CONSTANTS.ROUND_TIME_SECONDS;
      this.state.timer = this.roundTimerSeconds;
      if (this.onMessageCallback) {
        this.onMessageCallback('Sinal tocou! Round iniciado!', 'round');
      }
    } else if (this.state.phase === 'ROUND_ACTIVE') {
      // If bomb is planted, round timer expiring does NOT end round: bomb detonation timer takes over!
      if (!this.state.bomb.isPlanted) {
        this.endRound('INSPECTORS', 'Tempo esgotado! Os Inspetores mantiveram a ordem!');
      }
    } else if (this.state.phase === 'ROUND_END') {
      // Check match victory
      if (this.state.inspectorsScore >= GAME_CONSTANTS.ROUNDS_TO_WIN) {
        this.state.phase = 'MATCH_OVER';
        this.state.winnerTeam = 'INSPECTORS';
        if (this.onMessageCallback) {
          this.onMessageCallback('VITÓRIA DOS INSPETORES! A escola está em paz!', 'round');
        }
      } else if (this.state.rebelsScore >= GAME_CONSTANTS.ROUNDS_TO_WIN) {
        this.state.phase = 'MATCH_OVER';
        this.state.winnerTeam = 'REBELS';
        if (this.onMessageCallback) {
          this.onMessageCallback('VITÓRIA DOS REBELDES! O recreio foi tomado!', 'round');
        }
      } else {
        this.state.roundNumber += 1;
        this.startRound();
      }
    }
  }

  public checkWinConditions(): void {
    if (this.state.phase !== 'ROUND_ACTIVE') return;

    const aliveInspectors = Object.values(this.state.players).filter(p => p.team === 'INSPECTORS' && p.isAlive).length;
    const aliveRebels = Object.values(this.state.players).filter(p => p.team === 'REBELS' && p.isAlive).length;

    const totalInspectors = this.getTeamCount('INSPECTORS');
    const totalRebels = this.getTeamCount('REBELS');

    if (totalInspectors > 0 && totalRebels > 0) {
      if (aliveInspectors === 0) {
        this.endRound('REBELS', 'Equipe dos Inspetores eliminada!');
      } else if (aliveRebels === 0) {
        // If bomb is NOT planted, elimination is immediate CT victory
        // If bomb IS planted, CT still has to defuse!
        if (!this.state.bomb.isPlanted) {
          this.endRound('INSPECTORS', 'Rebeldes do Recreio eliminados!');
        } else {
          if (this.onMessageCallback) {
            this.onMessageCallback('Todos os Rebeldes eliminados! Desarme a Mochila antes que detone!', 'warning');
          }
        }
      }
    }
  }

  public startRound(): void {
    this.state.phase = 'BUY_PHASE';
    this.roundTimerSeconds = GAME_CONSTANTS.BUY_PHASE_SECONDS;
    this.state.timer = this.roundTimerSeconds;
    this.plantHoldProgress = 0;
    this.defuseHoldProgress = 0;

    // Reset bomb state
    this.state.bomb = {
      isPlanted: false,
      plantTimer: 45,
      defuseProgress: 0,
      isExploded: false,
      isDefused: false,
    };

    // Assign bomb carrier to first rebel player
    const rebels = Object.values(this.state.players).filter(p => p.team === 'REBELS');
    for (const r of rebels) {
      r.hasBomb = false;
    }
    if (rebels.length > 0) {
      this.state.bomb.carrierId = rebels[0].id;
      rebels[0].hasBomb = true;
    }

    // Spawn and reset players
    for (const player of Object.values(this.state.players)) {
      player.isAlive = true;
      player.health = 100;
      player.velocity = [0, 0, 0];
      player.isReloading = false;

      // Refill active weapon
      const weapon = WEAPONS[player.activeWeaponId];
      if (weapon) {
        player.ammoInClip = weapon.magazineSize;
        player.reserveAmmo = weapon.reserveAmmo;
      }

      this.spawnPlayer(player);
    }

    if (this.onMessageCallback) {
      this.onMessageCallback(`Round ${this.state.roundNumber} - Fase de Compra (15s)`, 'info');
    }
  }

  public endRound(winner: Team, reason: string): void {
    if (this.state.phase === 'ROUND_END' || this.state.phase === 'MATCH_OVER') return;

    this.state.phase = 'ROUND_END';
    this.state.roundEndReason = reason;
    this.roundTimerSeconds = GAME_CONSTANTS.ROUND_END_DELAY_SECONDS;
    this.state.timer = this.roundTimerSeconds;

    if (winner === 'INSPECTORS') {
      this.state.inspectorsScore += 1;
      this.consecutiveLosses.INSPECTORS = 0;
      this.consecutiveLosses.REBELS = Math.min(4, this.consecutiveLosses.REBELS + 1);
    } else {
      this.state.rebelsScore += 1;
      this.consecutiveLosses.REBELS = 0;
      this.consecutiveLosses.INSPECTORS = Math.min(4, this.consecutiveLosses.INSPECTORS + 1);
    }

    // Award economy
    for (const player of Object.values(this.state.players)) {
      const isWinner = player.team === winner;
      const baseReward = isWinner ? GAME_CONSTANTS.REWARD_WIN_ROUND : GAME_CONSTANTS.REWARD_LOSS_ROUND;
      const lossBonus = isWinner ? 0 : this.consecutiveLosses[player.team] * GAME_CONSTANTS.REWARD_CONSECUTIVE_LOSS_BONUS;
      player.money = Math.min(GAME_CONSTANTS.MAX_MONEY, player.money + baseReward + lossBonus);
    }

    if (this.onMessageCallback) {
      this.onMessageCallback(`Fim de Round: Vitória de ${winner === 'INSPECTORS' ? 'Inspetores' : 'Rebeldes'}! ${reason}`, 'round');
    }
  }

  public spawnPlayer(player: PlayerState): void {
    const validSpawns = this.mapData.spawns.filter(s => s.team === player.team && s.enabled !== false);
    if (validSpawns.length === 0) {
      // Fallback
      player.position = player.team === 'INSPECTORS' ? [0, 0.5, 30] : [0, 0.5, -30];
      player.yaw = player.team === 'INSPECTORS' ? Math.PI : 0;
      return;
    }

    // Select spawn that minimizes overlap with other players
    let bestSpawn = validSpawns[0];
    let maxMinDist = -1;

    for (const spawn of validSpawns) {
      let minDistToOthers = Infinity;
      for (const other of Object.values(this.state.players)) {
        if (other.id === player.id) continue;
        const dx = spawn.position[0] - other.position[0];
        const dz = spawn.position[2] - other.position[2];
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < minDistToOthers) {
          minDistToOthers = d;
        }
      }
      if (minDistToOthers > maxMinDist) {
        maxMinDist = minDistToOthers;
        bestSpawn = spawn;
      }
    }

    player.position = [...bestSpawn.position];
    player.yaw = bestSpawn.yaw;
    player.pitch = 0;
  }

  public loadMap(newMap: SchoolMapData): { success: boolean; message: string } {
    const validation = validateSchoolMap(newMap);
    if (!validation.valid) {
      return { success: false, message: `Mapa rejeitado: ${validation.errors.join('; ')}` };
    }

    this.mapData = newMap;
    this.state.mapName = newMap.name;
    this.state.roundNumber = 1;
    this.state.inspectorsScore = 0;
    this.state.rebelsScore = 0;

    this.startRound();
    return { success: true, message: `Mapa ${newMap.name} carregado com sucesso!` };
  }

  public restartMatch(): void {
    this.state.roundNumber = 1;
    this.state.inspectorsScore = 0;
    this.state.rebelsScore = 0;
    this.consecutiveLosses = { INSPECTORS: 0, REBELS: 0 };
    for (const player of Object.values(this.state.players)) {
      player.kills = 0;
      player.deaths = 0;
      player.money = GAME_CONSTANTS.STARTING_MONEY;
    }
    this.startRound();
  }

  public getTeamCount(team: Team): number {
    return Object.values(this.state.players).filter(p => p.team === team).length;
  }

  public getTotalPlayerCount(): number {
    return Object.keys(this.state.players).length;
  }
}
