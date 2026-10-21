import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameRoom } from './src/server/GameRoom.js';
import { DEFAULT_SCHOOL_DUST_MAP } from './src/shared/defaultMap.js';
import { validateSchoolMap } from './src/shared/mapValidator.js';
import {
  ClientToServerMessages,
  ServerToClientMessages,
  Team,
  SchoolMapData,
} from './src/types/game.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const app = express();
app.use(express.json({ limit: '10mb' }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const gameRoom = new GameRoom(DEFAULT_SCHOOL_DUST_MAP);

interface ClientConnection {
  id: string;
  ws: WebSocket;
  lastPingTime: number;
}

const clients: Map<string, ClientConnection> = new Map();

// Helper to broadcast to all or filtered clients
function broadcast<K extends keyof ServerToClientMessages>(
  type: K,
  payload: ServerToClientMessages[K],
  filter?: (conn: ClientConnection) => boolean
) {
  const message = JSON.stringify({ type, payload });
  for (const conn of clients.values()) {
    if (conn.ws.readyState === WebSocket.OPEN && (!filter || filter(conn))) {
      conn.ws.send(message);
    }
  }
}

function sendTo<K extends keyof ServerToClientMessages>(
  ws: WebSocket,
  type: K,
  payload: ServerToClientMessages[K]
) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

// GameRoom event hooks
gameRoom.setCallbacks({
  onKillfeed: (entry) => {
    broadcast('kill_event', entry);
  },
  onShoot: (event) => {
    broadcast('shoot_event', event);
  },
  onMessage: (text, type) => {
    broadcast('server_message', { text, type });
  },
});

// Network interfaces discovery for LAN IP display
function getLanIps(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

// REST Endpoints
app.get('/api/lan-info', (_req, res) => {
  res.json({
    port: PORT,
    lanIps: getLanIps(),
    mapName: gameRoom.state.mapName,
    playerCount: gameRoom.getTotalPlayerCount(),
    phase: gameRoom.state.phase,
    roundNumber: gameRoom.state.roundNumber,
  });
});

app.get('/api/map', (_req, res) => {
  res.json(gameRoom.mapData);
});

app.post('/api/map', (req, res) => {
  const mapData = req.body as SchoolMapData;
  const result = gameRoom.loadMap(mapData);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.message });
  }
  broadcast('map_updated', { mapData: gameRoom.mapData });
  broadcast('server_message', { text: `Novo mapa carregado pelo Administrador: ${mapData.name}`, type: 'info' });
  return res.json({ success: true, message: result.message });
});

app.post('/api/bot/add', (req, res) => {
  const team: Team = req.body.team || 'REBELS';
  const bot = gameRoom.addBot(team);
  broadcast('server_message', { text: `${bot.name} entrou para a equipe ${team === 'INSPECTORS' ? 'Inspetores' : 'Rebeldes'}!`, type: 'info' });
  res.json({ success: true, bot });
});

app.post('/api/bot/kick', (_req, res) => {
  gameRoom.kickBots();
  broadcast('server_message', { text: 'Todos os bots foram removidos.', type: 'info' });
  res.json({ success: true });
});

// WebSocket connections
wss.on('connection', (ws) => {
  const playerId = `player_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const conn: ClientConnection = {
    id: playerId,
    ws,
    lastPingTime: Date.now(),
  };
  clients.set(playerId, conn);

  ws.on('message', (rawData) => {
    try {
      const msg = JSON.parse(rawData.toString());
      const { type, payload } = msg;

      switch (type) {
        case 'join': {
          const { name, team } = payload as ClientToServerMessages['join'];
          const player = gameRoom.addPlayer(playerId, name || 'Estudante', team);
          sendTo(ws, 'init_welcome', {
            playerId,
            serverState: gameRoom.state,
            mapData: gameRoom.mapData,
          });
          broadcast('server_message', {
            text: `${player.name} entrou na partida como ${player.team === 'INSPECTORS' ? 'Inspetor' : 'Rebelde'}!`,
            type: 'info',
          });
          break;
        }

        case 'change_team': {
          const { team } = payload as ClientToServerMessages['change_team'];
          gameRoom.setPlayerTeam(playerId, team);
          break;
        }

        case 'player_input': {
          const input = payload as ClientToServerMessages['player_input'];
          gameRoom.handleInput(playerId, input);
          break;
        }

        case 'shoot': {
          const shootData = payload as ClientToServerMessages['shoot'];
          const result = gameRoom.handleShoot(playerId, shootData);
          if (result.hit && result.victimId) {
            const victim = gameRoom.state.players[result.victimId];
            sendTo(ws, 'hit_feedback', {
              damage: result.damage,
              isHeadshot: result.isHeadshot,
              victimId: result.victimId,
              victimHealthRemaining: victim ? victim.health : 0,
            });
          }
          break;
        }

        case 'reload': {
          const { weaponId } = payload as ClientToServerMessages['reload'];
          gameRoom.handleReload(playerId, weaponId);
          break;
        }

        case 'switch_weapon': {
          const { weaponId } = payload as ClientToServerMessages['switch_weapon'];
          gameRoom.handleSwitchWeapon(playerId, weaponId);
          break;
        }

        case 'buy_item': {
          const { weaponId } = payload as ClientToServerMessages['buy_item'];
          const buyResult = gameRoom.handleBuyItem(playerId, weaponId);
          sendTo(ws, 'server_message', {
            text: buyResult.message,
            type: buyResult.success ? 'info' : 'warning',
          });
          break;
        }

        case 'add_bot': {
          const { team } = payload as ClientToServerMessages['add_bot'];
          gameRoom.addBot(team);
          break;
        }

        case 'kick_bots': {
          gameRoom.kickBots();
          break;
        }

        case 'admin_load_map': {
          const { mapData } = payload as ClientToServerMessages['admin_load_map'];
          const res = gameRoom.loadMap(mapData);
          if (res.success) {
            broadcast('map_updated', { mapData: gameRoom.mapData });
            broadcast('server_message', { text: `Mapa ${mapData.name} carregado!`, type: 'info' });
          } else {
            sendTo(ws, 'server_message', { text: res.message, type: 'warning' });
          }
          break;
        }

        case 'admin_restart_match': {
          gameRoom.restartMatch();
          broadcast('server_message', { text: 'Partida reiniciada pelo Administrador!', type: 'info' });
          break;
        }
      }
    } catch (e) {
      console.error('Error handling WS message:', e);
    }
  });

  ws.on('close', () => {
    const p = gameRoom.state.players[playerId];
    if (p) {
      broadcast('server_message', { text: `${p.name} desconectou.`, type: 'info' });
    }
    gameRoom.removePlayer(playerId);
    clients.delete(playerId);
  });
});

// Server game tick at 30Hz
setInterval(() => {
  gameRoom.tick();
  broadcast('state_snapshot', {
    serverState: gameRoom.state,
  });
}, 1000 / 30);

// Setup Vite or static serving
async function setupServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    const lanIps = getLanIps();
    console.log(`=========================================`);
    console.log(` SCHOOL STRIKE - SERVIDOR MULTIPLAYER LAN `);
    console.log(` Local:   http://localhost:${PORT}`);
    if (lanIps.length > 0) {
      for (const ip of lanIps) {
        console.log(` LAN IP:  http://${ip}:${PORT}`);
      }
    }
    console.log(`=========================================`);
  });
}

setupServer().catch(err => {
  console.error('Failed to start server:', err);
});
