import React, { useState } from 'react';
import { WEAPONS } from '../../shared/weapons';
import { WeaponCategory } from '../../types/game';
import { X, DollarSign, Shield, Zap, Crosshair } from 'lucide-react';

interface BuyMenuProps {
  playerMoney: number;
  onBuyItem: (itemId: string) => void;
  onClose: () => void;
}

export const BuyMenu: React.FC<BuyMenuProps> = ({ playerMoney, onBuyItem, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<WeaponCategory | 'EQUIPMENT'>('RIFLE');

  const categories = [
    { id: 'PISTOL', label: '1. Pistolas Escolares' },
    { id: 'RIFLE', label: '2. Rifles Automáticos' },
    { id: 'SNIPER', label: '3. Precisão / Snipers' },
    { id: 'SHOTGUN', label: '4. Espingardas' },
    { id: 'GRENADE', label: '5. Granadas & Estojos' },
    { id: 'EQUIPMENT', label: '6. Coletes & Defesa' },
  ];

  const filteredWeapons = Object.values(WEAPONS).filter((w) => {
    if (selectedCategory === 'PISTOL') return w.category === 'PISTOL' || w.category === 'HEAVY_PISTOL';
    return w.category === selectedCategory;
  });

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4 font-mono select-none pointer-events-auto"
    >
      <div className="relative z-50 flex h-[560px] w-full max-w-4xl flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400 uppercase tracking-widest">
              Cantina & Armaria Escolar
            </span>
            <h2 className="text-xl font-black text-white tracking-wide">COMPRA DE EQUIPAMENTOS</h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-1 text-emerald-400">
              <DollarSign className="h-5 w-5" />
              <span className="text-xl font-bold tabular-nums">${playerMoney}</span>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Categories Sidebar */}
          <div className="w-64 border-r border-slate-800 bg-slate-950/60 p-4 flex flex-col gap-2">
            <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase px-2 mb-1">
              Categorias
            </span>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as WeaponCategory | 'EQUIPMENT')}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Right Items Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedCategory === 'EQUIPMENT' ? (
              <div className="grid grid-cols-2 gap-4">
                {/* School Vest */}
                <div className="flex flex-col justify-between rounded-xl border border-slate-700 bg-slate-950/80 p-5 shadow-lg">
                  <div>
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-bold text-white">Colete Escolar Reforçado</h3>
                      <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-sm font-bold text-emerald-400">
                        $650
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      Colete sob medida com placas almofadadas. Reduz o dano de tiros e bolinhas em 40%.
                    </p>
                  </div>
                  <button
                    disabled={playerMoney < 650}
                    onClick={() => onBuyItem('armor_vest')}
                    className="mt-4 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                  >
                    {playerMoney >= 650 ? 'Comprar Colete ($650)' : 'Saldo Insuficiente'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredWeapons.map((w) => {
                  const canAfford = playerMoney >= w.price;
                  return (
                    <div
                      key={w.id}
                      className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/80 p-5 shadow-lg hover:border-slate-700"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-base font-bold text-white">{w.portugueseName}</h3>
                            <span className="text-xs text-slate-400">{w.name}</span>
                          </div>
                          <span
                            className={`rounded px-2.5 py-1 text-sm font-bold ${
                              canAfford
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            ${w.price}
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-slate-400">{w.description}</p>

                        {/* Weapon Stat Bars */}
                        <div className="mt-4 space-y-2 text-xs">
                          <div>
                            <div className="flex justify-between text-[11px] text-slate-400">
                              <span>Dano</span>
                              <span className="font-bold text-white">{w.damage}</span>
                            </div>
                            <div className="mt-0.5 h-1.5 w-full rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full bg-red-500"
                                style={{ width: `${Math.min(100, (w.damage / 115) * 100)}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] text-slate-400">
                              <span>Cadência de Tiro</span>
                              <span className="font-bold text-white">{w.fireRate}/s</span>
                            </div>
                            <div className="mt-0.5 h-1.5 w-full rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full bg-blue-500"
                                style={{ width: `${Math.min(100, (w.fireRate / 12) * 100)}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] text-slate-400">
                              <span>Pente / Reserva</span>
                              <span className="font-bold text-white">
                                {w.magazineSize} / {w.reserveAmmo}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        disabled={!canAfford}
                        onClick={() => onBuyItem(w.id)}
                        className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                      >
                        {canAfford ? `Comprar (${w.price === 0 ? 'Grátis' : '$' + w.price})` : 'Saldo Insuficiente'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="border-t border-slate-800 bg-slate-950 px-6 py-3 text-xs text-slate-400 flex justify-between items-center">
          <span>Pressione [ESC] ou [B] para voltar ao combate.</span>
          <span className="text-amber-400">Itens comprados são adicionados ao seu inventário imediatamente.</span>
        </div>
      </div>
    </div>
  );
};
