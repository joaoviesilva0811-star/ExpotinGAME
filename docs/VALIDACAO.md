# Validação da versão 1.5.0

Executada em Linux com Node 24.19.0, Chromium e Electron 44.9.0, em 20/10/2026.

- `npm test`: 54 testes, zero falhas ou pulados. Inclui aceleração em 30/60/144Hz, antecipação visual limitada, colisões, raiz imobilizadora, interpolação, 12 poses de perseguição, hurt cam, resgate coordenado, chaves por proximidade, comandos falsos rejeitados, vitória parcial sem final secreto, desconexão durante a coleta e limpeza ao reiniciar. Também preserva os testes de combate, recursos, salas e duas conexões WebSocket reais.
- `scripts/polish-review.js`: as 252 novas poses foram carregadas e desenhadas. Cada sequência de caminhada tem 12 imagens distintas e cada direção de dano tem quatro, sem alfa visível na borda externa do cache. A perseguição de cada chefe realmente percorre 12 poses. Opções de qualidade e iluminação persistem após recarregar. Revisão por contato das vistas sul/leste/norte/oeste; vistas leste inconsistentes são espelhadas no cache.
- `scripts/archer-pc-review.js`: oito tiros autoritativos reais, incluindo vistas leste/oeste, continuam alinhados ao corpo e ao arco. Durante mira/disparo, reação de dano é aditiva para preservar a direção.
- `scripts/effect-clipping-review.js`: 54 quadros de efeitos e 432 combinações de pose/orientação continuam inteiros, inclusive volumes sobre ataques em anel.
- `scripts/full-match.js`: quatro sessões independentes completaram as três batalhas com comandos normais. Todos receberam 1.815 pontos, três vitórias, as chaves `iron-crown`, `living-root`, `void-wing`, abertura da câmara e resultado idêntico. Dano individual: 6.216,2 / 6.343,5 / 8.737,5 / 5.994,8. Nenhum erro JavaScript. Não altera vida, dano ou cronômetro do servidor.
- `scripts/desktop-smoke.js`: aplicativo empacotado, Node incluso, áudio do menu, solo com as outras duas classes, entrada/diálogo/despertar, emote, dash com custo, combate, duas instâncias nativas por TCP 127.0.0.1 e reconexão passaram.
- ZIP Windows 1.5.0: 220 arquivos com CRC conferido, executáveis PE x64 e runtime oficial incluídos. As 11 partes do repositório reconstroem exatamente o ZIP de 349.178.249 bytes; SHA-256 `f4ccf0ee808778ff29c09e53396913c19345f723c1882add75d74a470d57cbc9`.

- `scripts/native-keys-preview.js`: uma partida completa no aplicativo empacotado com arqueiro e dois NPCs mortais, controlando a conta humana somente com comandos normais. Três vitórias em 74 / 99 / 139 segundos de combate; 1.643 pontos, três chaves e porta secreta aberta. Dano individual 6.812,2 / 7.354,4 / 9.566,4; dano recebido 176 / 255,5 / 394,5. Nenhum erro JavaScript. A prévia nova é screencast de trechos dessa partida nativa: apresentações, combate, chaves, corredores e final. Cenas gravadas preservam seu tempo normal; os intervalos entre trechos foram cortados. A trilha original foi adicionada ao vídeo; não é captura ao vivo dos efeitos sonoros.
- Medição de 126 amostras durante a partida nativa em renderização por software e captura de vídeo: medianas de FPS 52,6 / 42,9 / 51,6 e CPU de desenho 1,46 / 1,58 / 1,28ms por quadro, com picos amostrados de até 1.483 partículas. Houve quedas amostradas a 13,1 FPS durante essa execução na nuvem. Estes valores incluem captura, leituras de imagem e outras tarefas de verificação; não são benchmark do Windows nem garantia de 60 FPS. O contador permite medir no PC do usuário e reduzir os efeitos se necessário.
- Estresse de apresentação com 40 impactos simultâneos por preset: partículas limitadas a 500/1000/1800, fumaça dentro de 18/48/96, luzes dentro de 8/16/24 e objetos expirados reaproveitados pelo pool. Os três casos retornaram a zero partículas vivas após a animação.

- `scripts/preferences-smoke.js`: duas aberturas reais do modo solo em origens/portas diferentes preservam efeitos baixos, iluminação desligada, FPS visível e tremor zero. Preferências são lidas do perfil do aplicativo; campos extras e valores inválidos são sanitizados pelo processo principal.

Os 108 novos quadros de caminhada usam três vistas com espelhamento para oeste; os 144 de dano usam quatro vistas. Junto aos 732 anteriores, somam 984 quadros de atores, com 54 quadros de efeitos contados à parte. Transições de pose em Canvas e transformações secundárias não são animação por esqueleto. Iluminação e sombras são efeitos 2D, sem oclusão física.

Não houve execução do `.exe` em Windows físico, teste entre dois PCs físicos, teste de carga amplo ou playtest externo. O aplicativo equivalente foi executado em Linux. O teste TCP usa loopback; no uso real os PCs precisam compartilhar a rede e o anfitrião permitir TCP 48230 no firewall privado.

Registro das versões anteriores:

# Validação da correção 1.4.1

- `npm test`: 43 testes, incluindo verificação das 732 poses e das 113 que ultrapassavam o cache anterior. Armas e membros ficam inteiros sem mudar a referência de posição ou escala do corpo.
- `scripts/effect-clipping-review.js`: revisão de margens de todos os 54 quadros de efeitos e renderização de 432 combinações de pose/orientação, sem cortes no cache nem máscara circular sobre volumes no ar.
- `scripts/weapon-clipping-review.js`: personagens e chefes desenhados com as armas completas; a imagem indica a borda do cache antigo para comparação.
- A correção altera arte e renderização; o combate autoritativo e as geometrias de dano da 1.4 permanecem iguais.

Abaixo, registro dos testes da versão 1.4 que estabelecem a base desta correção. As limitações de execução em Windows físico e entre PCs físicos continuam valendo.

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
