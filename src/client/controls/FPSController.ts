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
  public isShooting: boolean = false;

  // Active weapon stats for firing cadence
  private activeWeaponFireRate: number = 6.0;
  private isActiveWeaponAutomatic: boolean = false;
  private timeSinceLastShot: number = 999;

  // Touch control inputs
  private touchMove = { forward: 0, right: 0 };
  private touchShooting: boolean = false;
  private touchJump: boolean = false;
  private touchCrouch: boolean = false;
  private touchInteract: boolean = false;

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
    window.addEventListener('blur', this.onBlur);
  }

  public setActiveWeapon(weapon: { fireRate?: number; isAutomatic?: boolean }) {
    if (weapon.fireRate) {
      this.activeWeaponFireRate = weapon.fireRate;
    }
    this.isActiveWeaponAutomatic = Boolean(weapon.isAutomatic);
  }

  public resetZoom() {
    if (this.isZoomed) {
      this.isZoomed = false;
      if (this.onZoomCallback) {
        this.onZoomCallback(false);
      }
    }
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

  public setTouchMovement(forward: number, right: number) {
    this.touchMove.forward = forward;
    this.touchMove.right = right;
  }

  public addTouchLook(deltaYaw: number, deltaPitch: number) {
    const sens = this.isZoomed ? this.mouseSensitivity * 0.4 : this.mouseSensitivity;
    this.yaw -= deltaYaw * sens * 3.5;
    this.pitch -= deltaPitch * sens * 3.5;
    const maxPitch = (Math.PI / 2) - 0.05;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
  }

  public setTouchShooting(shooting: boolean) {
    this.touchShooting = shooting;
    if (shooting && !this.isShooting) {
      this.triggerShot();
    }
    this.isShooting = shooting;
  }

  public setTouchJump(jump: boolean) {
    this.touchJump = jump;
  }

  public setTouchCrouch(crouch: boolean) {
    this.touchCrouch = crouch;
  }

  public setTouchInteract(interact: boolean) {
    this.touchInteract = interact;
  }

  public requestLock() {
    this.element.requestPointerLock();
  }

  public releaseLock() {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  private onBlur = () => {
    this.keys = {};
    this.isShooting = false;
    this.touchShooting = false;
  };

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

  private triggerShot() {
    if (this.onShootCallback) {
      this.onShootCallback();
    }
    this.timeSinceLastShot = 0;
    this.addRecoil(0.035);
  }

  private onMouseDown = (e: MouseEvent) => {
    if (!this.isLocked) {
      this.requestLock();
      return;
    }

    if (e.button === 0) {
      // Left click: Fire
      this.isShooting = true;
      this.triggerShot();
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
    // If typing in an input element or textarea, don't capture game keys
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      return;
    }

    if (e.code) this.keys[e.code] = true;
    if (e.key) {
      this.keys[e.key] = true;
      this.keys[e.key.toLowerCase()] = true;
      this.keys[e.key.toUpperCase()] = true;
    }

    const keyLower = e.key ? e.key.toLowerCase() : '';

    if (e.code === 'KeyR' || keyLower === 'r') {
      if (this.onReloadCallback) this.onReloadCallback();
    } else if (e.code === 'KeyB' || keyLower === 'b') {
      if (this.onBuyMenuCallback) this.onBuyMenuCallback();
    } else if (e.code === 'Tab' || keyLower === 'tab') {
      e.preventDefault();
      if (this.onScoreboardCallback) this.onScoreboardCallback(true);
    } else if (e.code === 'Digit1' || e.key === '1') {
      if (this.onWeaponSwitchCallback) this.onWeaponSwitchCallback(1);
    } else if (e.code === 'Digit2' || e.key === '2') {
      if (this.onWeaponSwitchCallback) this.onWeaponSwitchCallback(2);
    } else if (e.code === 'Digit3' || e.key === '3') {
      if (this.onWeaponSwitchCallback) this.onWeaponSwitchCallback(3);
    } else if (e.code === 'Digit4' || e.key === '4') {
      if (this.onWeaponSwitchCallback) this.onWeaponSwitchCallback(4);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (e.code) this.keys[e.code] = false;
    if (e.key) {
      this.keys[e.key] = false;
      this.keys[e.key.toLowerCase()] = false;
      this.keys[e.key.toUpperCase()] = false;
    }

    if (e.code === 'Tab' || e.key === 'Tab') {
      if (this.onScoreboardCallback) this.onScoreboardCallback(false);
    }
  };

  public addRecoil(amount: number) {
    this.pitch += amount * 0.4;
    this.spread = Math.min(0.12, this.spread + amount);
  }

  public update(dt: number): PlayerInput {
    // Crosshair spread recovery
    this.spread = Math.max(0.012, this.spread - dt * 0.25);
    this.timeSinceLastShot += dt;

    // Automatic weapon cadence loop while mouse / touch button is held
    const shootingActive = this.isShooting || this.touchShooting;
    if (shootingActive && this.isActiveWeaponAutomatic) {
      const minInterval = 1 / Math.max(0.1, this.activeWeaponFireRate);
      if (this.timeSinceLastShot >= minInterval) {
        this.triggerShot();
      }
    }

    let forward = this.touchMove.forward;
    let right = this.touchMove.right;

    const isPressed = (aliases: string[]) => aliases.some((a) => Boolean(this.keys[a]));

    // Forward: W, ArrowUp, Z (AZERTY)
    if (isPressed(['KeyW', 'w', 'W', 'ArrowUp', 'KeyZ', 'z', 'Z'])) forward += 1;
    // Backward: S, ArrowDown
    if (isPressed(['KeyS', 's', 'S', 'ArrowDown'])) forward -= 1;
    // Right: D, ArrowRight
    if (isPressed(['KeyD', 'd', 'D', 'ArrowRight'])) right += 1;
    // Left: A, ArrowLeft, Q (AZERTY)
    if (isPressed(['KeyA', 'a', 'A', 'ArrowLeft', 'KeyQ', 'q', 'Q'])) right -= 1;

    const jump = isPressed(['Space', ' ']) || this.touchJump;
    const crouch = isPressed(['ControlLeft', 'ControlRight', 'KeyC', 'c', 'C']) || this.touchCrouch;
    const walk = isPressed(['ShiftLeft', 'ShiftRight']);
    const interact = isPressed(['KeyE', 'e', 'E']) || this.touchInteract;

    // Footstep audio trigger when moving on ground
    if ((forward !== 0 || right !== 0) && !crouch) {
      soundManager.playFootstep();
    }

    this.seq += 1;
    return {
      seq: this.seq,
      forward: Math.max(-1, Math.min(1, forward)),
      right: Math.max(-1, Math.min(1, right)),
      jump,
      crouch,
      walk,
      interact,
      yaw: this.yaw,
      pitch: this.pitch,
      shooting: shootingActive,
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
    window.removeEventListener('blur', this.onBlur);
  }
}
