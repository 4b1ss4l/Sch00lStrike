Sch00lStrike

FPS multiplayer de navegador com temática escolar, desenvolvido com React, TypeScript, Three.js e Vite.

Este guia explica como executar o projeto em um computador com Windows 11 sem privilégios administrativos.

Requisitos

- Windows 11 de 64 bits.
- Acesso à internet para baixar o projeto e suas dependências.
- Permissão para executar arquivos dentro da pasta do usuário.
- Um navegador moderno, como Chrome ou Edge.

Não é necessário: WSL, Docker, Git instalado no sistema, instalação global do Node.js ou acesso de administrador.

1. Preparar uma pasta de trabalho

Abra o Prompt de Comando ("cmd") normalmente, sem selecionar “Executar como administrador”.

Execute:

mkdir "%USERPROFILE%\Sch00lStrike"
cd /d "%USERPROFILE%\Sch00lStrike"

Se você já baixou o projeto, extraia-o para essa pasta e entre na pasta que contém "package.json".

2. Baixar o Node.js sem instalar

O Node.js pode ser executado a partir de uma pasta do usuário, sem usar o instalador tradicional.

1. Acesse a página oficial: https://nodejs.org/en/download

2. Baixe o arquivo ZIP para Windows x64, de preferência uma versão LTS compatível com as dependências atuais do projeto.

3. Extraia-o dentro da pasta:
   
   %USERPROFILE%\Sch00lStrike\tools\node

A estrutura deve conter arquivos como:

tools\
  node\
    node.exe
    npm.cmd
    node_modules\

Dependendo do arquivo ZIP, os executáveis podem ficar em uma subpasta. Ajuste o caminho abaixo para apontar para a pasta correta.

Na mesma janela do CMD, execute:

set "NODE_HOME=%USERPROFILE%\Sch00lStrike\tools\node"
set "PATH=%NODE_HOME%;%PATH%"

node -v
npm -v

Se os dois comandos exibirem versões, o ambiente está pronto. A alteração de "PATH" acima vale somente para essa janela do CMD, não para o sistema inteiro.

3. Baixar o repositório sem Git

Abra a página do projeto:

https://github.com/4b1ss4l/Sch00lStrike

1. Toque em Code.
2. Escolha Download ZIP.
3. Extraia o conteúdo.
4. Entre na pasta extraída que contém o arquivo "package.json".

Por exemplo, se o ZIP tiver sido extraído para "Downloads":

cd /d "%USERPROFILE%\Downloads\Sch00lStrike-main"

Use o caminho real da pasta extraída.

4. Instalar as dependências localmente

Confirme que está na pasta do projeto:

dir package.json

Depois, execute:

npm install --no-audit --no-fund

O npm instala as dependências dentro do projeto, principalmente em "node_modules". Não é necessário instalar pacotes globalmente.

Corrigir o conflito de "esbuild", se aparecer

Se o erro "ERESOLVE" indicar que o Vite 8 precisa de "esbuild ^0.27.0 || ^0.28.0", mas o projeto declara "^0.25.0", execute:

npm pkg set "devDependencies.esbuild=^0.28.0"
npm install --no-audit --no-fund

Essa alteração modifica o "package.json" local. Se o autor atualizar o repositório, talvez essa etapa deixe de ser necessária.

5. Iniciar o jogo

Na pasta que contém "package.json", execute:

npm run dev

Mantenha o terminal aberto e observe a mensagem que indica o endereço local do servidor. Abra esse endereço no navegador.

Para encerrar, pressione "Ctrl+C".

6. Testar a versão de produção

Para gerar os arquivos de produção:

npm run build

Se a compilação terminar sem erros, os arquivos serão gerados na pasta "dist", conforme a configuração do projeto.

O comando abaixo permite pré-visualizar a compilação, se o servidor e o script estiverem configurados:

npm run preview

Use o endereço exibido no terminal.

7. Executar novamente no futuro

Quando o Node.js já estiver extraído, não é necessário baixá-lo outra vez. Abra um CMD normal e execute:

set "NODE_HOME=%USERPROFILE%\Sch00lStrike\tools\node"
set "PATH=%NODE_HOME%;%PATH%"

cd /d "%USERPROFILE%\Downloads\Sch00lStrike-main"

npm run dev

Ajuste o caminho do projeto se você o extraiu em outra pasta.

Solução de problemas

"node" ou "npm" não é reconhecido

Confira se "node.exe" e "npm.cmd" estão na pasta indicada em "NODE_HOME". Se o ZIP tiver uma pasta interna adicional, corrija o caminho.

Erro "ERESOLVE"

Siga a seção de correção do "esbuild" e confira se a instalação terminou sem erros.

Erro ao gravar arquivos

Verifique se a pasta do projeto está dentro do seu perfil de usuário e se você tem permissão de escrita. Em computadores gerenciados, políticas da organização ainda podem bloquear programas ou downloads.

O navegador não abre o jogo

Confirme se "npm run dev" continua executando e abra o endereço e a porta indicados pelo terminal.

Limites deste método

Este procedimento não requer privilégios administrativos para as etapas descritas, desde que as políticas do computador permitam baixar e executar o Node.js e instalar dependências na pasta do usuário.

Ele não garante funcionamento em computadores nos quais a execução de programas, scripts ou conexões de rede seja bloqueada por políticas corporativas ou escolares.
