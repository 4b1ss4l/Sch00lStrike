import * as THREE from 'three';
import { SchoolMapData, MapObjectDef, SpawnPointDef, ObjectiveZoneDef, Team } from '../../types/game';
import { getProceduralTexture } from '../renderer/textures';
import { validateSchoolMap, serializeSchoolMap } from '../../shared/mapValidator';

export class MapEditor {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public currentMap: SchoolMapData;
  public selectedObjectId: string | null = null;
  public snapGrid: number = 1.0; // 0.5, 1.0, 2.0 or 0 (free)

  private container: HTMLElement;
  private objectsGroup: THREE.Group;
  private spawnsGroup: THREE.Group;
  private objectivesGroup: THREE.Group;
  private gridHelper: THREE.GridHelper;
  private selectionBox: THREE.BoxHelper | null = null;

  // Orbit camera state
  private isOrbiting = false;
  private isPanning = false;
  private prevMouse = { x: 0, y: 0 };
  private orbitTheta = Math.PI / 4;
  private orbitPhi = Math.PI / 3;
  private orbitRadius = 45;
  private orbitTarget = new THREE.Vector3(0, 0, 0);

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  private onSelectCallback?: (obj: MapObjectDef | SpawnPointDef | ObjectiveZoneDef | null, type: 'object' | 'spawn' | 'objective' | null) => void;

  constructor(container: HTMLElement, initialMap: SchoolMapData) {
    this.container = container;
    this.currentMap = JSON.parse(JSON.stringify(initialMap));

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1e293b);

    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 500);
    this.updateCameraOrbit();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(30, 50, 30);
    this.scene.add(dirLight);

    // Floor grid
    this.gridHelper = new THREE.GridHelper(90, 90, 0x3b82f6, 0x334155);
    this.gridHelper.position.y = 0.01;
    this.scene.add(this.gridHelper);

    // Groups
    this.objectsGroup = new THREE.Group();
    this.spawnsGroup = new THREE.Group();
    this.objectivesGroup = new THREE.Group();
    this.scene.add(this.objectsGroup);
    this.scene.add(this.spawnsGroup);
    this.scene.add(this.objectivesGroup);

    this.rebuildScene();

    // Event listeners
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.renderer.domElement.addEventListener('wheel', this.onWheel);
    window.addEventListener('resize', this.onResize);
  }

  public setOnSelect(cb: (obj: MapObjectDef | SpawnPointDef | ObjectiveZoneDef | null, type: 'object' | 'spawn' | 'objective' | null) => void) {
    this.onSelectCallback = cb;
  }

  public rebuildScene() {
    // Clear
    while (this.objectsGroup.children.length > 0) {
      const m = this.objectsGroup.children[0] as THREE.Mesh;
      this.objectsGroup.remove(m);
      if (m.geometry) m.geometry.dispose();
    }
    while (this.spawnsGroup.children.length > 0) {
      const m = this.spawnsGroup.children[0] as THREE.Group;
      this.spawnsGroup.remove(m);
    }
    while (this.objectivesGroup.children.length > 0) {
      const m = this.objectivesGroup.children[0] as THREE.Mesh;
      this.objectivesGroup.remove(m);
      if (m.geometry) m.geometry.dispose();
    }

    // Objects
    for (const obj of this.currentMap.objects) {
      const geo = new THREE.BoxGeometry(obj.scale[0], obj.scale[1], obj.scale[2]);
      let mat: THREE.Material;
      if (obj.texture) {
        mat = new THREE.MeshStandardMaterial({
          map: getProceduralTexture(obj.texture),
          color: 0xffffff,
        });
      } else {
        mat = new THREE.MeshStandardMaterial({ color: obj.color || 0x64748b });
      }
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(obj.position[0], obj.position[1], obj.position[2]);
      mesh.rotation.set(obj.rotation[0], obj.rotation[1], obj.rotation[2]);
      mesh.userData = { id: obj.id, type: 'object' };
      this.objectsGroup.add(mesh);
    }

    // Spawns
    for (const sp of this.currentMap.spawns) {
      const spGroup = new THREE.Group();
      const isCT = sp.team === 'INSPECTORS';

      // Pin
      const pinGeo = new THREE.CylinderGeometry(0.3, 0.05, 1.4, 8);
      const pinMat = new THREE.MeshStandardMaterial({
        color: isCT ? 0x2563eb : 0xdc2626,
        roughness: 0.3,
      });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.y = 0.7;
      spGroup.add(pin);

      // Direction Arrow
      const arrowGeo = new THREE.ConeGeometry(0.25, 0.6, 6);
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.rotation.x = Math.PI / 2;
      arrow.position.set(0, 1.2, 0.5);
      spGroup.add(arrow);

      spGroup.position.set(sp.position[0], sp.position[1], sp.position[2]);
      spGroup.rotation.y = sp.yaw;
      spGroup.userData = { id: sp.id, type: 'spawn' };
      this.spawnsGroup.add(spGroup);
    }

    // Objectives
    for (const obj of this.currentMap.objectives) {
      const geo = new THREE.BoxGeometry(obj.scale[0], obj.scale[1], obj.scale[2]);
      const mat = new THREE.MeshBasicMaterial({
        color: obj.type === 'BOMBSITE_A' ? 0xef4444 : obj.type === 'BOMBSITE_B' ? 0x3b82f6 : 0x10b981,
        wireframe: true,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(obj.position[0], obj.position[1], obj.position[2]);
      mesh.userData = { id: obj.id, type: 'objective' };
      this.objectivesGroup.add(mesh);
    }

    this.updateSelectionBox();
  }

  public addObject(type: MapObjectDef['type']) {
    const id = `obj_${Date.now()}`;
    const newObj: MapObjectDef = {
      id,
      type,
      position: [this.snap(this.orbitTarget.x), 1.0, this.snap(this.orbitTarget.z)],
      rotation: [0, 0, 0],
      scale: type === 'wall' ? [6, 3, 0.5] : type === 'floor' ? [10, 0.2, 10] : [2, 1.5, 2],
      color: '#64748b',
      texture: type === 'wall' ? 'brick' : type === 'floor' ? 'tile' : 'wood',
      collision: true,
    };
    this.currentMap.objects.push(newObj);
    this.rebuildScene();
    this.selectObject(id, 'object');
  }

  public addSpawn(team: Team) {
    const id = `spawn_${team.toLowerCase()}_${Date.now()}`;
    const newSpawn: SpawnPointDef = {
      id,
      team,
      position: [this.snap(this.orbitTarget.x), 0.5, this.snap(this.orbitTarget.z)],
      yaw: 0,
      enabled: true,
    };
    this.currentMap.spawns.push(newSpawn);
    this.rebuildScene();
    this.selectObject(id, 'spawn');
  }

  public deleteSelected() {
    if (!this.selectedObjectId) return;

    this.currentMap.objects = this.currentMap.objects.filter(o => o.id !== this.selectedObjectId);
    this.currentMap.spawns = this.currentMap.spawns.filter(s => s.id !== this.selectedObjectId);
    this.currentMap.objectives = this.currentMap.objectives.filter(o => o.id !== this.selectedObjectId);

    this.selectedObjectId = null;
    this.rebuildScene();
    if (this.onSelectCallback) this.onSelectCallback(null, null);
  }

  public duplicateSelected() {
    if (!this.selectedObjectId) return;
    const obj = this.currentMap.objects.find(o => o.id === this.selectedObjectId);
    if (obj) {
      const copy: MapObjectDef = JSON.parse(JSON.stringify(obj));
      copy.id = `obj_${Date.now()}`;
      copy.position[0] += 2;
      copy.position[2] += 2;
      this.currentMap.objects.push(copy);
      this.rebuildScene();
      this.selectObject(copy.id, 'object');
    }
  }

  public selectObject(id: string | null, type: 'object' | 'spawn' | 'objective' | null) {
    this.selectedObjectId = id;
    this.updateSelectionBox();

    if (!id || !type) {
      if (this.onSelectCallback) this.onSelectCallback(null, null);
      return;
    }

    if (type === 'object') {
      const obj = this.currentMap.objects.find(o => o.id === id) || null;
      if (this.onSelectCallback) this.onSelectCallback(obj, 'object');
    } else if (type === 'spawn') {
      const sp = this.currentMap.spawns.find(s => s.id === id) || null;
      if (this.onSelectCallback) this.onSelectCallback(sp, 'spawn');
    } else if (type === 'objective') {
      const obj = this.currentMap.objectives.find(o => o.id === id) || null;
      if (this.onSelectCallback) this.onSelectCallback(obj, 'objective');
    }
  }

  private updateSelectionBox() {
    if (this.selectionBox) {
      this.scene.remove(this.selectionBox);
      this.selectionBox.dispose();
      this.selectionBox = null;
    }

    if (!this.selectedObjectId) return;

    let targetMesh: THREE.Object3D | undefined;
    for (const group of [this.objectsGroup, this.spawnsGroup, this.objectivesGroup]) {
      targetMesh = group.children.find(c => c.userData.id === this.selectedObjectId);
      if (targetMesh) break;
    }

    if (targetMesh) {
      this.selectionBox = new THREE.BoxHelper(targetMesh, 0xfacc15);
      this.scene.add(this.selectionBox);
    }
  }

  private snap(val: number): number {
    if (this.snapGrid <= 0) return Math.round(val * 10) / 10;
    return Math.round(val / this.snapGrid) * this.snapGrid;
  }

  private updateCameraOrbit() {
    const x = this.orbitTarget.x + this.orbitRadius * Math.sin(this.orbitPhi) * Math.sin(this.orbitTheta);
    const y = this.orbitTarget.y + this.orbitRadius * Math.cos(this.orbitPhi);
    const z = this.orbitTarget.z + this.orbitRadius * Math.sin(this.orbitPhi) * Math.cos(this.orbitTheta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.orbitTarget);
  }

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      // Left click: Raycast object selection
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects([
        ...this.objectsGroup.children,
        ...this.spawnsGroup.children,
        ...this.objectivesGroup.children,
      ], true);

      if (intersects.length > 0) {
        let topObj = intersects[0].object;
        while (topObj.parent && !topObj.userData.id && topObj.parent !== this.scene) {
          topObj = topObj.parent;
        }
        if (topObj.userData.id) {
          this.selectObject(topObj.userData.id, topObj.userData.type);
        }
      } else {
        this.selectObject(null, null);
      }
    } else if (e.button === 1 || e.shiftKey) {
      this.isPanning = true;
      this.prevMouse = { x: e.clientX, y: e.clientY };
    } else if (e.button === 2) {
      this.isOrbiting = true;
      this.prevMouse = { x: e.clientX, y: e.clientY };
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    const dx = e.clientX - this.prevMouse.x;
    const dy = e.clientY - this.prevMouse.y;
    this.prevMouse = { x: e.clientX, y: e.clientY };

    if (this.isOrbiting) {
      this.orbitTheta -= dx * 0.006;
      this.orbitPhi -= dy * 0.006;
      this.orbitPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, this.orbitPhi));
      this.updateCameraOrbit();
    } else if (this.isPanning) {
      const panSpeed = this.orbitRadius * 0.0012;
      this.orbitTarget.x -= dx * panSpeed * Math.cos(this.orbitTheta);
      this.orbitTarget.z += dx * panSpeed * Math.sin(this.orbitTheta);
      this.orbitTarget.y += dy * panSpeed;
      this.updateCameraOrbit();
    }
  };

  private onMouseUp = () => {
    this.isOrbiting = false;
    this.isPanning = false;
  };

  private onWheel = (e: WheelEvent) => {
    this.orbitRadius += e.deltaY * 0.05;
    this.orbitRadius = Math.max(8, Math.min(150, this.orbitRadius));
    this.updateCameraOrbit();
  };

  private onResize = () => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public render() {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    this.renderer.domElement.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.renderer.domElement.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
