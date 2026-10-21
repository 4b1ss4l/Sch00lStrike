import * as THREE from 'three';
import { WeaponDef } from '../../types/game';

export class ViewmodelRenderer {
  public root: THREE.Group;
  private weaponModels: Map<string, THREE.Group> = new Map();
  private currentWeaponId: string = 'highlighter_pistol';
  private muzzleFlash: THREE.Mesh;
  private flashLife: number = 0;

  // Animation states
  private recoilZ: number = 0;
  private recoilRotX: number = 0;
  private reloadProgress: number = 0;
  private isReloading: boolean = false;
  private reloadDuration: number = 2.0;
  private reloadTimer: number = 0;
  private walkTime: number = 0;

  constructor() {
    this.root = new THREE.Group();
    // Default position relative to camera: down and right
    this.root.position.set(0.24, -0.22, -0.42);

    // Build all procedural school weapon viewmodels
    this.buildHighlighter();
    this.buildStapler();
    this.buildPaperRifle();
    this.buildTelescopicAWP();
    this.buildGlueShotgun();
    this.buildRulerMelee();

    // Muzzle flash quad
    const flashGeo = new THREE.PlaneGeometry(0.12, 0.12);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xfff066,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
    this.muzzleFlash.position.set(0, 0.05, -0.28);
    this.root.add(this.muzzleFlash);

    this.setWeapon('highlighter_pistol');
  }

  public setWeapon(weaponId: string) {
    this.currentWeaponId = weaponId;
    this.isReloading = false;
    this.recoilZ = 0;
    this.recoilRotX = 0;

    for (const [id, model] of this.weaponModels) {
      model.visible = id === weaponId;
    }
  }

  public triggerShoot() {
    this.recoilZ = 0.08;
    this.recoilRotX = 0.15;
    this.flashLife = 0.05;
    this.muzzleFlash.visible = true;
    (this.muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 1.0;
    this.muzzleFlash.rotation.z = Math.random() * Math.PI * 2;
  }

  public triggerReload(duration: number) {
    this.isReloading = true;
    this.reloadDuration = Math.max(0.5, duration);
    this.reloadTimer = 0;
  }

  public update(dt: number, isMoving: boolean, speed: number) {
    // Recoil recovery
    this.recoilZ = THREE.MathUtils.damp(this.recoilZ, 0, 18, dt);
    this.recoilRotX = THREE.MathUtils.damp(this.recoilRotX, 0, 16, dt);

    // Muzzle flash decay
    if (this.flashLife > 0) {
      this.flashLife -= dt;
      if (this.flashLife <= 0) {
        (this.muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 0;
      }
    }

    // Walking / idle bobbing
    if (isMoving) {
      this.walkTime += dt * 10 * Math.min(1.5, speed / 5);
    } else {
      this.walkTime += dt * 2.0; // gentle breathing bob
    }

    const bobX = Math.sin(this.walkTime) * (isMoving ? 0.015 : 0.003);
    const bobY = Math.abs(Math.cos(this.walkTime)) * (isMoving ? 0.015 : 0.003);

    // Reload animation dip
    let reloadY = 0;
    let reloadRotX = 0;
    if (this.isReloading) {
      this.reloadTimer += dt;
      const progress = this.reloadTimer / this.reloadDuration;
      if (progress >= 1.0) {
        this.isReloading = false;
      } else {
        // V-curve dip down and return
        const dip = Math.sin(progress * Math.PI);
        reloadY = -dip * 0.22;
        reloadRotX = dip * 0.45;
      }
    }

    // Apply composite transformation
    this.root.position.x = 0.24 + bobX;
    this.root.position.y = -0.22 - bobY + reloadY;
    this.root.position.z = -0.42 + this.recoilZ;

    this.root.rotation.x = this.recoilRotX + reloadRotX;
    this.root.rotation.y = bobX * 1.5;
  }

  // --- PROCEDURAL 3D SCHOOL WEAPON COMPOSITIONS ---

  private buildHighlighter() {
    const group = new THREE.Group();

    // 1. Chisel barrel body
    const bodyGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.18, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.35, metalness: 0.1 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    // 2. Cap ring
    const ringGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.03, 8);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.2 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.z = -0.04;
    group.add(ring);

    // 3. Fluorescent Chisel Nib (Tip)
    const tipGeo = new THREE.ConeGeometry(0.015, 0.04, 4);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.rotation.x = -Math.PI / 2;
    tip.position.z = -0.11;
    group.add(tip);

    // 4. Sleeve / Student Hand
    const handGeo = new THREE.BoxGeometry(0.05, 0.06, 0.12);
    const handMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.8 }); // Inspector blue sleeve
    const hand = new THREE.Mesh(handGeo, handMat);
    hand.position.set(0.02, -0.04, 0.08);
    group.add(hand);

    this.weaponModels.set('highlighter_pistol', group);
    this.root.add(group);
  }

  private buildStapler() {
    const group = new THREE.Group();

    // 1. Metal base plate
    const baseGeo = new THREE.BoxGeometry(0.045, 0.012, 0.22);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 });
    const base = new THREE.Mesh(baseGeo, metalMat);
    group.add(base);

    // 2. Staple magazine chamber
    const magGeo = new THREE.BoxGeometry(0.038, 0.035, 0.18);
    const magMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 });
    const mag = new THREE.Mesh(magGeo, magMat);
    mag.position.set(0, 0.025, 0.01);
    group.add(mag);

    // 3. Top lever handle
    const topGeo = new THREE.BoxGeometry(0.048, 0.02, 0.22);
    const topMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, roughness: 0.25 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.set(0, 0.05, -0.01);
    top.rotation.x = -0.06;
    group.add(top);

    // 4. Anvil plate (chrome staple fold slot)
    const anvilGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.005, 12);
    const anvilMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });
    const anvil = new THREE.Mesh(anvilGeo, anvilMat);
    anvil.position.set(0, 0.007, -0.08);
    group.add(anvil);

    // 5. Hand grip
    const handGeo = new THREE.BoxGeometry(0.05, 0.07, 0.1);
    const handMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.8 });
    const hand = new THREE.Mesh(handGeo, handMat);
    hand.position.set(0.01, -0.04, 0.07);
    group.add(hand);

    this.weaponModels.set('stapler_heavy', group);
    this.root.add(group);
  }

  private buildPaperRifle() {
    const group = new THREE.Group();

    // 1. Long paper tube barrel
    const barrelGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.44, 12);
    const tubeMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.4 });
    const barrel = new THREE.Mesh(barrelGeo, tubeMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.12;
    group.add(barrel);

    // 2. Spiral rolled paper magazine
    const magGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.16, 10);
    const magMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.9 });
    const mag = new THREE.Mesh(magGeo, magMat);
    mag.position.set(0, -0.09, -0.02);
    mag.rotation.x = 0.25;
    group.add(mag);

    // 3. Elastic rubber bands launcher
    const bandGeo = new THREE.TorusGeometry(0.03, 0.006, 6, 12);
    const bandMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 });
    const band1 = new THREE.Mesh(bandGeo, bandMat);
    band1.position.z = -0.22;
    group.add(band1);

    // 4. Cardboard stock
    const stockGeo = new THREE.BoxGeometry(0.04, 0.09, 0.18);
    const stockMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 });
    const stock = new THREE.Mesh(stockGeo, stockMat);
    stock.position.set(0, -0.03, 0.15);
    group.add(stock);

    // 5. Dual hands
    const handGeo = new THREE.BoxGeometry(0.05, 0.06, 0.1);
    const handMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.8 });
    const rightHand = new THREE.Mesh(handGeo, handMat);
    rightHand.position.set(0.02, -0.06, 0.06);
    group.add(rightHand);

    const leftHand = new THREE.Mesh(handGeo, handMat);
    leftHand.position.set(-0.03, -0.04, -0.16);
    group.add(leftHand);

    this.weaponModels.set('paper_rifle_m4', group);
    this.root.add(group);
  }

  private buildTelescopicAWP() {
    const group = new THREE.Group();

    // 1. Long folding brass ruler barrel
    const rulerGeo = new THREE.BoxGeometry(0.03, 0.04, 0.62);
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.7, roughness: 0.3 });
    const ruler = new THREE.Mesh(rulerGeo, brassMat);
    ruler.position.z = -0.2;
    group.add(ruler);

    // 2. Sniper telescopic scope
    const scopeGeo = new THREE.CylinderGeometry(0.026, 0.028, 0.22, 12);
    const scopeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.2 });
    const scope = new THREE.Mesh(scopeGeo, scopeMat);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.065, -0.15);
    group.add(scope);

    // 3. Glass lenses
    const lensGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.005, 12);
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1 });
    const frontLens = new THREE.Mesh(lensGeo, lensMat);
    frontLens.rotation.x = Math.PI / 2;
    frontLens.position.set(0, 0.065, -0.26);
    group.add(frontLens);

    // 4. Heavy bolt handle
    const boltGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6);
    const boltMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 });
    const bolt = new THREE.Mesh(boltGeo, boltMat);
    bolt.rotation.z = Math.PI / 2;
    bolt.position.set(0.04, 0.02, 0.0);
    group.add(bolt);

    // 5. Stock
    const stockGeo = new THREE.BoxGeometry(0.035, 0.1, 0.22);
    const stockMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.6 });
    const stock = new THREE.Mesh(stockGeo, stockMat);
    stock.position.set(0, -0.04, 0.18);
    group.add(stock);

    this.weaponModels.set('telescopic_awp', group);
    this.root.add(group);
  }

  private buildGlueShotgun() {
    const group = new THREE.Group();

    // 1. Dual glue tube barrels
    const bGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.38, 10);
    const bMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3 });
    const b1 = new THREE.Mesh(bGeo, bMat);
    b1.rotation.x = Math.PI / 2;
    b1.position.set(-0.018, 0, -0.1);
    group.add(b1);

    const b2 = new THREE.Mesh(bGeo, bMat);
    b2.rotation.x = Math.PI / 2;
    b2.position.set(0.018, 0, -0.1);
    group.add(b2);

    // 2. Pump action slide handle
    const pumpGeo = new THREE.BoxGeometry(0.065, 0.04, 0.12);
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const pump = new THREE.Mesh(pumpGeo, pumpMat);
    pump.position.set(0, -0.025, -0.15);
    group.add(pump);

    this.weaponModels.set('glue_shotgun', group);
    this.root.add(group);
  }

  private buildRulerMelee() {
    const group = new THREE.Group();

    // 1. Translucent 30cm school ruler
    const rulerGeo = new THREE.BoxGeometry(0.045, 0.005, 0.35);
    const rulerMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
      roughness: 0.15,
      metalness: 0.2,
    });
    const ruler = new THREE.Mesh(rulerGeo, rulerMat);
    ruler.position.set(0, 0, -0.1);
    group.add(ruler);

    // 2. Millimeter tick marks line
    const edgeGeo = new THREE.BoxGeometry(0.004, 0.006, 0.35);
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.position.set(0.022, 0, -0.1);
    group.add(edge);

    // 3. Hand holding ruler
    const handGeo = new THREE.BoxGeometry(0.05, 0.05, 0.08);
    const handMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.8 });
    const hand = new THREE.Mesh(handGeo, handMat);
    hand.position.set(0, -0.02, 0.06);
    group.add(hand);

    this.weaponModels.set('ruler_melee', group);
    this.root.add(group);
  }
}
