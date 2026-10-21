import { PlayerInput } from '../../types/game';
import { soundManager } from '../audio/SoundManager';

export class FPSController {
  private element: HTMLElement;
  public yaw: number = 0;
  public pitch: number = 0;
  public isLocked: boolean = false;
  public mouseSensitivity: number = 0.0022;
  public isZoomed: boolean = false;

  private keys: Record<string, boolean> = {};
  private seq: number = 0;
  private isShooting: boolean = false;

  // Crosshair recoil & spread expansion
  public spread: number = 0;
  private recoilPitch: number = 0;

  // Callbacks
  private onShootCallback?: () => void;
  private onReloadCallback?: () => void;
  private onWeaponSwitchCallback?: (slot: number) => void;
  private onBuyMenuCallback?: () => void;
  private onScoreboardCallback?: (visible: boolean) => void;
  private onZoomCallback?: (zoomed: boolean) => void;

  constructor(element: HTMLElement) {
    this.element = element;

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    window.addEventListener('contextmenu', this.onContextMenu);
  }

  public setCallbacks(callbacks: {
    onShoot?: () => void;
    onReload?: () => void;
    onWeaponSwitch?: (slot: number) => void;
    onBuyMenu?: () => void;
    onScoreboard?: (visible: boolean) => void;
    onZoom?: (zoomed: boolean) => void;
  }) {
    this.onShootCallback = callbacks.onShoot;
    this.onReloadCallback = callbacks.onReload;
    this.onWeaponSwitchCallback = callbacks.onWeaponSwitch;
    this.onBuyMenuCallback = callbacks.onBuyMenu;
    this.onScoreboardCallback = callbacks.onScoreboard;
    this.onZoomCallback = callbacks.onZoom;
  }

  public requestLock() {
    this.element.requestPointerLock();
  }

  public releaseLock() {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  private onPointerLockChange = () => {
    this.isLocked = document.pointerLockElement === this.element;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isLocked) return;

    const sens = this.isZoomed ? this.mouseSensitivity * 0.4 : this.mouseSensitivity;
    this.yaw -= e.movementX * sens;
    this.pitch -= e.movementY * sens;

    // Clamp pitch (-89 to 89 degrees)
    const maxPitch = (Math.PI / 2) - 0.05;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
  };

  private onMouseDown = (e: MouseEvent) => {
    if (!this.isLocked) {
      this.requestLock();
      return;
    }

    if (e.button === 0) {
      // Left click: Fire
      this.isShooting = true;
      if (this.onShootCallback) {
        this.onShootCallback();
      }
      this.addRecoil(0.04);
    } else if (e.button === 2) {
      // Right click: Scope zoom toggle
      this.isZoomed = !this.isZoomed;
      if (this.onZoomCallback) {
        this.onZoomCallback(this.isZoomed);
      }
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isShooting = false;
    }
  };

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault(); // Prevent right click menu in-game
  };

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;

    if (e.code === 'KeyR') {
      if (this.onReloadCallback) this.onReloadCallback();
    } else if (e.code === 'KeyB') {
      if (this.onBuyMenuCallback) this.onBuyMenuCallback();
    } else if (e.code === 'Tab') {
      e.preventDefault();
      if (this.onScoreboardCallback) this.onScoreboardCallback(true);
    } else if (e.code === 'Digit1') {
      if (this.onWeaponSwitchCallback) this.onWeaponSwitchCallback(1);
    } else if (e.code === 'Digit2') {
      if (this.onWeaponSwitchCallback) this.onWeaponSwitchCallback(2);
    } else if (e.code === 'Digit3') {
      if (this.onWeaponSwitchCallback) this.onWeaponSwitchCallback(3);
    } else if (e.code === 'Digit4') {
      if (this.onWeaponSwitchCallback) this.onWeaponSwitchCallback(4);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;

    if (e.code === 'Tab') {
      if (this.onScoreboardCallback) this.onScoreboardCallback(false);
    }
  };

  public addRecoil(amount: number) {
    this.pitch += amount * 0.5;
    this.spread = Math.min(0.12, this.spread + amount);
  }

  public update(dt: number): PlayerInput {
    // Crosshair spread recovery
    this.spread = Math.max(0.012, this.spread - dt * 0.25);

    let forward = 0;
    let right = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) forward += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) forward -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) right += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) right -= 1;

    const jump = Boolean(this.keys['Space']);
    const crouch = Boolean(this.keys['ControlLeft'] || this.keys['KeyC']);
    const walk = Boolean(this.keys['ShiftLeft']);

    // Footstep audio trigger when moving on ground
    if ((forward !== 0 || right !== 0) && !crouch) {
      soundManager.playFootstep();
    }

    this.seq += 1;
    return {
      seq: this.seq,
      forward,
      right,
      jump,
      crouch,
      walk,
      yaw: this.yaw,
      pitch: this.pitch,
      shooting: this.isShooting,
      activeWeaponId: '',
    };
  }

  public dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    window.removeEventListener('contextmenu', this.onContextMenu);
  }
}
