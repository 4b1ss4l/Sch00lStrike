import React, { useState, useEffect } from 'react';
import { Team } from '../../types/game';
import { Shield, Flame, Users, Wrench, Settings, Play, Wifi, Volume2 } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';

interface MainMenuProps {
  onJoinGame: (playerName: string, team: Team) => void;
  onSoloPractice: (playerName: string, team: Team) => void;
  onOpenEditor: () => void;
  onOpenSettings: () => void;
  initialPlayerName: string;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onJoinGame,
  onSoloPractice,
  onOpenEditor,
  onOpenSettings,
  initialPlayerName,
}) => {
  const [playerName, setPlayerName] = useState(initialPlayerName);
  const [selectedTeam, setSelectedTeam] = useState<Team>('INSPECTORS');
  const [lanInfo, setLanInfo] = useState<{ port: number; lanIps: string[]; mapName: string; playerCount: number } | null>(null);

  useEffect(() => {
    fetch('/api/lan-info')
      .then((res) => res.json())
      .then((data) => setLanInfo(data))
      .catch(() => {});
  }, []);

  const handleStart = (mode: 'lan' | 'solo') => {
    soundManager.playSchoolBell();
    const finalName = playerName.trim() || 'Estudante';
    if (mode === 'solo') {
      onSoloPractice(finalName, selectedTeam);
    } else {
      onJoinGame(finalName, selectedTeam);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-slate-950 p-6 font-mono text-white select-none overflow-y-auto">
      {/* Background Decor */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 30%, #3b82f6 0%, transparent 60%)',
        }}
      />

      {/* TOP BAR: Server LAN status */}
      <div className="relative z-10 flex w-full max-w-5xl items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-6 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          <Wifi className="h-5 w-5 text-emerald-400" />
          <div className="text-xs">
            <span className="text-slate-400">STATUS DO SERVIDOR: </span>
            <span className="font-bold text-emerald-400">ONLINE NA REDE LOCAL (LAN)</span>
          </div>
        </div>

        {lanInfo && lanInfo.lanIps.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">CONECTAR OUTROS PCs:</span>
            <span className="rounded bg-black/60 px-2 py-1 font-bold text-amber-300">
              http://{lanInfo.lanIps[0]}:{lanInfo.port}
            </span>
          </div>
        )}
      </div>

      {/* CENTER: Game Logo & Team Selector */}
      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center text-center my-auto py-8">
        {/* Bespoke School Strike SVG Title Emblem */}
        <div className="flex items-center gap-4 mb-2">
          <svg className="h-16 w-16 text-amber-400" viewBox="0 0 64 64" fill="currentColor">
            <polygon points="32,4 60,18 60,46 32,60 4,46 4,18" fill="#1e293b" stroke="#eab308" strokeWidth="3" />
            <path d="M20,32 L44,32 M32,20 L32,44" stroke="#eab308" strokeWidth="4" strokeLinecap="round" />
            <circle cx="32" cy="32" r="14" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 2" />
          </svg>
          <div className="text-left">
            <h1 className="text-4xl sm:text-5xl font-black tracking-widest text-white uppercase drop-shadow-md">
              SCHOOL <span className="text-amber-400">STRIKE</span>
            </h1>
            <p className="text-xs tracking-widest text-slate-400 uppercase">
              FPS Multiplayer Escolar Competitivo · Estilo CS 1.6
            </p>
          </div>
        </div>

        {/* Player Name Input */}
        <div className="mt-6 flex flex-col items-center gap-1.5 w-full max-w-xs">
          <label className="text-xs text-slate-400 uppercase">Seu Nome / Crachá</label>
          <input
            type="text"
            maxLength={18}
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-center text-sm font-bold text-white focus:border-amber-400 focus:outline-none"
            placeholder="Digite seu nome..."
          />
        </div>

        {/* Team Selection Cards */}
        <div className="mt-8 grid w-full grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
          {/* Team A: Inspectors */}
          <button
            type="button"
            onClick={() => setSelectedTeam('INSPECTORS')}
            className={`flex flex-col items-center rounded-2xl border p-6 transition-all text-left ${
              selectedTeam === 'INSPECTORS'
                ? 'border-blue-500 bg-blue-950/70 shadow-[0_0_25px_rgba(59,130,246,0.3)] ring-2 ring-blue-400'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            <Shield className="h-10 w-10 text-blue-400 mb-3" />
            <h3 className="text-lg font-black text-blue-300 uppercase tracking-wide">INSPETORES ESCOLARES</h3>
            <span className="text-xs text-blue-400/80 mb-2 font-semibold">Equipe de Defesa (CTs)</span>
            <p className="text-xs text-slate-300 text-center leading-relaxed">
              Monitores de uniforme azul e crachá. Devem proteger a Biblioteca e o Ginásio contra vandalismo e manter a ordem escolar.
            </p>
          </button>

          {/* Team B: Rebels */}
          <button
            type="button"
            onClick={() => setSelectedTeam('REBELS')}
            className={`flex flex-col items-center rounded-2xl border p-6 transition-all text-left ${
              selectedTeam === 'REBELS'
                ? 'border-red-500 bg-red-950/70 shadow-[0_0_25px_rgba(239,68,68,0.3)] ring-2 ring-red-400'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            <Flame className="h-10 w-10 text-red-400 mb-3" />
            <h3 className="text-lg font-black text-red-300 uppercase tracking-wide">REBELDES DO RECREIO</h3>
            <span className="text-xs text-red-400/80 mb-2 font-semibold">Equipe de Ataque (TRs)</span>
            <p className="text-xs text-slate-300 text-center leading-relaxed">
              Estudantes insurgentes com mochilas estilizadas. Devem avançar pelos corredores e tomar os pontos principais do colégio.
            </p>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            data-start="true"
            onClick={() => handleStart('lan')}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-8 py-3.5 text-base font-black text-slate-950 shadow-xl transition-all hover:bg-amber-400 hover:scale-105 active:scale-95"
          >
            <Play className="h-5 w-5 fill-current" />
            <span>JOGAR NA LAN (MULTIPLAYER)</span>
          </button>

          <button
            onClick={() => handleStart('solo')}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-slate-700 active:scale-95"
          >
            <Users className="h-5 w-5 text-emerald-400" />
            <span>TREINO SOLO (COM BOTS)</span>
          </button>

          <button
            onClick={onOpenEditor}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-slate-700 active:scale-95"
          >
            <Wrench className="h-5 w-5 text-blue-400" />
            <span>EDITOR DE MAPAS 3D</span>
          </button>
        </div>
      </div>

      {/* FOOTER: Controls Summary */}
      <div className="relative z-10 flex w-full max-w-5xl items-center justify-between border-t border-slate-800/80 pt-4 text-xs text-slate-500">
        <div>Controles: WASD mover · Espaço pular · Ctrl agachar · Mouse mira/tiro · B menu de compra · R recarregar · Tab placar</div>
        <div>School Strike v1.0.0 · Motor Three.js & WebSocket</div>
      </div>
    </div>
  );
};
