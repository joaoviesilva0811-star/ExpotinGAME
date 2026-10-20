# Validação da versão 1.6.0

Executada em Linux com Node 24.19.0, Chromium e Electron 44.9.0, em 20/10/2026.

- `npm test`: 63 testes passaram. Os nove novos cobrem sequências distintas por habilidade, liberação alinhada ao dano oficial, continuidade das fases dos chefes, orientação dos lacaios e adaptação de efeitos sem tocar nos recursos de combate.
- `scripts/strike-review.js`: 30 folhas com 1.840 quadros de origem carregadas pelo cache real. Todas as poses de cada direção são distintas, sem alfa visível nos dois pixels externos do cache nem silhuetas cortadas na borda dos PNGs. Os ataques somam 736 quadros de heróis, 544 de chefes e 184 de lacaios; outras seis folhas acrescentam 376 poses de caminhada. A revisão inclui as oito direções e 30 imagens renderizadas diferentes em meio segundo por mistura de poses. Essas imagens interpoladas não são contadas como novos sprites. Total armazenado: 2.824 quadros de atores, mais 54 de efeitos.
- `scripts/archer-pc-review.js`: oito flechas disparadas pelo servidor, com corpo e arco alinhados, incluindo a correção por espelhamento das vistas leste.
- `scripts/polish-review.js`: caminhada de 12 poses dos chefes, reações de dano, margens dos caches, configurações de qualidade/iluminação e limites de partículas preservados.
- `scripts/effect-clipping-review.js`: os 54 quadros de efeitos e 432 combinações de orientação permanecem inteiros. Os volumes no ar não sofrem máscara circular nem anular.

Comparação de apresentação em renderização por software nesta máquina da nuvem (`scripts/render-benchmark.js`, canvas 1200×760, 35 quadros de aquecimento e 180 medidos):

| Cena determinística | Antes | 1.6 | P95 da 1.6 |
| --- | --- | --- | --- |
| Regular: quatro heróis, chefe, dez lacaios, projéteis e um impacto periódico | 48,2 FPS | 59,7 FPS | 16,7 ms |
| Estresse: três impactos gigantes simultâneos a cada 0,8 s | 13,5 FPS | 35,4 FPS | 33,4 ms |
| Mesmo estresse no preset baixo | 32,2 FPS | 45,6 FPS | 33,4 ms |

A 1.6 usa um cache compartilhado de subposes de caminhada limitado a 32 MiB, cache de caminhos, partículas em lote, texturas de volumes menores e adaptação automática de densidade. Portanto, a comparação inclui redução de efeitos transitórios quando o renderizador fica lento. As áreas completas e seus contornos de perigo permanecem. Chamadas de `stroke` por quadro caíram de 646 para 173 na cena regular e de 2.118 para 197 no estresse. São cenários de apresentação, não partidas, e a máquina está sujeita a variações de carga; não são resultados de Windows nem garantia de 60 FPS.

- `scripts/native-fps.js`: medição separada no aplicativo empacotado, arqueiro com dois companheiros, comandos normais, sem captura de vídeo nem leituras de imagem durante as amostras. Nas 45 amostras de um segundo de batalha, mediana de **54,1 FPS**, mínimo de **12,9 FPS** e mediana de CPU de desenho de **1,85 ms**. Canvas lógico 1200×760, janela 1440×960, Electron com GPU desativada. Os picos ainda causam quedas nesta máquina; a meta de 60 FPS não é um bloqueio garantido. A adaptação ficou habilitada e sua intensidade é registrada por amostra.

- `scripts/desktop-smoke.js`: aplicativo empacotado com Node incluso; áudio do menu, troca de classe e bots, diálogo, emote, dash com custo, combate, duas instâncias nativas no mesmo chefe por TCP 127.0.0.1 e reconexão passaram.
- `scripts/preferences-smoke.js`: opções persistem em uma nova porta/origem solo; inclui desativação da adaptação automática. IPC continua sanitizando campos e valores.
- `scripts/area-effects-review.js`: alfa positivo dentro do impacto e zero fora dele e no centro seguro de um anel, após as otimizações dos caminhos.
- Dados de medições e revisão: `docs/benchmarks/v1.6.0.json`.

As folhas novas têm seis a oito poses por direção e são misturadas a cada quadro do renderizador. Não são 60 desenhos originais por segundo nem animação por esqueleto. A nova arte mantém a separação entre visual e combate: vida, dano, energia e IA não foram alterados. Os tempos das chaves e a pontuação de combos mudaram explicitamente.

- `scripts/couch-smoke.js`: três dispositivos virtuais Xbox/PlayStation controlam três sessões autenticadas reais no aplicativo empacotado. Movimentos e miras independentes, habilidades executadas uma vez por pressão, dash com custo, exclusão do teclado/mouse durante combate, HUD por família e reconexão passaram. Inclui queda do socket primário, transferência de liderança e início pelo segundo controle. Cinco ciclos de menu mantêm uma única janela nativa e no máximo uma trilha musical ativa; ajustes de música funcionam dentro do menu. São entradas virtuais na Gamepad API, não controles físicos USB/Bluetooth.
- Caminhada dos três chefes sob hits contínuos continua percorrendo as 12 poses; não fica presa na reação de dano. Novas transições usam superfícies reutilizadas com alfa premultiplicado.
- Chaves não podem ser recolhidas nos primeiros 2,5 s, ficam em apresentação por pelo menos 8,5 s e mantêm pelo menos 4,5 s de destaque após a coleta. A sequência de corredor/final aguarda esse destaque. Teste adicional cobre esses tempos.
- Combos só recebem dano positivo oficial, limitam a contagem de hits simultâneos, têm multiplicador de pontos limitado a 1,75 e não alteram dano. Comandos de combo falsos não têm efeito; dano sofrido interrompe a cadeia, esquiva válida preserva.
- As quatro trilhas foram recompostas e normalizadas com destino -16 LUFS. O menu renderizado mede aproximadamente -16 LUFS, pico real -5,2 dBFS; o volume padrão de reprodução passou de 0,36 para 0,68. Música e efeitos têm ajustes independentes.

- `scripts/walk-smoothing-review.js`: mistura de caminhada compartilhada entre atores, com limite de 32 MiB para texturas. Evita enviar uma superfície nova por lacaio a cada quadro. Ataques mantêm mistura contínua; subposes de caminhada pré-calculadas não entram na contagem de desenhos originais.

- `scripts/native-keys-preview.js`: partida nativa completa na versão final com arqueiro e dois NPCs mortais, três vitórias, 2021 pontos, as três chaves e Câmara da Coroa aberta. Combate por rodada: 76 / 103 / 137 s. Nenhum erro JavaScript. O controlador de aceitação envia intenções normais e não modifica vida, dano, energia ou relógios do servidor. A gravação completa de validação usa trechos dessa partida, codificados em 60 FPS; isso não garante 60 quadros únicos por segundo durante a captura na nuvem. A trilha original é adicionada ao MP4, sem captura ao vivo dos efeitos sonoros.
- ZIP Windows final: 261 arquivos com CRC verificado e 164 arquivos de código/recursos comparados byte a byte com o repositório; executável e Node PE x64. As 13 partes reconstroem 431,518,751 bytes; SHA-256 `96ecba99a198c0e01b7c5b4e53781ed9757893cb87faf472b7bb0cbc3620bba3`.

- `scripts/record-controls-preview.js`: prévia publicada, com aproximadamente 64 segundos de chegada e combate, com 2.911 quadros capturados pelo aplicativo nativo. O driver opera um controle virtual Xbox pela Gamepad API; os pacotes de jogo permanecem os produzidos pelo cliente, incluindo previsão local, mira, habilidades e bloqueio de teclado/mouse. Isso evita a divergência visual de uma automação que troca intenções somente na camada WebSocket. Não altera estado ou recursos do servidor. MP4 codificado a 60 FPS; a cadência efetiva da captura varia. A música original é adicionada ao vídeo.

Registros anteriores:

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

A revisão final separa o contador de combos do painel das chaves e o oculta nas cenas da história. A prévia publicada foi regravada com esse ajuste.
