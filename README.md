# 🎒 SCHOOL STRIKE — FPS Multiplayer Escolar

FPS multiplayer tático e competitivo em primeira pessoa direto no navegador, inspirado na clássica jogabilidade do **Counter-Strike 1.6**, adaptado para o universo escolar!

Partidas competitivas em **Rede Local (LAN)**, armas escolares estilizadas, mapa **SCHOOL_DUST** inspirado na arquitetura de navegação de Dust2/Cache, e um **Editor de Mapas 3D** completo integrado com exportação/importação de mapas `.schoolmap`.

---

## 🏫 Equipes Escolares

- **Inspetores Escolares (Defesa / CTs)**:
  - Uniformes e coletes azuis de monitoria, crachás escolares e apitos.
  - Missão: Defender a Biblioteca (Bombsite A) e o Ginásio Poliesportivo (Bombsite B) contra depredação, mantendo a ordem escolar.
- **Rebeldes do Recreio (Ataque / TRs)**:
  - Roupas alternativas com tons vermelhos/laranja, mochilas estilizadas e gravatas desalinhadas.
  - Missão: Avançar pelos corredores, superar as defesas e assumir o controle do colégio.

---

## ✏️ Catálogo de Armas e Equipamentos Escolares

| Equipamento | Categoria | Preço | Dano Base | Cadência | Função & Estilo |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Régua Escolar 30cm** | Branca / Faca | $0 (Padrão) | 35 | 2.2/s | Lâmina de acrílico para combate rápido e silencioso. |
| **Marcador Fluorescente** | Pistola Leve | $200 | 24 | 6.0/s | Pistola inicial ágil com tinta neon de alta velocidade. |
| **Grampeador Tático 26/6** | Pistola Pesada | $700 | 55 | 3.5/s | Alta pressão e impacto; 1 tiro fatal na cabeça! |
| **Lança-Bolinhas M4** | Rifle Automático | $2900 | 32 | 11.0/s | Rajadas velozes de bolinhas de papel comprimidas. |
| **Régua Telescópica AWP** | Rifle de Precisão | $4750 | 115 | 0.9/s | Luneta milimétrica de longo alcance; tiro devastador. |
| **Espingarda Tubo-de-Cola** | Espingarda | $1500 | 18 x 8 | 1.2/s | Dispersão ampla de cartuchos de cola; letal de perto. |
| **Estojo-Surpresa** | Granada Confete | $300 | 75 | 1.0/s | Explosão cômica de confetes coloridos e choque. |
| **Mochila de Giz** | Granada Fumaça | $300 | 0 | 1.0/s | Nuvem densa de pó de giz para cobertura tática. |
| **Colete Escolar** | Proteção | $650 | - | - | Reduz dano sofrido em 40%. |

---

## 🗺️ Mapa Principal: `SCHOOL_DUST`

O mapa foi estruturado para manter o ritmo tático e o equilíbrio entre ataque e defesa:
- **Pátio Central (Mid)**: Zona aberta com floreiras de cobertura e bancos conectando as rotas.
- **Corredor dos Armários (Long A)**: Longa reta ladeada de armários escolares de metal que leva ao Bombsite A.
- **Bombsite A (Biblioteca)**: Área cercada por estantes de livros, mesas de estudo e lousas verdes.
- **Refeitório (B Tunnels)**: Passagem com mesas de cantina e máquinas de lanches que dá acesso ao Ginásio.
- **Bombsite B (Ginásio Poliesportivo)**: Quadra com piso de madeira, tabelas e arquibancadas.

---

## 🛠️ Editor de Mapas 3D Integrado

Acesse pelo menu principal em **"EDITOR DE MAPAS 3D"**:
- **Criação de Geometria**: Paredes, Pisos, Tetos, Caixas de cover, Carteiras escolares, Armários e Estantes.
- **Spawns**: Posicione spawns específicos para Inspetores e Rebeldes com orientação da seta amarela de visão.
- **Ajuste de Grade (Snap)**: 0.5m, 1.0m, 2.0m ou movimentação Livre.
- **Texturas Procedurais**: Tijolo escolar, azulejo, linóleo, madeira de carteira e lousa com giz.
- **Validação de Regras**: Confere se cada equipe possui ao menos 2 spawns e se os objetivos A e B estão configurados.
- **Exportação & Importação**: Baixe e carregue arquivos `.schoolmap` / JSON a qualquer momento.
- **Jogar no Servidor**: O botão "Jogar no Servidor LAN" envia o novo mapa imediatamente para a partida sem reiniciar o servidor!

---

## 🕹️ Controles do Jogo

- **W, A, S, D**: Movimentação do estudante
- **Mouse**: Mirar / Rotacionar câmera (com Pointer Lock)
- **Botão Esquerdo do Mouse**: Disparar equipamento
- **Botão Direito do Mouse**: Zoom da luneta telescópica (Régua AWP)
- **Espaço**: Pular
- **Ctrl ou C**: Agachar
- **Shift**: Andar em silêncio (passos silenciosos e mira mais firme)
- **R**: Recarregar munição
- **B**: Abrir Menu de Compras da Cantina (durante a fase de compra)
- **1, 2, 3**: Alternar entre Rifle/Sniper, Pistola e Régua Melee
- **Tab (Segurar)**: Exibir Placar da Partida (Kills, Mortes, Dinheiro e Ping)
- **Esc**: Pausar / Menu de Opções

---

## 🚀 Como Executar em Rede Local (LAN)

1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Iniciar o Servidor**:
   ```bash
   npm run dev
   ```

3. **Conectar na partida**:
   - No computador que está rodando o servidor: acesse `http://localhost:3000`.
   - Nos demais computadores conectados ao mesmo Wi-Fi ou cabo de rede: abra o navegador e digite o endereço de IP da LAN exibido no topo da tela do jogo (exemplo: `http://192.168.1.50:3000`).

4. **Treino Solo**:
   - Caso queira praticar sozinho ou testar armas, selecione **"Treino Solo (com Bots)"** no menu principal para adicionar automaticamente estudantes virtuais rivais!
