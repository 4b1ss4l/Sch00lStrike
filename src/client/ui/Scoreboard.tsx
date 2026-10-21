import React from 'react';
import { ServerGameState, Team } from '../../types/game';

interface ScoreboardProps {
  serverState?: ServerGameState;
  localPlayerId?: string;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({ serverState, localPlayerId }) => {
  if (!serverState) return null;

  const inspectors = Object.values(serverState.players).filter((p) => p.team === 'INSPECTORS');
  const rebels = Object.values(serverState.players).filter((p) => p.team === 'REBELS');

  const renderTeamTable = (team: Team, teamName: string, players: typeof inspectors, score: number) => {
    const isCT = team === 'INSPECTORS';
    return (
      <div className="flex-1 rounded-xl border border-slate-700/80 bg-slate-950/90 shadow-xl overflow-hidden flex flex-col">
        {/* Team Banner */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-b ${
            isCT
              ? 'border-blue-500/40 bg-gradient-to-r from-blue-950/80 to-slate-950 text-blue-400'
              : 'border-red-500/40 bg-gradient-to-r from-red-950/80 to-slate-950 text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-black uppercase tracking-wider">{teamName}</span>
            <span className="rounded bg-black/40 px-2 py-0.5 text-xs text-slate-300">
              {players.length} {players.length === 1 ? 'estudante' : 'estudantes'}
            </span>
          </div>
          <span className="text-3xl font-black text-white tabular-nums">{score}</span>
        </div>

        {/* Players List Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-4 font-semibold">Jogador</th>
                <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                <th className="py-2.5 px-3 font-semibold text-center">Kills</th>
                <th className="py-2.5 px-3 font-semibold text-center">Mortes</th>
                <th className="py-2.5 px-3 font-semibold text-center">Dinheiro</th>
                <th className="py-2.5 px-4 font-semibold text-right">Ping</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {players.map((p) => {
                const isLocal = p.id === localPlayerId;
                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      isLocal ? 'bg-amber-500/10 text-white font-bold' : 'text-slate-300 hover:bg-slate-900/60'
                    }`}
                  >
                    <td className="py-2.5 px-4 flex items-center gap-2">
                      <span className={isLocal ? 'text-amber-400' : 'text-slate-200'}>{p.name}</span>
                      {p.isBot && <span className="text-[10px] text-slate-500">[BOT]</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {p.isAlive ? (
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">
                          VIVO
                        </span>
                      ) : (
                        <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] text-red-400">
                          MORTO
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center tabular-nums text-white">{p.kills}</td>
                    <td className="py-2.5 px-3 text-center tabular-nums text-slate-400">{p.deaths}</td>
                    <td className="py-2.5 px-3 text-center tabular-nums text-emerald-400">${p.money}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">
                      <span className={p.ping < 30 ? 'text-emerald-400' : p.ping < 80 ? 'text-amber-400' : 'text-red-400'}>
                        {p.ping}ms
                      </span>
                    </td>
                  </tr>
                );
              })}
              {players.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Nenhum jogador nesta equipe.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6 font-mono select-none pointer-events-none">
      <div className="flex h-[520px] w-full max-w-5xl flex-col rounded-2xl border border-slate-700 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-none">
        {/* Header with Server & Map Info */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div>
            <h1 className="text-xl font-black text-white tracking-wider uppercase">SCHOOL STRIKE · PLACAR DA PARTIDA</h1>
            <p className="text-xs text-slate-400">
              Mapa: <span className="font-semibold text-amber-400">{serverState.mapName}</span> · Round {serverState.roundNumber} / {serverState.maxRounds}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Servidor Local LAN</span>
            <div className="text-sm font-bold text-emerald-400">30 Ticks / seg</div>
          </div>
        </div>

        {/* Both Teams Tables */}
        <div className="flex flex-1 gap-5 overflow-hidden">
          {renderTeamTable('INSPECTORS', 'Inspetores Escolares (Defesa)', inspectors, serverState.inspectorsScore)}
          {renderTeamTable('REBELS', 'Rebeldes do Recreio (Ataque)', rebels, serverState.rebelsScore)}
        </div>

        {/* Footer tip */}
        <div className="mt-4 pt-3 border-t border-slate-800 text-center text-xs text-slate-500">
          Solte a tecla [TAB] para fechar o placar e retornar à mira.
        </div>
      </div>
    </div>
  );
};
