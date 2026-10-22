import React, { useRef, useState, useEffect } from 'react';
import { Crosshair, ArrowUp, ArrowDown, RotateCcw, Zap, ShoppingBag, Search } from 'lucide-react';

interface TouchControlsProps {
  onMove: (forward: number, right: number) => void;
  onLook: (deltaX: number, deltaY: number) => void;
  onShoot: (isShooting: boolean) => void;
  onJump: (isJumping: boolean) => void;
  onCrouch: (isCrouching: boolean) => void;
  onInteract: (isInteracting: boolean) => void;
  onReload: () => void;
  onBuyMenu: () => void;
  onZoomToggle: () => void;
  isZoomed: boolean;
  canInteract: boolean;
  interactLabel?: string;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onMove,
  onLook,
  onShoot,
  onJump,
  onCrouch,
  onInteract,
  onReload,
  onBuyMenu,
  onZoomToggle,
  isZoomed,
  canInteract,
  interactLabel,
}) => {
  // Joystick State
  const joystickContainerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [joystickActive, setJoystickActive] = useState<boolean>(false);
  const joystickTouchIdRef = useRef<number | null>(null);

  // Look Area State
  const lookAreaRef = useRef<HTMLDivElement>(null);
  const lookTouchIdRef = useRef<number | null>(null);
  const lastLookPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Joystick touch handlers
  const handleJoystickStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (joystickTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    joystickTouchIdRef.current = touch.identifier;
    setJoystickActive(true);
    updateJoystickPos(touch.clientX, touch.clientY);
  };

  const handleJoystickMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (joystickTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        updateJoystickPos(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleJoystickEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (joystickTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        setJoystickActive(false);
        setKnobPos({ x: 0, y: 0 });
        onMove(0, 0);
        break;
      }
    }
  };

  const updateJoystickPos = (clientX: number, clientY: number) => {
    if (!joystickContainerRef.current) return;
    const rect = joystickContainerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const maxRadius = rect.width / 2 - 15;

    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const clampedDist = Math.min(dist, maxRadius);
    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    setKnobPos({ x: knobX, y: knobY });

    // Normalized outputs: forward (up is -y -> forward positive)
    const normalizedRight = knobX / maxRadius;
    const normalizedForward = -knobY / maxRadius;
    onMove(normalizedForward, normalizedRight);
  };

  // Look Area touch handlers
  const handleLookStart = (e: React.TouchEvent) => {
    if (lookTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    lookTouchIdRef.current = touch.identifier;
    lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleLookMove = (e: React.TouchEvent) => {
    if (lookTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current) {
        const deltaX = touch.clientX - lastLookPosRef.current.x;
        const deltaY = touch.clientY - lastLookPosRef.current.y;
        lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
        onLook(deltaX, deltaY);
        break;
      }
    }
  };

  const handleLookEnd = (e: React.TouchEvent) => {
    if (lookTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
        break;
      }
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-30 select-none overflow-hidden font-mono">
      {/* Right-half Look/Aim Swipe Area */}
      <div
        ref={lookAreaRef}
        onTouchStart={handleLookStart}
        onTouchMove={handleLookMove}
        onTouchEnd={handleLookEnd}
        onTouchCancel={handleLookEnd}
        className="pointer-events-auto absolute top-16 right-0 bottom-24 left-1/2"
      />

      {/* Virtual Joystick (Bottom Left) */}
      <div className="pointer-events-auto absolute bottom-8 left-8">
        <div
          ref={joystickContainerRef}
          onTouchStart={handleJoystickStart}
          onTouchMove={handleJoystickMove}
          onTouchEnd={handleJoystickEnd}
          onTouchCancel={handleJoystickEnd}
          className={`relative h-32 w-32 rounded-full border-2 border-white/20 bg-slate-950/40 backdrop-blur-sm transition-colors ${
            joystickActive ? 'border-amber-400/60 bg-slate-900/60' : ''
          }`}
        >
          {/* Base Cross Guides */}
          <div className="absolute top-1/2 left-2 right-2 h-[1px] -translate-y-1/2 bg-white/10" />
          <div className="absolute top-2 bottom-2 left-1/2 w-[1px] -translate-x-1/2 bg-white/10" />

          {/* Draggable Knob */}
          <div
            className="absolute top-1/2 left-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-400/80 bg-amber-500/80 shadow-lg"
            style={{
              transform: `translate(calc(-50% + ${knobPos.x}px), calc(-50% + ${knobPos.y}px))`,
            }}
          />
        </div>
      </div>

      {/* Action Buttons (Bottom Right) */}
      <div className="pointer-events-auto absolute bottom-8 right-6 flex flex-col items-end gap-3">
        {/* Upper Row: Zoom, Reload, Buy */}
        <div className="flex items-center gap-2">
          {/* Buy Menu Button */}
          <button
            type="button"
            onTouchStart={(e) => { e.stopPropagation(); onBuyMenu(); }}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/50 bg-slate-900/80 text-emerald-400 shadow-lg active:scale-90"
          >
            <ShoppingBag className="h-5 w-5" />
          </button>

          {/* Reload Button */}
          <button
            type="button"
            onTouchStart={(e) => { e.stopPropagation(); onReload(); }}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/50 bg-slate-900/80 text-amber-400 shadow-lg active:scale-90"
          >
            <RotateCcw className="h-5 w-5" />
          </button>

          {/* Sniper Zoom Toggle */}
          <button
            type="button"
            onTouchStart={(e) => { e.stopPropagation(); onZoomToggle(); }}
            className={`flex h-12 w-12 items-center justify-center rounded-full border shadow-lg active:scale-90 ${
              isZoomed ? 'border-yellow-400 bg-yellow-500 text-slate-950 font-bold' : 'border-slate-700 bg-slate-900/80 text-slate-300'
            }`}
          >
            <Search className="h-5 w-5" />
          </button>
        </div>

        {/* Middle Row: Interact / Plant / Defuse */}
        {canInteract && (
          <button
            type="button"
            onTouchStart={(e) => { e.stopPropagation(); onInteract(true); }}
            onTouchEnd={(e) => { e.stopPropagation(); onInteract(false); }}
            onTouchCancel={(e) => { e.stopPropagation(); onInteract(false); }}
            className="flex h-13 px-4 items-center gap-2 rounded-full border-2 border-amber-400 bg-amber-500 text-slate-950 font-black shadow-xl active:scale-95 animate-pulse"
          >
            <Zap className="h-5 w-5 fill-slate-950" />
            <span className="text-xs uppercase">{interactLabel || 'Interagir [E]'}</span>
          </button>
        )}

        {/* Lower Row: Jump, Crouch, and BIG Fire Button */}
        <div className="flex items-center gap-3">
          {/* Crouch Button */}
          <button
            type="button"
            onTouchStart={(e) => { e.stopPropagation(); onCrouch(true); }}
            onTouchEnd={(e) => { e.stopPropagation(); onCrouch(false); }}
            onTouchCancel={(e) => { e.stopPropagation(); onCrouch(false); }}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-600 bg-slate-900/80 text-white shadow-lg active:bg-slate-700"
          >
            <ArrowDown className="h-6 w-6" />
          </button>

          {/* Jump Button */}
          <button
            type="button"
            onTouchStart={(e) => { e.stopPropagation(); onJump(true); }}
            onTouchEnd={(e) => { e.stopPropagation(); onJump(false); }}
            onTouchCancel={(e) => { e.stopPropagation(); onJump(false); }}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-600 bg-slate-900/80 text-white shadow-lg active:bg-slate-700"
          >
            <ArrowUp className="h-6 w-6" />
          </button>

          {/* BIG Fire Button */}
          <button
            type="button"
            onTouchStart={(e) => { e.stopPropagation(); onShoot(true); }}
            onTouchEnd={(e) => { e.stopPropagation(); onShoot(false); }}
            onTouchCancel={(e) => { e.stopPropagation(); onShoot(false); }}
            className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-red-500/80 bg-red-600/90 text-white shadow-2xl active:scale-90 active:bg-red-700"
          >
            <Crosshair className="h-10 w-10 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
