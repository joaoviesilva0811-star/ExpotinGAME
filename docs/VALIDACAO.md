# Validação da versão 1.3

Executada em Linux com Node 24.19.0, Chromium e Electron 44.9.0, em 19/10/2026.

- `npm test`: 35 testes passaram, zero falhas ou pulados. Inclui autenticação/sessões SQLite, duas conexões WebSocket reais, salas, combate, energia, defesa, revive, derrota/vitória, 18 padrões, fases, hitboxes de anel/faixa, dash, minions, poções, veneno em lacaios, remoção de cosméticos, emotes e oito direções de mira/disparo.
- `scripts/visual-smoke.js`: preparação desktop e móvel sem chapéus, diálogos reais de herói/chefe com retratos, marcações de combate, oito sprites de tiro distintos mesmo durante dano e quadro de revisão de efeitos. Sem erros JavaScript. A revisão visual identificou e corrigiu a sobreposição da legenda e o transbordamento horizontal da preparação no celular.
- `test/aim.test.js`: habilidades imediatamente após entrada usam os eixos cardinais e diagonais exatos; inclui componente zero, orientação no evento, dash e seleção de pose do arqueiro durante mira, disparo e dano.
- `scripts/full-match.js`: quatro sessões de navegador independentes completaram as três rodadas com três vitórias e resultado compartilhado. Pontuação observada: 1.780; dano individual aproximado: 5.314 / 5.596 / 6.371 / 6.067. A automação envia apenas comandos normais e não altera estado, dano, vida ou tempo do servidor. Inclui as três apresentações, passagens pelo corredor, epílogo e resultado final; nenhuma página apresentou erro JavaScript.
- Simulação autoritativa de quatro participantes: chefes derrotados em cerca de 63 / 80 / 124 segundos, com dano recebido, recursos gastos e incapacitações. Esses tempos não são garantidos para jogadores.
- `scripts/desktop-smoke.js`: aplicação Linux equivalente empacotada com Node incluso, tema de menu realmente reproduzido, troca de classe/bots, diálogo, emote, dash com custo, combate, duas instâncias conectadas por TCP em 127.0.0.1 e reconexão. Capturas mostram o aplicativo real.
- O vídeo usa screencast do aplicativo real, incluindo chegada, diálogo, despertar, emote, dash e combate, precedido de capturas do menu e da sala. A trilha original de batalha foi acrescentada à gravação; os efeitos sonoros não são uma gravação ao vivo da partida.
- `npm run build:windows`: executável PE x64 e runtime oficial incluídos, com checksums oficiais verificados. ZIP e partes de distribuição têm SHA-256 e são reconstruídos/verificados antes da release.

Os atlas possuem 732 quadros novos desenhados. As direções são selecionadas pela mira real; o sentido sudoeste do acólito usa o espelhamento de uma sequência compatível. Os chapéus foram removidos nesta revisão.

Não houve execução do `.exe` em um Windows físico, teste entre dois PCs físicos, teste de carga amplo ou playtest externo. A rede privada da máquina na nuvem é bloqueada pelo proxy; o teste usa dois processos reais conectados por TCP de loopback. No uso real, os PCs devem compartilhar uma rede de confiança e o anfitrião deve permitir TCP 48230 no firewall privado. Nenhuma porta de roteador precisa ser aberta para LAN.
