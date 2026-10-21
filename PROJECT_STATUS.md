# SCHOOL STRIKE — Status do Projeto

## 1. Objetivos do Projeto
Projetar e construir um jogo de tiro em primeira pessoa (FPS) competitivo multiplayer executado no navegador, com estética escolar original inspirada na jogabilidade tática do Counter-Strike 1.6:
- Partidas em rede local (LAN) com servidor autoritativo em Node.js e WebSocket.
- Equipes escolares com identidades visuais e hitboxes simétricas: **Inspetores Escolares** (Defesa / CTs) e **Rebeldes do Recreio** (Ataque / TRs).
- Equipamentos e armas escolares estilizados (Marcador Fluorescente, Grampeador Tático, Lança-Bolinhas M4, Régua Telescópica AWP, Espingarda Tubo-de-Cola, Régua de Acrílico Melee, Estojo-Surpresa de Confete, Mochila de Giz, etc.).
- Mapa principal original **SCHOOL_DUST** inspirado na geometria tática clássica (Pátio central, Corredor de armários Long A, Biblioteca Bombsite A, Refeitório B Tunnels e Ginásio Poliesportivo Bombsite B).
- Editor de mapas 3D integrado no navegador com navegação orbital, inserção e transformação de objetos, ajuste de grade (snap), gerenciamento de spawns e objetivos, validação automática, exportação e importação de arquivos `.schoolmap` / JSON, e carregamento instantâneo no servidor.

---

## 2. Arquitetura Atual
- **Full-Stack Runtime**: Express.js + Vite Dev Server integrado (`server.ts`) na porta 3000.
- **Rede Multiplayer**: WebSocket (`ws`) autoritativo com snapshots a 30Hz, predição de movimento cliente, compensação de latência e validação de linha de visada por raycasting.
- **Renderização 3D**: Three.js (r183) com iluminação PBR mista (Sol direcional, HemisphereLight, Fog atmosférico) e detecção de software WebGL (`isSoftwareGl`).
- **Texturas**: 100% procedurais geradas via Canvas 2D (`textures.ts`) sem dependências remotas ou erros 404 (tijolos escolares, linóleo, madeira de carteira, metal de armários e lousa com giz).
- **Áudio**: Sintetizador procedural com Web Audio API (`SoundManager.ts`), incluindo sinal escolar clássico, tiros dos equipamentos escolares, recarga mecânica, passos e chiado de fumaça.
- **Editor 3D**: `MapEditor.ts` e `EditorUI.tsx` com raycasting de seleção, bounding boxes amarelas de destaque, paleta de itens escolares, validação de regras de spawn e rota de API `POST /api/map` para carregar mapas em tempo real.

---

## 3. Funcionalidades Implementadas
- [x] Servidor Node.js HTTP e WebSocket integrado com detecção automática de IP da LAN.
- [x] Controlador FPS em primeira pessoa com Pointer Lock API, WASD, pulo, agachamento, recoil e dispersão dinâmica de mira.
- [x] Visão e animação de arma em primeira pessoa (Viewmodels 3D de Marcador, Grampeador, M4 de Bolinhas, AWP de Régua, Espingarda e Régua de corte).
- [x] Zoom de mira telescópica (Scope da Régua AWP) com máscara circular e retículo de precisão.
- [x] Menu de Compra tático (tecla B) com categorias, preços em dólares, barra de atributos e compra de colete escolar.
- [x] Placar da partida (tecla Tab) com pontuação das equipes, abates, mortes, dinheiro e ping individual.
- [x] Sistema de partículas com pool fixo para traçantes de tiro, estouro de confetes, fumaça de giz e impactos.
- [x] Bonecos 3D para outros jogadores e bots no mapa com uniformes temáticos e crachás flutuantes.
- [x] Sistema de bots ("Dummies de Treino") para partidas e testes solo.
- [x] Editor de mapas 3D com ferramentas de criação, transformação, snap de grade e inspetor de propriedades.
- [x] Validador automático de mapas (regras de spawns por equipe, distâncias mínimas, objetivos A e B).
- [x] Exportação e importação de mapas em arquivo transferível `.schoolmap` / JSON.
- [x] Envio direto de mapas personalizados para o servidor ativo jogar sem reiniciar.

---

## 4. Arquivos Principais
- `server.ts`: Servidor Express + WebSocket, endpoints REST (`/api/lan-info`, `/api/map`, `/api/bot/*`) e loop de simulação.
- `src/server/GameRoom.ts`: Máquina de estados autoritativa dos rounds, cálculo de dano, hitboxes, economia e IA de bots.
- `src/types/game.ts`: Tipos do protocolo, armas, mapas, jogadores e estados do servidor.
- `src/shared/weapons.ts`: Tabela centralizada de equipamentos e armas escolares.
- `src/shared/defaultMap.ts`: Geometria e dados do mapa oficial SCHOOL_DUST.
- `src/shared/mapValidator.ts`: Motor de validação e serialização/parsing de mapas.
- `src/client/renderer/GameRenderer.ts`: Motor Three.js, cena, iluminação e renderizador da partida.
- `src/client/renderer/ViewmodelRenderer.ts`: Modelos e animações de armas escolares em 1ª pessoa.
- `src/client/renderer/WorldPlayers.ts`: Modelagem 3D dos jogadores rivais e aliados.
- `src/client/renderer/ParticleSystem.ts`: Efeitos de tiros, fumaça, faíscas e confete.
- `src/client/audio/SoundManager.ts`: Sintetizador Web Audio API para efeitos sonoros e sinal escolar.
- `src/client/controls/FPSController.ts`: Leitura de mouse, sensibilidade, teclado e cálculo de recoil.
- `src/client/editor/MapEditor.ts`: Mecânica 3D do editor de mapas (órbita, snap, seleção, duplicação).
- `src/client/ui/HUD.tsx`: Interface de combate CS 1.6 temática escolar.
- `src/client/ui/BuyMenu.tsx`: Menu de compra entre rounds.
- `src/client/ui/Scoreboard.tsx`: Placar geral da partida no Tab.
- `src/client/ui/EditorUI.tsx`: Painel de ferramentas, paleta e inspetor do editor de mapas.
- `src/client/ui/MainMenu.tsx`: Tela inicial, seleção de equipe e IP para convidar computadores na LAN.

---

## 5. Testes Executados e Resultados
- `tests/weapons.test.ts`: Validação de estatísticas, alcances, danos, multiplicadores de headshot e loadouts padrão.
- `tests/mapValidation.test.ts`: Validação de mapas válidos, rejeição de mapas sem spawns mínimos, rejeição de spawns sobrepostos e integridade de exportação/importação.
- `tests/gameRoom.test.ts`: Testes de lógica do GameRoom: conexão, dano por raycast, dano crítico na cabeça (headshot), transições de round, vitória por eliminação e compra na loja.
- **Resultado dos Testes Unitários**: 14 testes executados e 100% aprovados via `./node_modules/.bin/tsx --test tests/*.test.ts`.

---

## 6. Comandos para Executar
- `npm run dev`: Inicia o servidor HTTP e WebSocket na porta 3000 em modo desenvolvimento.
- `./node_modules/.bin/tsx --test tests/*.test.ts`: Executa os testes automatizados da lógica pura.
- `npm run build`: Compila os assets do cliente frontend com Vite.
