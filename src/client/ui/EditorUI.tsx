import React, { useState } from 'react';
import { MapEditor } from '../editor/MapEditor';
import { MapObjectDef, SpawnPointDef, ObjectiveZoneDef, SchoolMapData } from '../../types/game';
import { validateSchoolMap, serializeSchoolMap, parseSchoolMap } from '../../shared/mapValidator';
import {
  Save,
  Download,
  Upload,
  Play,
  Trash2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Grid,
  Box,
  Layers,
  Flag,
  ArrowLeft,
} from 'lucide-react';

interface EditorUIProps {
  editor: MapEditor;
  selectedItem: MapObjectDef | SpawnPointDef | ObjectiveZoneDef | null;
  selectedType: 'object' | 'spawn' | 'objective' | null;
  onExit: () => void;
  onServerLoadMap: (mapData: SchoolMapData) => void;
}

export const EditorUI: React.FC<EditorUIProps> = ({
  editor,
  selectedItem,
  selectedType,
  onExit,
  onServerLoadMap,
}) => {
  const [mapName, setMapName] = useState(editor.currentMap.name);
  const [snapGrid, setSnapGrid] = useState<number>(editor.snapGrid);
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[]; warnings: string[] } | null>(null);
  const [serverStatusMessage, setServerStatusMessage] = useState<string | null>(null);

  const handleValidate = () => {
    editor.currentMap.name = mapName;
    const res = validateSchoolMap(editor.currentMap);
    setValidationResult(res);
    setValidationModalOpen(true);
  };

  const handleExport = () => {
    editor.currentMap.name = mapName;
    const res = validateSchoolMap(editor.currentMap);
    if (!res.valid) {
      alert(`O mapa contém erros que impedem a exportação:\n${res.errors.join('\n')}`);
      return;
    }
    const json = serializeSchoolMap(editor.currentMap);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mapName.toLowerCase().replace(/\s+/g, '_')}.schoolmap`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const res = parseSchoolMap(text);
      if (res.success && res.data) {
        editor.currentMap = res.data;
        setMapName(res.data.name);
        editor.rebuildScene();
        alert(`Mapa '${res.data.name}' importado com sucesso!`);
      } else {
        alert(`Falha ao importar mapa:\n${res.error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSendToServer = async () => {
    editor.currentMap.name = mapName;
    const res = validateSchoolMap(editor.currentMap);
    if (!res.valid) {
      alert(`Corrija os erros antes de enviar ao servidor:\n${res.errors.join('\n')}`);
      return;
    }

    try {
      const response = await fetch('/api/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editor.currentMap),
      });
      const data = await response.json();
      if (data.success) {
        setServerStatusMessage(`Sucesso: Mapa carregado no servidor LAN!`);
        setTimeout(() => setServerStatusMessage(null), 4000);
        onServerLoadMap(editor.currentMap);
      } else {
        alert(`Erro do servidor: ${data.error}`);
      }
    } catch (err) {
      alert(`Falha ao conectar com o servidor: ${err}`);
    }
  };

  const updateSelectedObjectProp = <K extends keyof MapObjectDef>(key: K, val: MapObjectDef[K]) => {
    if (!selectedItem || selectedType !== 'object') return;
    (selectedItem as MapObjectDef)[key] = val;
    editor.rebuildScene();
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col font-mono select-none">
      {/* TOP TOOLBAR */}
      <div className="pointer-events-auto flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-6 py-2.5 shadow-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar ao Menu</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-800" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Nome:</span>
            <input
              type="text"
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              className="rounded border border-slate-700 bg-slate-900 px-2.5 py-1 text-sm font-bold text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Snap selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Grid className="h-4 w-4" />
            <span>Grid:</span>
            {[0.5, 1.0, 2.0, 0].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSnapGrid(s);
                  editor.snapGrid = s;
                }}
                className={`rounded px-2 py-0.5 font-bold ${
                  snapGrid === s ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {s === 0 ? 'Livre' : `${s}m`}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleValidate}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Validar</span>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white"
          >
            <Download className="h-4 w-4 text-blue-400" />
            <span>Exportar .schoolmap</span>
          </button>

          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white">
            <Upload className="h-4 w-4 text-amber-400" />
            <span>Importar</span>
            <input type="file" accept=".schoolmap,.json" onChange={handleImport} className="hidden" />
          </label>

          <button
            onClick={handleSendToServer}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg transition hover:bg-emerald-500"
          >
            <Play className="h-4 w-4" />
            <span>Jogar no Servidor LAN</span>
          </button>
        </div>
      </div>

      {serverStatusMessage && (
        <div className="pointer-events-auto absolute top-16 left-1/2 -translate-x-1/2 rounded-lg bg-emerald-950 border border-emerald-600 px-4 py-2 text-sm text-emerald-300 shadow-xl">
          {serverStatusMessage}
        </div>
      )}

      {/* WORKSPACE AREA (PALETTE + INSPECTOR) */}
      <div className="flex flex-1 justify-between p-4 pointer-events-none">
        {/* LEFT PALETTE: Object & Spawn Creators */}
        <div className="pointer-events-auto flex w-64 flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/90 p-4 shadow-2xl overflow-y-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Adicionar à Cena</span>

          {/* Geometry */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Arquitetura</span>
            <button
              onClick={() => editor.addObject('wall')}
              className="flex w-full items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs font-bold text-slate-200 hover:bg-slate-800"
            >
              <Box className="h-4 w-4 text-amber-400" />
              <span>Parede Escolar (3x6m)</span>
            </button>
            <button
              onClick={() => editor.addObject('floor')}
              className="flex w-full items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs font-bold text-slate-200 hover:bg-slate-800"
            >
              <Layers className="h-4 w-4 text-blue-400" />
              <span>Piso / Linóleo (10x10m)</span>
            </button>
            <button
              onClick={() => editor.addObject('box')}
              className="flex w-full items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs font-bold text-slate-200 hover:bg-slate-800"
            >
              <Box className="h-4 w-4 text-emerald-400" />
              <span>Caixa / Obstáculo de Cover</span>
            </button>
          </div>

          {/* School Furniture */}
          <div className="space-y-1.5 mt-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Mobiliário Escolar</span>
            <button
              onClick={() => editor.addObject('desk')}
              className="flex w-full items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs font-bold text-slate-200 hover:bg-slate-800"
            >
              <span>🪑 Carteira / Mesa de Aluno</span>
            </button>
            <button
              onClick={() => editor.addObject('locker')}
              className="flex w-full items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs font-bold text-slate-200 hover:bg-slate-800"
            >
              <span>🚪 Armário Escolar</span>
            </button>
            <button
              onClick={() => editor.addObject('bookshelf')}
              className="flex w-full items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs font-bold text-slate-200 hover:bg-slate-800"
            >
              <span>📚 Estante da Biblioteca</span>
            </button>
          </div>

          {/* Spawns */}
          <div className="space-y-1.5 mt-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Pontos de Spawn</span>
            <button
              onClick={() => editor.addSpawn('INSPECTORS')}
              className="flex w-full items-center gap-2 rounded-lg border border-blue-900/60 bg-blue-950/60 px-3 py-2 text-left text-xs font-bold text-blue-300 hover:bg-blue-900/80"
            >
              <Flag className="h-4 w-4 text-blue-400" />
              <span>Spawn Inspetores</span>
            </button>
            <button
              onClick={() => editor.addSpawn('REBELS')}
              className="flex w-full items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/60 px-3 py-2 text-left text-xs font-bold text-red-300 hover:bg-red-900/80"
            >
              <Flag className="h-4 w-4 text-red-400" />
              <span>Spawn Rebeldes</span>
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500 leading-relaxed">
            Botão Direito: Orbitar câmera
            <br />
            Botão Meio / Shift: Arrastar vista
            <br />
            Botão Esquerdo: Selecionar objeto
          </div>
        </div>

        {/* RIGHT PROPERTIES INSPECTOR */}
        {selectedItem && (
          <div className="pointer-events-auto flex w-72 flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/90 p-4 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                {selectedType === 'object' ? 'Propriedades do Objeto' : selectedType === 'spawn' ? 'Ponto de Spawn' : 'Objetivo'}
              </span>
              <button
                onClick={() => editor.selectObject(null, null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="text-[11px] text-slate-400">ID: {selectedItem.id}</div>

            {/* Position inputs */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-300">Posição (X, Y, Z)</span>
              <div className="grid grid-cols-3 gap-1.5">
                {['X', 'Y', 'Z'].map((axis, idx) => (
                  <div key={axis} className="flex items-center gap-1 rounded bg-slate-900 px-2 py-1">
                    <span className="text-[10px] text-slate-500">{axis}</span>
                    <input
                      type="number"
                      step={snapGrid || 0.1}
                      value={selectedItem.position[idx]}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        selectedItem.position[idx] = val;
                        editor.rebuildScene();
                      }}
                      className="w-full bg-transparent text-xs text-white focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Object Specific Props */}
            {selectedType === 'object' && (
              <>
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-300">Escala / Dimensões</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['L', 'A', 'P'].map((dim, idx) => (
                      <div key={dim} className="flex items-center gap-1 rounded bg-slate-900 px-2 py-1">
                        <span className="text-[10px] text-slate-500">{dim}</span>
                        <input
                          type="number"
                          step={snapGrid || 0.1}
                          min={0.1}
                          value={(selectedItem as MapObjectDef).scale[idx]}
                          onChange={(e) => {
                            const val = Math.max(0.1, parseFloat(e.target.value) || 0.1);
                            (selectedItem as MapObjectDef).scale[idx] = val;
                            editor.rebuildScene();
                          }}
                          className="w-full bg-transparent text-xs text-white focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Texture picker */}
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-slate-300">Textura</span>
                  <select
                    value={(selectedItem as MapObjectDef).texture || 'brick'}
                    onChange={(e) =>
                      updateSelectedObjectProp('texture', e.target.value as MapObjectDef['texture'])
                    }
                    className="w-full rounded bg-slate-900 px-2 py-1.5 text-xs text-white border border-slate-700"
                  >
                    <option value="brick">Tijolos Escolares</option>
                    <option value="tile">Piso Cerâmico</option>
                    <option value="linoleum">Linóleo Escolar</option>
                    <option value="wood">Madeira (Mesa / Quadra)</option>
                    <option value="metal">Metal de Armário</option>
                    <option value="chalkboard">Lousa Verde com Giz</option>
                  </select>
                </div>

                {/* Collision toggle */}
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={(selectedItem as MapObjectDef).collision}
                    onChange={(e) => updateSelectedObjectProp('collision', e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-blue-600"
                  />
                  <span>Colisão ativa para jogadores</span>
                </label>
              </>
            )}

            {/* Spawn Specific Props */}
            {selectedType === 'spawn' && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300">Equipe</span>
                <div className="text-xs font-bold text-white">
                  {(selectedItem as SpawnPointDef).team === 'INSPECTORS' ? 'Inspetores (CT)' : 'Rebeldes (TR)'}
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(selectedItem as SpawnPointDef).enabled !== false}
                    onChange={(e) => {
                      (selectedItem as SpawnPointDef).enabled = e.target.checked;
                      editor.rebuildScene();
                    }}
                  />
                  <span>Ponto de nascimento habilitado</span>
                </label>
              </div>
            )}

            {/* Actions: Duplicate & Delete */}
            <div className="flex gap-2 pt-3 border-t border-slate-800">
              {selectedType === 'object' && (
                <button
                  onClick={() => editor.duplicateSelected()}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Duplicar</span>
                </button>
              )}
              <button
                onClick={() => editor.deleteSelected()}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-red-600/80 py-2 text-xs font-bold text-white hover:bg-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Excluir</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VALIDATION RESULTS MODAL */}
      {validationModalOpen && validationResult && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex w-full max-w-lg flex-col rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              {validationResult.valid ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-400" />
              )}
              <h3 className="text-lg font-black text-white">
                {validationResult.valid ? 'Mapa Válido para o Jogo!' : 'Erros de Validação Encontrados'}
              </h3>
            </div>

            <div className="mt-4 max-h-60 overflow-y-auto space-y-2 text-xs">
              {validationResult.valid ? (
                <p className="text-emerald-400">
                  Todas as regras táticas foram atendidas: quantidade de spawns por equipe, limites de arena e integridade de objetos.
                </p>
              ) : (
                validationResult.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 rounded bg-red-950/60 p-2 text-red-300">
                    <span className="text-red-500">✕</span>
                    <span>{err}</span>
                  </div>
                ))
              )}

              {validationResult.warnings.map((warn, i) => (
                <div key={i} className="flex items-start gap-2 rounded bg-amber-950/60 p-2 text-amber-300">
                  <span className="text-amber-500">⚠</span>
                  <span>{warn}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setValidationModalOpen(false)}
              className="mt-6 rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-500"
            >
              Fechar Validador
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
