import React from 'react';
import { X, Volume2, MousePointer, Crosshair, Smartphone, Check } from 'lucide-react';
import { soundManager } from '../audio/SoundManager';

export interface GameSettings {
  mouseSensitivity: number; // e.g. 0.0022
  masterVolume: number; // 0 to 1
  crosshairColor: string; // hex
  crosshairSize: 'small' | 'medium' | 'large';
  touchControlsMode: 'auto' | 'always' | 'never';
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const crosshairColors = [
    { name: 'Verde Neon', hex: '#34d399' },
    { name: 'Ciano', hex: '#38bdf8' },
    { name: 'Amarelo', hex: '#facc15' },
    { name: 'Vermelho', hex: '#f87171' },
    { name: 'Branco', hex: '#ffffff' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono select-none">
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] flex flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <Crosshair className="h-5 w-5" />
            <h2 className="text-lg tracking-wider uppercase">Configurações Táticas</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-6 p-6">
          {/* Mouse Sensitivity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-300 font-medium">
                <MousePointer className="h-4 w-4 text-amber-400" /> Sensibilidade do Mouse
              </span>
              <span className="font-bold text-amber-400">
                {(settings.mouseSensitivity * 1000).toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.0008"
              max="0.006"
              step="0.0002"
              value={settings.mouseSensitivity}
              onChange={(e) => onUpdateSettings({ mouseSensitivity: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Baixa (Precisão)</span>
              <span>Padrão (2.2)</span>
              <span>Alta (Agilidade)</span>
            </div>
          </div>

          {/* Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-300 font-medium">
                <Volume2 className="h-4 w-4 text-emerald-400" /> Volume Geral dos Efeitos
              </span>
              <span className="font-bold text-emerald-400">
                {Math.round(settings.masterVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.masterVolume}
              onChange={(e) => {
                const vol = parseFloat(e.target.value);
                soundManager.setVolume(vol);
                onUpdateSettings({ masterVolume: vol });
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => soundManager.playShoot('highlighter_pistol')}
                className="rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700"
              >
                Testar Tiro
              </button>
              <button
                type="button"
                onClick={() => soundManager.playSchoolBell()}
                className="rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700"
              >
                Testar Sinal Escolar
              </button>
            </div>
          </div>

          {/* Crosshair Customization */}
          <div className="space-y-3">
            <span className="flex items-center gap-2 text-sm text-slate-300 font-medium">
              <Crosshair className="h-4 w-4 text-sky-400" /> Cor e Estilo da Mira
            </span>
            <div className="flex items-center gap-3">
              {crosshairColors.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => onUpdateSettings({ crosshairColor: c.hex })}
                  className={`h-8 w-8 rounded-full border-2 transition flex items-center justify-center ${
                    settings.crosshairColor === c.hex ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                >
                  {settings.crosshairColor === c.hex && (
                    <Check className="h-4 w-4 text-slate-950 stroke-[3]" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onUpdateSettings({ crosshairSize: size })}
                  className={`flex-1 rounded py-1.5 text-xs font-semibold capitalize border transition ${
                    settings.crosshairSize === size
                      ? 'border-sky-500 bg-sky-950 text-sky-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {size === 'small' ? 'Pequena' : size === 'medium' ? 'Média' : 'Grande'}
                </button>
              ))}
            </div>
          </div>

          {/* Touch Controls Mode */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-300 font-medium">
                <Smartphone className="h-4 w-4 text-purple-400" /> Controles Touch (Mobile/Tablet)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {[
                { id: 'auto', label: 'Automático' },
                { id: 'always', label: 'Sempre Visível' },
                { id: 'never', label: 'Desativado' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdateSettings({ touchControlsMode: opt.id as any })}
                  className={`flex-1 rounded py-1.5 text-xs font-semibold border transition ${
                    settings.touchControlsMode === opt.id
                      ? 'border-purple-500 bg-purple-950 text-purple-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-20 shrink-0 flex justify-end border-t border-slate-800 bg-slate-950 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-amber-400 transition"
          >
            Confirmar e Voltar
          </button>
        </div>
      </div>
    </div>
  );
};
