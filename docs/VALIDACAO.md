# Validação da versão 1.2

Executada em Linux com Node 24.19.0, Chromium e Electron 44.9.0, em 19/10/2026.

- `npm test`: 33 testes passaram, zero falhas ou pulados. Inclui autenticação/sessões SQLite, duas conexões WebSocket reais, salas, combate, energia, defesa, revive, derrota/vitória, 18 padrões, fases, hitboxes de anel/faixa, dash, minions, poções, veneno em lacaios, cosméticos e emotes.
- `scripts/browser-smoke.js`: duas sessões independentes, classe, movimento, defesa, consumo de energia, reconexão e interface móvel. Sem erros JavaScript nas páginas.
- `scripts/full-match.js`: quatro sessões de navegador independentes completaram as três rodadas com três vitórias e resultado compartilhado. Pontuação observada: 1.757; dano individual aproximado: 4.968 / 5.777 / 6.549 / 5.986. A automação envia apenas comandos normais e não altera estado, dano, vida ou tempo do servidor. Inclui as três apresentações, passagens pelo corredor, epílogo e resultado final; nenhuma página apresentou erro JavaScript.
- Simulação autoritativa de quatro participantes: chefes derrotados em cerca de 63 / 80 / 124 segundos, com dano recebido, recursos gastos e incapacitações. Esses tempos não são garantidos para jogadores.
- `scripts/desktop-smoke.js`: aplicação Linux equivalente empacotada com Node incluso, tema de menu realmente reproduzido, troca de classe/bots, chapéu compartilhado, diálogo, emote, dash com custo, combate, duas instâncias conectadas por TCP em 127.0.0.1 e reconexão. Capturas mostram o aplicativo real.
- O vídeo usa screencast do aplicativo real, incluindo chegada, diálogo, despertar, emote, dash e combate, precedido de capturas do menu e da sala. A trilha original de batalha foi acrescentada à gravação; os efeitos sonoros não são uma gravação ao vivo da partida.
- `npm run build:windows`: executável PE x64 e runtime oficial incluídos, com checksums oficiais verificados. ZIP e partes de distribuição têm SHA-256 e são reconstruídos/verificados antes da release.

Os atlas possuem 732 quadros novos desenhados. As direções são selecionadas pela mira real; o sentido sudoeste do acólito usa o espelhamento de uma sequência compatível. Chapéus são acessórios de pixel desenhados em código e posicionados por metadados da cabeça.

Não houve execução do `.exe` em um Windows físico, teste entre dois PCs físicos, teste de carga amplo ou playtest externo. A rede privada da máquina na nuvem é bloqueada pelo proxy; o teste usa dois processos reais conectados por TCP de loopback. No uso real, os PCs devem compartilhar uma rede de confiança e o anfitrião deve permitir TCP 48230 no firewall privado. Nenhuma porta de roteador precisa ser aberta para LAN.
