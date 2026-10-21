import * as THREE from 'three';

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
  active: boolean;
}

export class ParticleSystem {
  public root: THREE.Group;
  private maxParticles = 600;
  private particles: Particle[] = [];
  private instancedMesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private colorArray: Float32Array;

  constructor() {
    this.root = new THREE.Group();

    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85 });

    this.instancedMesh = new THREE.InstancedMesh(geo, mat, this.maxParticles);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.colorArray = new Float32Array(this.maxParticles * 3);
    this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(this.colorArray, 3);
    this.instancedMesh.count = this.maxParticles;

    this.root.add(this.instancedMesh);

    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        pos: new THREE.Vector3(0, -999, 0),
        vel: new THREE.Vector3(),
        color: new THREE.Color(),
        size: 0.1,
        life: 0,
        maxLife: 1,
        active: false,
      });
    }
  }

  public emitTracer(start: [number, number, number], end: [number, number, number], colorHex: number = 0x4ade80) {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const dir = new THREE.Vector3().subVectors(e, s).normalize();
    const dist = s.distanceTo(e);

    const steps = Math.min(6, Math.floor(dist / 3));
    for (let i = 0; i <= steps; i++) {
      const p = this.getFreeParticle();
      if (!p) break;

      const progress = i / Math.max(1, steps);
      p.pos.lerpVectors(s, e, progress);
      p.vel.copy(dir).multiplyScalar(20);
      p.color.setHex(colorHex);
      p.size = 0.08;
      p.life = 0;
      p.maxLife = 0.18;
      p.active = true;
    }
  }

  public emitConfettiExplosion(origin: [number, number, number]) {
    const confettiColors = [0xef4444, 0x3b82f6, 0xeab308, 0x22c55e, 0xec4899, 0xa855f7];
    for (let i = 0; i < 90; i++) {
      const p = this.getFreeParticle();
      if (!p) break;

      p.pos.set(origin[0], origin[1] + 0.3, origin[2]);
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      p.vel.set(
        Math.cos(angle) * speed,
        2 + Math.random() * 5,
        Math.sin(angle) * speed
      );
      p.color.setHex(confettiColors[Math.floor(Math.random() * confettiColors.length)]);
      p.size = 0.12 + Math.random() * 0.08;
      p.life = 0;
      p.maxLife = 1.5 + Math.random() * 0.8;
      p.active = true;
    }
  }

  public emitChalkSmoke(origin: [number, number, number]) {
    for (let i = 0; i < 80; i++) {
      const p = this.getFreeParticle();
      if (!p) break;

      p.pos.set(
        origin[0] + (Math.random() - 0.5) * 1.5,
        origin[1] + 0.2 + Math.random() * 0.5,
        origin[2] + (Math.random() - 0.5) * 1.5
      );
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 0.8;
      p.vel.set(Math.cos(angle) * speed, 0.2 + Math.random() * 0.4, Math.sin(angle) * speed);
      p.color.setHex(0xf8fafc);
      p.size = 0.35 + Math.random() * 0.4;
      p.life = 0;
      p.maxLife = 5.0 + Math.random() * 3.0; // Lingers like tactical CS smoke
      p.active = true;
    }
  }

  public emitHitImpact(pos: [number, number, number], isHeadshot: boolean = false) {
    const count = isHeadshot ? 18 : 8;
    for (let i = 0; i < count; i++) {
      const p = this.getFreeParticle();
      if (!p) break;

      p.pos.set(pos[0], pos[1], pos[2]);
      p.vel.set(
        (Math.random() - 0.5) * 4,
        Math.random() * 3,
        (Math.random() - 0.5) * 4
      );
      p.color.setHex(isHeadshot ? 0xfacc15 : 0xef4444);
      p.size = isHeadshot ? 0.08 : 0.05;
      p.life = 0;
      p.maxLife = 0.35;
      p.active = true;
    }
  }

  private getFreeParticle(): Particle | null {
    for (const p of this.particles) {
      if (!p.active) return p;
    }
    return null;
  }

  public update(dt: number) {
    let activeCount = 0;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) {
        this.dummy.position.set(0, -999, 0);
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }

      // Physics
      p.pos.addScaledVector(p.vel, dt);
      p.vel.y -= 7.0 * dt; // gravity

      if (p.pos.y < 0.1) {
        p.pos.y = 0.1;
        p.vel.y = -p.vel.y * 0.2;
        p.vel.x *= 0.6;
        p.vel.z *= 0.6;
      }

      // Scale down near end of life
      const remaining = 1 - p.life / p.maxLife;
      const currentSize = p.size * Math.max(0.1, remaining);

      this.dummy.position.copy(p.pos);
      this.dummy.scale.set(currentSize, currentSize, currentSize);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
      this.instancedMesh.setColorAt(i, p.color);
      activeCount++;
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }
}
