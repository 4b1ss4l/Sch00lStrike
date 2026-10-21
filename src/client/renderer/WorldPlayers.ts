import * as THREE from 'three';
import { PlayerState, Team } from '../../types/game';

interface PlayerMeshInstance {
  group: THREE.Group;
  torso: THREE.Mesh;
  head: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  backpack: THREE.Mesh;
  heldWeapon: THREE.Mesh;
  nameSprite: THREE.Sprite;
  shadowDisc: THREE.Mesh;
  targetPos: THREE.Vector3;
  targetYaw: number;
}

export class WorldPlayers {
  public root: THREE.Group;
  private instances: Map<string, PlayerMeshInstance> = new Map();

  constructor() {
    this.root = new THREE.Group();
  }

  public updatePlayers(
    players: Record<string, PlayerState>,
    localPlayerId: string,
    dt: number
  ) {
    const activeIds = new Set<string>();

    for (const [id, player] of Object.entries(players)) {
      if (id === localPlayerId) continue; // Don't render self in world
      activeIds.add(id);

      let inst = this.instances.get(id);
      if (!inst) {
        inst = this.createCharacter(player);
        this.instances.set(id, inst);
        this.root.add(inst.group);
      }

      // Visibility
      inst.group.visible = player.isAlive;
      if (!player.isAlive) continue;

      // Update targets
      inst.targetPos.set(player.position[0], player.position[1], player.position[2]);
      inst.targetYaw = player.yaw;

      // Smooth interpolation
      inst.group.position.x = THREE.MathUtils.damp(inst.group.position.x, inst.targetPos.x, 20, dt);
      inst.group.position.y = THREE.MathUtils.damp(inst.group.position.y, inst.targetPos.y, 20, dt);
      inst.group.position.z = THREE.MathUtils.damp(inst.group.position.z, inst.targetPos.z, 20, dt);

      // Rotate body to face player yaw
      inst.group.rotation.y = inst.targetYaw;

      // Walk cycle animation
      const isMoving = inst.group.position.distanceTo(inst.targetPos) > 0.05;
      const walkTime = Date.now() * 0.012;
      const swing = isMoving ? Math.sin(walkTime) * 0.5 : 0;

      inst.leftLeg.rotation.x = swing;
      inst.rightLeg.rotation.x = -swing;
      inst.leftArm.rotation.x = -swing * 0.8;
      inst.rightArm.rotation.x = 0.5 + swing * 0.3; // holding weapon forward
    }

    // Cleanup disconnected players
    for (const [id, inst] of this.instances) {
      if (!activeIds.has(id)) {
        this.root.remove(inst.group);
        this.instances.delete(id);
      }
    }
  }

  private createCharacter(player: PlayerState): PlayerMeshInstance {
    const group = new THREE.Group();
    const isInspector = player.team === 'INSPECTORS';

    // 1. Torso
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.65, 0.28);
    const torsoMat = new THREE.MeshStandardMaterial({
      color: isInspector ? 0x1e3a8a : 0xef4444, // Blue monitor vest vs Red rebel uniform
      roughness: 0.6,
    });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.05;
    group.add(torso);

    // 2. Head
    const headGeo = new THREE.BoxGeometry(0.3, 0.32, 0.3);
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.5 });
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.55;
    group.add(head);

    // 3. Hair / Cap
    const capGeo = new THREE.BoxGeometry(0.32, 0.1, 0.32);
    const capMat = new THREE.MeshStandardMaterial({
      color: isInspector ? 0x0f172a : 0x7c2d12,
      roughness: 0.7,
    });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 1.72;
    group.add(cap);

    // 4. Arms
    const armGeo = new THREE.BoxGeometry(0.14, 0.55, 0.14);
    const armMat = new THREE.MeshStandardMaterial({
      color: isInspector ? 0x2563eb : 0xdc2626,
      roughness: 0.6,
    });

    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.35, 1.05, 0);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.35, 1.05, 0);
    group.add(rightArm);

    // 5. Legs
    const legGeo = new THREE.BoxGeometry(0.18, 0.7, 0.18);
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });

    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.16, 0.38, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.16, 0.38, 0);
    group.add(rightLeg);

    // 6. Backpack (on back)
    const packGeo = new THREE.BoxGeometry(0.34, 0.44, 0.16);
    const packMat = new THREE.MeshStandardMaterial({
      color: isInspector ? 0x0284c7 : 0xf97316,
      roughness: 0.7,
    });
    const backpack = new THREE.Mesh(packGeo, packMat);
    backpack.position.set(0, 1.05, -0.2);
    group.add(backpack);

    // 7. Held weapon in right hand
    const weaponGeo = new THREE.BoxGeometry(0.08, 0.08, 0.45);
    const weaponMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.5, roughness: 0.3 });
    const heldWeapon = new THREE.Mesh(weaponGeo, weaponMat);
    heldWeapon.position.set(0.35, 0.95, 0.25);
    group.add(heldWeapon);

    // 8. Contact shadow disc on floor
    const shadowGeo = new THREE.CircleGeometry(0.45, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = 0.02;
    group.add(shadowDisc);

    // 9. Floating Overhead Name & Team Badge
    const nameSprite = this.createNameSprite(player.name, player.team);
    nameSprite.position.set(0, 2.05, 0);
    group.add(nameSprite);

    group.position.set(player.position[0], player.position[1], player.position[2]);

    return {
      group,
      torso,
      head,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      backpack,
      heldWeapon,
      nameSprite,
      shadowDisc,
      targetPos: new THREE.Vector3(...player.position),
      targetYaw: player.yaw,
    };
  }

  private createNameSprite(name: string, team: Team): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Background pill
    ctx.fillStyle = team === 'INSPECTORS' ? 'rgba(30, 58, 138, 0.85)' : 'rgba(185, 28, 28, 0.85)';
    ctx.roundRect(10, 8, 236, 48, 12);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.slice(0, 16), 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.4, 0.35, 1);
    return sprite;
  }
}
