import * as THREE from 'three';
import { SchoolMapData, PlayerState, ShootEvent } from '../../types/game';
import { getProceduralTexture } from './textures';
import { ViewmodelRenderer } from './ViewmodelRenderer';
import { WorldPlayers } from './WorldPlayers';
import { ParticleSystem } from './ParticleSystem';
import { soundManager } from '../audio/SoundManager';

export class GameRenderer {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public viewmodelRenderer: ViewmodelRenderer;
  public worldPlayers: WorldPlayers;
  public particleSystem: ParticleSystem;

  private mapGroup: THREE.Group;
  private objectiveGroup: THREE.Group;
  private isSoftwareGl: boolean = false;
  private currentMapData: SchoolMapData | null = null;

  constructor(container: HTMLElement) {
    // Detect software WebGL as instructed in Three.js skill
    this.isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    container.appendChild(this.renderer.domElement);

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xa5b4fc); // Daytime school sky
    this.scene.fog = new THREE.FogExp2(0xa5b4fc, 0.015);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      75,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.1,
      250
    );
    this.camera.position.set(0, 1.62, 0);

    // Lighting setup
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x64748b, 0.9);
    this.scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.2);
    sunLight.position.set(25, 40, 20);
    this.scene.add(sunLight);

    // Groups
    this.mapGroup = new THREE.Group();
    this.objectiveGroup = new THREE.Group();
    this.scene.add(this.mapGroup);
    this.scene.add(this.objectiveGroup);

    // Sub-systems
    this.worldPlayers = new WorldPlayers();
    this.scene.add(this.worldPlayers.root);

    this.particleSystem = new ParticleSystem();
    this.scene.add(this.particleSystem.root);

    // First person viewmodel attached directly to camera
    this.viewmodelRenderer = new ViewmodelRenderer();
    this.camera.add(this.viewmodelRenderer.root);
    this.scene.add(this.camera);

    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    const parent = this.renderer.domElement.parentElement;
    const width = parent?.clientWidth || window.innerWidth;
    const height = parent?.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public loadMap(mapData: SchoolMapData) {
    this.currentMapData = mapData;

    // Clear previous geometry
    while (this.mapGroup.children.length > 0) {
      const obj = this.mapGroup.children[0] as THREE.Mesh;
      this.mapGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    }

    while (this.objectiveGroup.children.length > 0) {
      const obj = this.objectiveGroup.children[0] as THREE.Mesh;
      this.objectiveGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
    }

    // Build objects
    for (const def of mapData.objects) {
      const geo = new THREE.BoxGeometry(def.scale[0], def.scale[1], def.scale[2]);

      let mat: THREE.Material;
      if (def.texture) {
        const tex = getProceduralTexture(def.texture);
        mat = new THREE.MeshStandardMaterial({
          map: tex,
          color: 0xffffff,
          roughness: def.texture === 'metal' ? 0.3 : 0.7,
          metalness: def.texture === 'metal' ? 0.6 : 0.05,
        });
      } else {
        mat = new THREE.MeshStandardMaterial({
          color: def.color ? new THREE.Color(def.color) : 0x94a3b8,
          roughness: 0.65,
        });
      }

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(def.position[0], def.position[1], def.position[2]);
      mesh.rotation.set(def.rotation[0], def.rotation[1], def.rotation[2]);
      this.mapGroup.add(mesh);
    }

    // Build Bombsite Objective Markers
    for (const obj of mapData.objectives) {
      if (obj.type === 'BOMBSITE_A' || obj.type === 'BOMBSITE_B') {
        const isSiteA = obj.type === 'BOMBSITE_A';
        // Floor zone outline
        const zoneGeo = new THREE.BoxGeometry(obj.scale[0], 0.1, obj.scale[2]);
        const zoneMat = new THREE.MeshBasicMaterial({
          color: isSiteA ? 0xef4444 : 0x3b82f6,
          wireframe: true,
        });
        const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
        zoneMesh.position.set(obj.position[0], 0.08, obj.position[2]);
        this.objectiveGroup.add(zoneMesh);

        // Floating letter marker (A or B)
        const signCanvas = document.createElement('canvas');
        signCanvas.width = 128;
        signCanvas.height = 128;
        const sctx = signCanvas.getContext('2d')!;
        sctx.fillStyle = isSiteA ? '#ef4444' : '#3b82f6';
        sctx.fillRect(0, 0, 128, 128);
        sctx.fillStyle = '#ffffff';
        sctx.font = 'bold 80px sans-serif';
        sctx.textAlign = 'center';
        sctx.textBaseline = 'middle';
        sctx.fillText(isSiteA ? 'A' : 'B', 64, 64);

        const tex = new THREE.CanvasTexture(signCanvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        const spriteMat = new THREE.SpriteMaterial({ map: tex });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(obj.position[0], 3.5, obj.position[2]);
        sprite.scale.set(2.5, 2.5, 1);
        this.objectiveGroup.add(sprite);
      }
    }
  }

  public handleShootEvent(event: ShootEvent, localPlayerId: string) {
    const isLocal = event.shooterId === localPlayerId;
    if (isLocal) {
      this.viewmodelRenderer.triggerShoot();
    }
    soundManager.playShoot(event.weaponId);

    // Particle tracer
    const [ox, oy, oz] = event.origin;
    const [dx, dy, dz] = event.direction;
    const endPoint: [number, number, number] = event.hitPoint || [ox + dx * 40, oy + dy * 40, oz + dz * 40];

    const tracerColor = event.weaponId === 'highlighter_pistol' ? 0x22c55e :
      event.weaponId === 'stapler_heavy' ? 0xe2e8f0 :
      event.weaponId === 'paper_rifle_m4' ? 0x60a5fa :
      event.weaponId === 'telescopic_awp' ? 0xfacc15 : 0xf97316;

    this.particleSystem.emitTracer(event.origin, endPoint, tracerColor);

    if (event.hitPoint) {
      this.particleSystem.emitHitImpact(event.hitPoint, event.isHeadshot);
    }
  }

  public render(dt: number, localPlayer: PlayerState | undefined, allPlayers: Record<string, PlayerState>) {
    // Animate objective zone letters floating
    const t = Date.now() * 0.003;
    for (const child of this.objectiveGroup.children) {
      if (child instanceof THREE.Sprite) {
        child.position.y = 3.5 + Math.sin(t) * 0.25;
      }
    }

    if (localPlayer) {
      // Synchronize camera with local player
      const eyeH = localPlayer.position[1] + 1.12; // eye level
      this.camera.position.set(localPlayer.position[0], eyeH, localPlayer.position[2]);
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = localPlayer.yaw;
      this.camera.rotation.x = localPlayer.pitch;

      // Update Viewmodel
      const speed = Math.sqrt(localPlayer.velocity[0] ** 2 + localPlayer.velocity[2] ** 2);
      this.viewmodelRenderer.setWeapon(localPlayer.activeWeaponId);
      this.viewmodelRenderer.update(dt, speed > 0.5, speed);
    }

    // Update other players
    this.worldPlayers.updatePlayers(allPlayers, localPlayer ? localPlayer.id : '', dt);

    // Update particles
    this.particleSystem.update(dt);

    // Render frame
    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
