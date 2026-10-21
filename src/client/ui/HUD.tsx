import React from 'react';
import { PlayerState, ServerGameState, KillfeedEntry } from '../../types/game';
import { WEAPONS } from '../../shared/weapons';
import { Shield, Heart, DollarSign, Crosshair, Bell, Users } from 'lucide-react';

interface HUDProps {
  localPlayer?: PlayerState;
  serverState?: ServerGameState;
  killfeed: KillfeedEntry[];
  spread: number;
  isZoomed: boolean;
  flashOpacity: number;
  serverMessage?: { text: string; type: 'info' | 'warning' | 'round' } | null;
}

export const HUD: React.FC<HUDProps> = ({
  localPlayer,
  serverState,
  killfeed,
  spread,
  isZoomed,
  flashOpacity,
  serverMessage,
}) => {
  if (!localPlayer) return null;

  const activeWeapon = WEAPONS[localPlayer.activeWeaponId] || WEAPONS['highlighter_pistol'];
  const isDead = !localPlayer.isAlive;

  // Format timer
  const timer = serverState?.timer ?? 0;
  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;
  const formattedTimer = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Crosshair gap calculation based on dynamic spread
  const gap = Math.min(36, Math.max(8, Math.round(spread * 320)));

  return (
    <div className="pointer-events-none fixed inset-0 z-20 select-none overflow-hidden font-mono">
      {/* Flashbang Whiteout Overlay */}
      {flashOpacity > 0 && (
        <div
          className="pointer-events-none absolute inset-0 bg-white transition-opacity duration-75"
          style={{ opacity: flashOpacity }}
        />
      )}

      {/* Sniper Scope Overlay (Telescopic Ruler AWP Zoom) */}
      {isZoomed && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {/* Black outer mask */}
          <div className="absolute inset-0 bg-black/90" />
          {/* Circular clear aperture */}
          <div
            className="relative h-[min(80vh,80vw)] w-[min(80vh,80vw)] rounded-full border-4 border-yellow-500/60 shadow-[0_0_120px_rgba(0,0,0,0.95)_inset]"
            style={{
              background: 'radial-gradient(circle, rgba(56,189,248,0.05) 0%, rgba(0,0,0,0.85) 95%)',
            }}
          >
            {/* Fine Reticle Lines */}
            <div className="absolute top-0 bottom-0 left-1/2 w-[1px] -translate-x-1/2 bg-yellow-400/80" />
            <div className="absolute top-1/2 right-0 left-0 h-[1px] -translate-y-1/2 bg-yellow-400/80" />
            {/* Mil-dot ticks */}
            {[-60, -30, 30, 60].map((offset) => (
              <React.Fragment key={offset}>
                <div
                  className="absolute top-1/2 h-2 w-[1px] bg-yellow-300"
                  style={{ left: `calc(50% + ${offset}px)`, transform: 'translateY(-50%)' }}
                />
                <div
                  className="absolute left-1/2 h-[1px] w-2 bg-yellow-300"
                  style={{ top: `calc(50% + ${offset}px)`, transform: 'translateX(-50%)' }}
                />
              </React.Fragment>
            ))}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded bg-black/80 px-2 py-0.5 text-xs text-yellow-300">
              RÉGUA TELESCÓPICA · 4x LUNETA
            </div>
          </div>
        </div>
      )}

      {/* Center Dynamic Crosshair (hidden during sniper zoom) */}
      {!isZoomed && !isDead && (
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          {/* Center tiny dot */}
          <div className="absolute top-1/2 left-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400" />
          {/* Top bar */}
          <div
            className="absolute left-1/2 w-[2px] -translate-x-1/2 bg-emerald-400 shadow-[0_0_4px_rgba(0,0,0,0.8)]"
            style={{ bottom: `${gap}px`, height: '8px' }}
          />
          {/* Bottom bar */}
          <div
            className="absolute left-1/2 w-[2px] -translate-x-1/2 bg-emerald-400 shadow-[0_0_4px_rgba(0,0,0,0.8)]"
            style={{ top: `${gap}px`, height: '8px' }}
          />
          {/* Left bar */}
          <div
            className="absolute top-1/2 h-[2px] -translate-y-1/2 bg-emerald-400 shadow-[0_0_4px_rgba(0,0,0,0.8)]"
            style={{ right: `${gap}px`, width: '8px' }}
          />
          {/* Right bar */}
          <div
            className="absolute top-1/2 h-[2px] -translate-y-1/2 bg-emerald-400 shadow-[0_0_4px_rgba(0,0,0,0.8)]"
            style={{ left: `${gap}px`, width: '8px' }}
          />
        </div>
      )}

      {/* TOP HEADER: Match Score, Round Timer & Phase */}
      <div className="absolute top-4 left-1/2 flex -translate-x-1/2 items-center gap-3">
        {/* Inspectors Team Score */}
        <div className="flex items-center gap-2 rounded-l-md border border-blue-500/40 bg-slate-900/90 px-4 py-2 text-blue-400 shadow-lg">
          <span className="text-xs tracking-wider uppercase">Inspetores</span>
          <span className="text-2xl font-black text-white">{serverState?.inspectorsScore ?? 0}</span>
        </div>

        {/* Center Timer & Round Info */}
        <div className="flex flex-col items-center justify-center rounded-md border border-slate-700 bg-slate-950/95 px-5 py-1.5 shadow-xl">
          <span className="text-xs tracking-widest text-slate-400 uppercase">
            {serverState?.phase === 'BUY_PHASE'
              ? 'FASE DE COMPRA [B]'
              : serverState?.phase === 'ROUND_ACTIVE'
              ? `ROUND ${serverState.roundNumber} / ${serverState.maxRounds}`
              : serverState?.phase || 'AQUECIMENTO'}
          </span>
          <span
            className={`text-2xl font-bold tabular-nums ${
              timer <= 10 && serverState?.phase === 'ROUND_ACTIVE' ? 'animate-pulse text-red-500' : 'text-amber-400'
            }`}
          >
            {formattedTimer}
          </span>
        </div>

        {/* Rebels Team Score */}
        <div className="flex items-center gap-2 rounded-r-md border border-red-500/40 bg-slate-900/90 px-4 py-2 text-red-400 shadow-lg">
          <span className="text-2xl font-black text-white">{serverState?.rebelsScore ?? 0}</span>
          <span className="text-xs tracking-wider uppercase">Rebeldes</span>
        </div>
      </div>

      {/* KILLFEED (Top Right) */}
      <div className="absolute top-4 right-4 flex max-w-sm flex-col gap-1.5">
        {killfeed.slice(-5).map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-900/90 px-2.5 py-1 text-xs text-white shadow"
          >
            <span className={entry.killerTeam === 'INSPECTORS' ? 'font-bold text-blue-400' : 'font-bold text-red-400'}>
              {entry.killerName}
            </span>
            <span className="text-slate-400">[{WEAPONS[entry.weaponId]?.portugueseName || entry.weaponId}]</span>
            {entry.isHeadshot && <span className="font-bold text-amber-400">⚡HS</span>}
            <span className="text-slate-500">→</span>
            <span className={entry.victimTeam === 'INSPECTORS' ? 'font-bold text-blue-400' : 'font-bold text-red-400'}>
              {entry.victimName}
            </span>
          </div>
        ))}
      </div>

      {/* SERVER MESSAGE NOTIFICATION BANNER (Center) */}
      {serverMessage && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 rounded-lg border border-amber-500/50 bg-slate-950/95 px-6 py-2 text-center text-sm font-semibold tracking-wide text-amber-300 shadow-2xl">
          {serverMessage.text}
        </div>
      )}

      {/* ELIMINATED / SPECTATING OVERLAY */}
      {isDead && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 text-center">
          <div className="rounded-lg border border-red-700/80 bg-red-950/90 px-8 py-4 shadow-2xl">
            <h2 className="text-2xl font-black tracking-wider text-red-400 uppercase">Eliminado do Round</h2>
            <p className="mt-1 text-sm text-slate-300">Aguardando o próximo intervalo escolar...</p>
          </div>
        </div>
      )}

      {/* BOTTOM LEFT: Health, Armor & Team */}
      <div className="absolute bottom-5 left-5 flex items-end gap-3">
        {/* Health box */}
        <div className="flex items-center gap-2.5 rounded-lg border border-slate-700 bg-slate-950/90 px-4 py-2.5 text-white shadow-xl backdrop-blur-none">
          <Heart className="h-6 w-6 text-red-500" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase">Vida Escolar</span>
            <span className={`text-2xl font-black tabular-nums ${localPlayer.health <= 25 ? 'animate-pulse text-red-500' : 'text-emerald-400'}`}>
              {localPlayer.health}
            </span>
          </div>
        </div>

        {/* Armor box */}
        <div className="flex items-center gap-2.5 rounded-lg border border-slate-700 bg-slate-950/90 px-4 py-2.5 text-white shadow-xl">
          <Shield className="h-6 w-6 text-sky-400" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase">Colete / Proteção</span>
            <span className="text-2xl font-black text-sky-300 tabular-nums">{localPlayer.armor}</span>
          </div>
        </div>

        {/* Team tag */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs">
          <span className="text-slate-400">Equipe: </span>
          <span className={localPlayer.team === 'INSPECTORS' ? 'font-bold text-blue-400' : 'font-bold text-red-400'}>
            {localPlayer.team === 'INSPECTORS' ? 'Inspetores' : 'Rebeldes do Recreio'}
          </span>
        </div>
      </div>

      {/* BOTTOM RIGHT: Active Weapon & Ammo */}
      <div className="absolute right-5 bottom-5 flex items-end gap-3">
        {/* Money Counter */}
        <div className="flex items-center gap-1.5 rounded-lg border border-emerald-600/50 bg-slate-950/90 px-4 py-2.5 text-emerald-400 shadow-xl">
          <DollarSign className="h-6 w-6" />
          <span className="text-2xl font-black tracking-tight tabular-nums">${localPlayer.money}</span>
        </div>

        {/* Ammo Box */}
        <div className="flex flex-col items-end rounded-lg border border-slate-700 bg-slate-950/90 px-5 py-2 text-white shadow-xl">
          <div className="text-[10px] font-semibold text-amber-400 uppercase">{activeWeapon.portugueseName}</div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-white tabular-nums">{localPlayer.ammoInClip}</span>
            <span className="text-sm text-slate-400">/</span>
            <span className="text-lg font-bold text-slate-400 tabular-nums">{localPlayer.reserveAmmo}</span>
          </div>
          {localPlayer.isReloading && (
            <span className="text-[10px] font-bold tracking-wider text-amber-400 uppercase">Recarregando...</span>
          )}
        </div>
      </div>

      {/* BOTTOM CENTER: Quick Controls Bar */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-slate-950/80 px-3 py-1 text-[11px] text-slate-400">
        <span className="text-white">[W,A,S,D]</span> Mover · <span className="text-white">[Espaço]</span> Pulo ·{' '}
        <span className="text-white">[B]</span> Loja · <span className="text-white">[R]</span> Recarregar ·{' '}
        <span className="text-white">[Tab]</span> Placar · <span className="text-white">[1, 2, 3]</span> Armas
      </div>
    </div>
  );
};
