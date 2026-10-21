import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GameRoom } from './game/GameRoom.js';
import { DEFAULT_SCHOOL_DUST_MAP } from '../../shared/defaultMap.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

const PORT = Number(process.env.PORT) || 3000;
const app = express();
app.use(express.json({ limit: '10mb' }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const gameRoom = new GameRoom(DEFAULT_SCHOOL_DUST_MAP);
const clients = new Map();

function broadcast(type, payload, filter) {
  const message = JSON.stringify({ type, payload });
  for (const conn of clients.values()) {
    if (conn.ws.readyState === WebSocket.OPEN && (!filter || filter(conn))) {
      conn.ws.send(message);
    }
  }
}

function sendTo(ws, type, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

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

function getLanIps() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
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
  const mapData = req.body;
  const result = gameRoom.loadMap(mapData);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.message });
  }
  broadcast('map_updated', { mapData: gameRoom.mapData });
  broadcast('server_message', { text: `Novo mapa carregado pelo Administrador: ${mapData.name}`, type: 'info' });
  return res.json({ success: true, message: result.message });
});

app.post('/api/bot/add', (req, res) => {
  const team = req.body.team || 'REBELS';
  const bot = gameRoom.addBot(team);
  broadcast('server_message', { text: `${bot.name} entrou para a equipe ${team === 'INSPECTORS' ? 'Inspetores' : 'Rebeldes'}!`, type: 'info' });
  res.json({ success: true, bot });
});

app.post('/api/bot/kick', (_req, res) => {
  gameRoom.kickBots();
  broadcast('server_message', { text: 'Todos os bots foram removidos.', type: 'info' });
  res.json({ success: true });
});

// WebSocket Handling
wss.on('connection', (ws) => {
  const playerId = `player_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const conn = {
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
          const { name, team } = payload;
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
          const { team } = payload;
          gameRoom.setPlayerTeam(playerId, team);
          break;
        }

        case 'player_input': {
          gameRoom.handleInput(playerId, payload);
          break;
        }

        case 'shoot': {
          const result = gameRoom.handleShoot(playerId, payload);
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
          gameRoom.handleReload(playerId, payload?.weaponId);
          break;
        }

        case 'switch_weapon': {
          gameRoom.handleSwitchWeapon(playerId, payload.weaponId);
          break;
        }

        case 'buy_item': {
          const buyResult = gameRoom.handleBuyItem(playerId, payload.weaponId);
          sendTo(ws, 'server_message', {
            text: buyResult.message,
            type: buyResult.success ? 'info' : 'warning',
          });
          break;
        }

        case 'add_bot': {
          gameRoom.addBot(payload.team);
          break;
        }

        case 'kick_bots': {
          gameRoom.kickBots();
          break;
        }

        case 'admin_load_map': {
          const res = gameRoom.loadMap(payload.mapData);
          if (res.success) {
            broadcast('map_updated', { mapData: gameRoom.mapData });
            broadcast('server_message', { text: `Mapa ${payload.mapData.name} carregado!`, type: 'info' });
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

// 30Hz game tick
setInterval(() => {
  gameRoom.tick();
  broadcast('state_snapshot', {
    serverState: gameRoom.state,
  });
}, 1000 / 30);

// Setup frontend serving (Vite in dev, static dist in prod)
async function start() {
  const distPath = path.join(rootDir, 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        root: rootDir,
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.log('Serving root static fallback:', err.message);
      app.use(express.static(rootDir));
    }
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

start().catch(console.error);

export default server;
