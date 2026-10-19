# Validação da versão 1.4

Executada em Linux com Node 24.19.0, Chromium e Electron 44.9.0, em 19/10/2026.

- `npm test`: 41 testes passaram, zero falhas ou pulados. Inclui autenticação/sessões SQLite, duas conexões WebSocket reais, salas, combate, energia, defesa, revive, derrota/vitória, 24 padrões, fases, hitboxes de anel/faixa, dash, minions, poções, veneno em lacaios, remoção de cosméticos, emotes e oito direções de mira/disparo.
- `scripts/archer-pc-review.js`: oito disparos reais por comandos normais, com eventos autoritativos e poses do mesmo snapshot. Conferência visual das poses espelhadas para leste/nordeste/sudeste; a verificação anterior de índices diferentes não detectava o capuz virado na arte.
- `scripts/area-effects-review.js`: superfície de impacto com alfa positivo no interior e alfa zero no centro seguro e fora do anel; captura das três famílias de erupções em círculos, anéis, cones e faixas.
- `test/aim.test.js`: habilidades imediatamente após entrada usam os eixos cardinais e diagonais exatos; inclui componente zero, orientação no evento, dash e seleção de pose do arqueiro durante mira, disparo e dano.
- `scripts/full-match.js`: quatro sessões de navegador independentes completaram as três rodadas com três vitórias e resultado compartilhado. Revisão final com os 24 padrões e novas ondas: 1.840 pontos, três vitórias; dano individual de 6.467,4 / 5.352,4 / 8.596,1 / 6.604,1. A automação envia apenas comandos normais e não altera estado, dano, vida ou tempo do servidor. Inclui as três apresentações, passagens pelo corredor, epílogo e resultado final; nenhuma página apresentou erro JavaScript.
- `scripts/desktop-smoke.js`: aplicação Linux equivalente empacotada com Node incluso, tema de menu realmente reproduzido, troca de classe/bots, diálogo, emote, dash com custo, combate, duas instâncias conectadas por TCP em 127.0.0.1 e reconexão. Capturas mostram o aplicativo real.
- O vídeo usa screencast do aplicativo real, incluindo chegada, diálogo, despertar, emote, dash e combate, precedido de capturas do menu e da sala. A trilha original de batalha foi acrescentada à gravação; os efeitos sonoros não são uma gravação ao vivo da partida.
- `npm run build:windows`: executável PE x64 e runtime oficial incluídos, com checksums oficiais verificados. ZIP e partes de distribuição têm SHA-256 e são reconstruídos/verificados antes da release.

Os atlas possuem 732 quadros novos desenhados. As direções são selecionadas pela mira real; o sentido sudoeste do acólito usa o espelhamento de uma sequência compatível. Os chapéus foram removidos nesta revisão.

Não houve execução do `.exe` em um Windows físico, teste entre dois PCs físicos, teste de carga amplo ou playtest externo. A rede privada da máquina na nuvem é bloqueada pelo proxy; o teste usa dois processos reais conectados por TCP de loopback. No uso real, os PCs devem compartilhar uma rede de confiança e o anfitrião deve permitir TCP 48230 no firewall privado. Nenhuma porta de roteador precisa ser aberta para LAN.

Os testes de geometria verificam distribuição pelo interior, largura das faixas e exclusão dos centros seguros. O teste de reviver isola o cronômetro de ataques autônomos, mantendo interrupção manual por dano e a verificação dos quatro segundos. A simulação de equipe usa combate normal e conclui os 24 padrões com as ondas maiores.

- `scripts/effect-models-review.js`: nove modelos distintos carregados e desenhados, com 54 quadros em três atlas transparentes. A escolha semântica de todos os modelos está coberta por teste.
