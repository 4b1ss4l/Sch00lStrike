import React, { useState, useEffect, useRef } from 'react';
import { GameRenderer } from './client/renderer/GameRenderer';
import { FPSController } from './client/controls/FPSController';
import { MapEditor } from './client/editor/MapEditor';
import { soundManager } from './client/audio/SoundManager';
import { HUD } from './client/ui/HUD';
import { BuyMenu } from './client/ui/BuyMenu';
import { Scoreboard } from './client/ui/Scoreboard';
import { EditorUI } from './client/ui/EditorUI';
import { MainMenu } from './client/ui/MainMenu';
import { DEFAULT_SCHOOL_DUST_MAP } from './shared/defaultMap';
import {
  PlayerState,
  ServerGameState,
  KillfeedEntry,
  Team,
  SchoolMapData,
  MapObjectDef,
  SpawnPointDef,
  ObjectiveZoneDef,
} from './types/game';
import { Volume2, VolumeX, Pause, Users, ArrowLeft } from 'lucide-react';

export default function App() {
  const [appMode, setAppMode] = useState<'menu' | 'playing' | 'editor'>('menu');
  const [playerName, setPlayerName] = useState('Estudante');
  const [selectedTeam, setSelectedTeam] = useState<Team>('INSPECTORS');

  // Game UI States
  const [serverState, setServerState] = useState<ServerGameState | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string>('');
  const [killfeed, setKillfeed] = useState<KillfeedEntry[]>([]);
  const [serverMessage, setServerMessage] = useState<{ text: string; type: 'info' | 'warning' | 'round' } | null>(null);
  const [spread, setSpread] = useState<number>(0.012);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [flashOpacity, setFlashOpacity] = useState<number>(0);
  const [buyMenuOpen, setBuyMenuOpen] = useState<boolean>(false);
  const [scoreboardOpen, setScoreboardOpen] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Editor States
  const [editorInstance, setEditorInstance] = useState<MapEditor | null>(null);
  const [editorSelectedItem, setEditorSelectedItem] = useState<MapObjectDef | SpawnPointDef | ObjectiveZoneDef | null>(null);
  const [editorSelectedType, setEditorSelectedType] = useState<'object' | 'spawn' | 'objective' | null>(null);

  // Canvas Refs
  const gameCanvasRef = useRef<HTMLDivElement>(null);
  const editorCanvasRef = useRef<HTMLDivElement>(null);

  // Mutable Game Instances stored in Ref to avoid React re-render stalls
  const gameRendererRef = useRef<GameRenderer | null>(null);
  const fpsControllerRef = useRef<FPSController | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const currentMapDataRef = useRef<SchoolMapData>(DEFAULT_SCHOOL_DUST_MAP);
  const localPlayerStateRef = useRef<PlayerState | undefined>(undefined);
  const localPlayerIdRef = useRef<string>('');
  const playerNameRef = useRef<string>(playerName);
  const selectedTeamRef = useRef<Team>(selectedTeam);
  const lastSpreadRef = useRef<number>(0.012);
  const allPlayersRef = useRef<Record<string, PlayerState>>({});
  const animFrameIdRef = useRef<number>(0);

  // Autostart parameter check
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      handleJoinGame('Jogador Autostart', 'INSPECTORS');
    }
  }, []);

  // Sync dataset.state with Ultra Mode guidelines
  useEffect(() => {
    document.body.dataset.state = appMode === 'menu' ? 'title' : isPaused ? 'paused' : 'playing';
  }, [appMode, isPaused]);

  // Handle Game Setup when entering 'playing' mode
  useEffect(() => {
    if (appMode !== 'playing' || !gameCanvasRef.current) return;

    // 1. Initialize GameRenderer
    const renderer = new GameRenderer(gameCanvasRef.current);
    gameRendererRef.current = renderer;
    renderer.loadMap(currentMapDataRef.current);

    // 2. Initialize FPS Controller
    const controller = new FPSController(gameCanvasRef.current);
    fpsControllerRef.current = controller;

    // Connect WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'join',
        payload: { name: playerNameRef.current, team: selectedTeamRef.current },
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { type, payload } = msg;

        switch (type) {
          case 'init_welcome': {
            localPlayerIdRef.current = payload.playerId;
            setLocalPlayerId(payload.playerId);
            setServerState(payload.serverState);
            currentMapDataRef.current = payload.mapData;
            renderer.loadMap(payload.mapData);
            break;
          }

          case 'state_snapshot': {
            const ss = payload.serverState as ServerGameState;
            allPlayersRef.current = ss.players;
            const myId = localPlayerIdRef.current;
            if (myId && ss.players[myId]) {
              localPlayerStateRef.current = ss.players[myId];
            }
            setServerState(ss);
            break;
          }

          case 'shoot_event': {
            renderer.handleShootEvent(payload, localPlayerIdRef.current);
            break;
          }

          case 'hit_feedback': {
            soundManager.playHit(payload.isHeadshot);
            controller.addRecoil(0.02);
            break;
          }

          case 'kill_event': {
            setKillfeed((prev) => [...prev.slice(-8), payload]);
            break;
          }

          case 'map_updated': {
            currentMapDataRef.current = payload.mapData;
            renderer.loadMap(payload.mapData);
            break;
          }

          case 'server_message': {
            setServerMessage(payload);
            if (payload.type === 'round') {
              soundManager.playSchoolBell();
            }
            setTimeout(() => setServerMessage(null), 4000);
            break;
          }
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    // Controller callbacks
    controller.setCallbacks({
      onShoot: () => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const lp = localPlayerStateRef.current;
        if (!lp || !lp.isAlive) return;

        const eyeH = lp.position[1] + 1.12;
        const origin: [number, number, number] = [lp.position[0], eyeH, lp.position[2]];

        const cosP = Math.cos(controller.pitch);
        const sinP = Math.sin(controller.pitch);
        const cosY = Math.cos(controller.yaw);
        const sinY = Math.sin(controller.yaw);

        const direction: [number, number, number] = [
          -sinY * cosP,
          sinP,
          -cosY * cosP,
        ];

        wsRef.current.send(JSON.stringify({
          type: 'shoot',
          payload: {
            origin,
            direction,
            weaponId: lp.activeWeaponId,
          },
        }));
      },

      onReload: () => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const lp = localPlayerStateRef.current;
        if (!lp) return;
        soundManager.playReload();
        renderer.viewmodelRenderer.triggerReload(2.2);
        wsRef.current.send(JSON.stringify({
          type: 'reload',
          payload: { weaponId: lp.activeWeaponId },
        }));
      },

      onWeaponSwitch: (slot) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const lp = localPlayerStateRef.current;
        if (!lp || !lp.inventory) return;

        // Slot 1: Primary, Slot 2: Secondary/Pistol, Slot 3: Melee
        let targetId = lp.inventory[0];
        if (slot === 1) {
          targetId = lp.inventory.find(id => id.includes('m4') || id.includes('awp') || id.includes('shotgun')) || lp.inventory[0];
        } else if (slot === 2) {
          targetId = lp.inventory.find(id => id.includes('pistol') || id.includes('stapler')) || lp.inventory[0];
        } else if (slot === 3) {
          targetId = lp.inventory.find(id => id.includes('ruler')) || lp.inventory[0];
        }

        if (targetId) {
          wsRef.current.send(JSON.stringify({
            type: 'switch_weapon',
            payload: { weaponId: targetId },
          }));
        }
      },

      onBuyMenu: () => {
        setBuyMenuOpen((prev) => {
          const next = !prev;
          if (next) controller.releaseLock();
          else controller.requestLock();
          return next;
        });
      },

      onScoreboard: (visible) => {
        setScoreboardOpen(visible);
      },

      onZoom: (zoomed) => {
        const lp = localPlayerStateRef.current;
        if (lp && lp.activeWeaponId === 'telescopic_awp') {
          setIsZoomed(zoomed);
          renderer.camera.fov = zoomed ? 25 : 75;
          renderer.camera.updateProjectionMatrix();
        } else {
          setIsZoomed(false);
          renderer.camera.fov = 75;
          renderer.camera.updateProjectionMatrix();
        }
      },
    });

    // Main 60Hz Render & Client Tick Loop
    let lastTime = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // Update input
      const input = controller.update(dt);
      if (Math.abs(lastSpreadRef.current - controller.spread) > 0.008) {
        lastSpreadRef.current = controller.spread;
        setSpread(controller.spread);
      }

      // Send input to server
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !isPaused && !buyMenuOpen) {
        wsRef.current.send(JSON.stringify({
          type: 'player_input',
          payload: input,
        }));
      }

      // Render 3D Scene
      renderer.render(dt, localPlayerStateRef.current, allPlayersRef.current);

      animFrameIdRef.current = requestAnimationFrame(tick);
    };

    animFrameIdRef.current = requestAnimationFrame(tick);

    // Pause on Escape listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (buyMenuOpen) {
          setBuyMenuOpen(false);
          controller.requestLock();
        } else {
          setIsPaused((prev) => {
            const next = !prev;
            if (next) controller.releaseLock();
            else controller.requestLock();
            return next;
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      controller.dispose();
      renderer.dispose();
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [appMode]);

  // Handle Map Editor Setup when entering 'editor' mode
  useEffect(() => {
    if (appMode !== 'editor' || !editorCanvasRef.current) return;

    const editor = new MapEditor(editorCanvasRef.current, currentMapDataRef.current);
    setEditorInstance(editor);

    editor.setOnSelect((item, type) => {
      setEditorSelectedItem(item);
      setEditorSelectedType(type);
    });

    let frameId = 0;
    const loop = () => {
      editor.render();
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameId);
      editor.dispose();
      setEditorInstance(null);
    };
  }, [appMode]);

  // Join Action
  const handleJoinGame = (name: string, team: Team) => {
    setPlayerName(name);
    setSelectedTeam(team);
    playerNameRef.current = name;
    selectedTeamRef.current = team;
    setAppMode('playing');
    setIsPaused(false);
  };

  const handleSoloPractice = (name: string, team: Team) => {
    setPlayerName(name);
    setSelectedTeam(team);
    playerNameRef.current = name;
    selectedTeamRef.current = team;
    setAppMode('playing');
    setIsPaused(false);

    // Add bots on opposite and same team
    setTimeout(() => {
      fetch('/api/bot/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: team === 'INSPECTORS' ? 'REBELS' : 'INSPECTORS' }),
      });
      fetch('/api/bot/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: team === 'INSPECTORS' ? 'REBELS' : 'INSPECTORS' }),
      });
    }, 1000);
  };

  const handleBuyItem = (itemId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'buy_item',
        payload: { weaponId: itemId },
      }));
    }
  };

  const handleAddBot = (team: Team) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'add_bot',
        payload: { team },
      }));
    }
  };

  const handleKickBots = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'kick_bots',
        payload: {},
      }));
    }
  };

  const localPlayer = serverState?.players[localPlayerId];

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 font-mono select-none">
      {/* 1. MAIN MENU */}
      {appMode === 'menu' && (
        <MainMenu
          onJoinGame={handleJoinGame}
          onSoloPractice={handleSoloPractice}
          onOpenEditor={() => setAppMode('editor')}
          onOpenSettings={() => {}}
          initialPlayerName={playerName}
        />
      )}

      {/* 2. GAMEPLAY 3D VIEWPORT */}
      {appMode === 'playing' && (
        <>
          {/* Isolated WebGL Canvas container */}
          <div
            ref={gameCanvasRef}
            className="absolute inset-0 z-0 h-full w-full cursor-crosshair"
            onClick={() => fpsControllerRef.current?.requestLock()}
          />

          {/* HUD Overlay */}
          <HUD
            localPlayer={localPlayer}
            serverState={serverState || undefined}
            killfeed={killfeed}
            spread={spread}
            isZoomed={isZoomed}
            flashOpacity={flashOpacity}
            serverMessage={serverMessage}
          />

          {/* Buy Menu */}
          {buyMenuOpen && (
            <BuyMenu
              playerMoney={localPlayer?.money ?? 800}
              onBuyItem={handleBuyItem}
              onClose={() => {
                setBuyMenuOpen(false);
                fpsControllerRef.current?.requestLock();
              }}
            />
          )}

          {/* Scoreboard on Tab */}
          {scoreboardOpen && (
            <Scoreboard
              serverState={serverState || undefined}
              localPlayerId={localPlayerId}
            />
          )}

          {/* Top Right Quick Utilities Bar */}
          <div className="fixed top-3 right-3 z-30 flex items-center gap-2">
            <button
              onClick={() => {
                const muted = soundManager.toggleMute();
                setIsMuted(muted);
              }}
              title="Mutar Áudio"
              className="rounded-lg border border-slate-800 bg-slate-900/90 p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            <button
              onClick={() => {
                setIsPaused(true);
                fpsControllerRef.current?.releaseLock();
              }}
              title="Pausar / Menu"
              className="rounded-lg border border-slate-800 bg-slate-900/90 p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <Pause className="h-4 w-4" />
            </button>
          </div>

          {/* IN-GAME PAUSE MODAL */}
          {isPaused && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
              <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-center">
                <h2 className="text-2xl font-black text-white tracking-widest uppercase">JOGO PAUSADO</h2>
                <p className="mt-1 text-xs text-slate-400">School Strike · Partida em Andamento</p>

                <div className="mt-6 flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setIsPaused(false);
                      fpsControllerRef.current?.requestLock();
                    }}
                    className="w-full rounded-xl bg-amber-500 py-3 text-sm font-black text-slate-950 hover:bg-amber-400 transition"
                  >
                    CONTINUAR JOGANDO
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddBot('REBELS')}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-white hover:bg-slate-700"
                    >
                      + Bot Rebelde
                    </button>
                    <button
                      onClick={() => handleAddBot('INSPECTORS')}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-white hover:bg-slate-700"
                    >
                      + Bot Inspetor
                    </button>
                    <button
                      onClick={handleKickBots}
                      className="rounded-lg border border-red-800/80 bg-red-950/80 px-3 py-2.5 text-xs font-bold text-red-300 hover:bg-red-900"
                    >
                      Remover Bots
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setAppMode('editor');
                      setIsPaused(false);
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
                  >
                    ABRIR NO EDITOR DE MAPAS
                  </button>

                  <button
                    onClick={() => {
                      setAppMode('menu');
                      setIsPaused(false);
                    }}
                    className="w-full rounded-xl border border-red-900/60 bg-red-950/40 py-2.5 text-xs font-bold text-red-400 hover:bg-red-900/60"
                  >
                    SAIR PARA O MENU PRINCIPAL
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 3. 3D MAP EDITOR VIEWPORT */}
      {appMode === 'editor' && (
        <>
          <div ref={editorCanvasRef} className="absolute inset-0 z-0 h-full w-full" />
          {editorInstance && (
            <EditorUI
              editor={editorInstance}
              selectedItem={editorSelectedItem}
              selectedType={editorSelectedType}
              onExit={() => setAppMode('menu')}
              onServerLoadMap={(map) => {
                currentMapDataRef.current = map;
                setAppMode('playing');
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
