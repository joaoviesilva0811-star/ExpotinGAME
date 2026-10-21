# Validação da versão 1.9.0

Executada em Linux com Node 24.19.0 e Electron 44.9.0, em 20/10/2026 (America/Sao_Paulo; 21/10 UTC). Sem teste físico de Windows ou controles USB/Bluetooth.

- `npm test`: **79 testes**, cobrindo os anteriores mais cobertura autoritativa sem farm de pontos, colisão de flechas, reinício da geometria por rodada, aviso/esquiva das armadilhas, táticas por fase/distância, duração do bônus EXPOSTO, transições de postura, impacto de câmera por classe e limite de luzes adaptativo.
- `scripts/arena-art-review.js`: 159 poses utilizáveis, distintas por grupo e sem cortes nas bordas de origem/cache, seis retratos completos e três arenas com coberturas inteiras/rachadas/destruídas e camadas em cache. Esses renders são fixtures de arte, não capturas de uma partida.
- `scripts/ready-smoke.js`: recursos preparados em aproximadamente 7,7s no ambiente de teste, sem erros. A prontidão espera a preparação, preservando o carregamento fora da luta.
- `scripts/campaign-review.js`, `CAMPAIGN_CLASS=knight`: campanha no aplicativo empacotado, entradas normais por Gamepad API virtual, cavaleiro e dois bots mortais. **Três vitórias, três chaves e Câmara da Coroa**; combates de aproximadamente **54 / 73 / 89s**, oito eventos de quebra de cobertura e nenhum erro de JavaScript. Sem mudar HP, dano ou relógio para o teste. Executada antes do último ajuste de densidade de luzes; a verificação curta de desempenho e a prévia verificam esse ajuste.
- A primeira campanha, com arqueiro, venceu duas arenas e perdeu no chefe final com cerca de 1.053 HP restantes. O caminho de derrota foi exibido corretamente, sem erros. O driver de teste foi corrigido para verificar linha de visão e contornar coberturas ao tentar resgates. Isso altera a automação de QA, não os recursos dos jogadores ou a IA dos companheiros.
- Simulação adicional com quatro fluxos da IA comum e loot determinístico: três vitórias em aproximadamente 61 / 58 / 72s. É verificação de regras, não benchmark de habilidade humana.
- `scripts/couch-smoke.js`: três dispositivos virtuais Xbox/PlayStation, sessões independentes, movimento/mira, habilidades, dash com energia, bloqueio de teclado/mouse, reconexão, cinco ciclos de menu, uma janela e uma trilha passaram.
- `scripts/desktop-smoke.js`: duas instâncias nativas conectadas por TCP 127.0.0.1 quebraram a mesma cobertura por disparos normais; ambas receberam o mesmo estado, compartilharam dano do chefe e a reconexão preservou a identidade. O teste também conferiu menu com áudio, diálogo, despertar, emote e dash com energia.
- `scripts/menu-race-smoke.js`: buscas atrasadas de sala/ranking não substituem menus abertos posteriormente.

ZIP Windows: 496,081,981 bytes, 15 partes, SHA-256 `526a4a3ce5857506815bf7de844596bdf4e8e9fb9cdd43cafa9b49cc3bc5e5e3`. CRC de 306 entradas passou; executável PE x64 e 209 arquivos de código/arte conferidos byte a byte.

A simulação continua autoritativa. A apresentação não usa pausa global nos hits nem mistura de corpos. Os pilares pintados originais são permanentes; as três coberturas adicionais por arena são destrutíveis e não rendem dano/combos na pontuação. O bônus de 12% exige o chefe em recuperação dentro do prazo oficial.

`scripts/performance-review.js`, após o ajuste de luzes: 45 amostras de batalha no aplicativo, qualidade alta/adaptativa, sem captura de vídeo/tela e com entradas normais. Mediana **60 FPS**, menor amostra **38 FPS**, custo JavaScript mediano de aproximadamente **1,2ms**; as luzes temporárias respeitaram o limite adaptativo. É uma rodada curta da primeira arena, não uma nova campanha completa nem garantia universal de 60 FPS.

As campanhas nativas antes desse último ajuste de luzes, em renderização por software, tiveram medianas aproximadas de 54–59 FPS, com quedas pontuais para 28–34 FPS. O custo JavaScript mediano ficou em aproximadamente 1,2ms. Esses dados motivaram o limite adaptativo de luzes temporárias e a redução da camada extra de brilho em carga alta. Não são garantia de 60 FPS em todo PC nem teste de uma GPU física. Dados completos em `docs/benchmarks/v1.9.0.json`; vídeo codificado a 60 FPS não mede a cadência original de captura. A trilha da demonstração é mixada no vídeo, não captura do dispositivo de áudio.

# Histórico: validação da versão 1.8.0

Executada em Linux com Node 24.19.0, Chromium e Electron 44.9.0 em 20/10/2026 (America/Sao_Paulo; 21/10 UTC). Aplicativo Linux equivalente; não houve execução física do Windows nem controles USB/Bluetooth.

- `npm test`: **72 testes passaram**. Mantidos dano básico 25/32/18, energia, recargas, combate, salas/rede, resgates e chaves. Novos testes cobrem câmera de emote por dono local, variações visuais determinísticas sem alterar hitboxes e prontidão após reconexão no lobby.
- `scripts/clarity-review.js`: 532 poses utilizáveis de movimento/apresentação/emotes, todas distintas por grupo, sem tocar bordas de origem ou do cache; 1.994 poses nas 33 folhas de ataques/caminhada; oito direções disponíveis; 145 quadros de 21 modelos de efeitos. Os pixels de `drawPose` são os da pose de origem selecionada, sem mistura de silhuetas.
- `scripts/strike-review.js`: todas as poses de ataque por direção distintas e completas. `scripts/walk-smoothing-review.js`: chefes usam 24/16/16 poses reais por ciclo; os seis heróis/lacaios mantêm 7–8 por vista, com posição/recuo contínuos. Não são 60 desenhos inéditos por segundo.
- `scripts/effect-clipping-review.js`: **1.160 poses de efeitos renderizadas em oito ângulos**, sem corte nas bordas do destino; efeitos aéreos anulares preservam a silhueta inteira. As folhas novas descartam células com mais de quatro pixels fortes encostando em qualquer margem; brilho fraco isolado não conta como silhueta cortada. Os avisos e espaços seguros seguem a geometria autoritativa.
- `scripts/couch-smoke.js`: três dispositivos virtuais, sessões reais independentes, movimento/mira/habilidades, dash com energia, bloqueio de teclado/mouse na batalha, liderança após queda, reconexão, cinco ciclos de menu, uma janela e no máximo uma trilha ativa passaram.
- `scripts/emote-camera-smoke.js`: no aplicativo empacotado, zoom do emote de 1,55 para aproximadamente 2,03 e retorno para 1,57 ao mover. Logo preservou URL/sala/sessão; endereço inválido voltou a um menu utilizável com mensagem de erro. Sem erros de JavaScript.
- `scripts/menu-race-smoke.js`: respostas atrasadas de salas/ranking não substituem o menu aberto posteriormente nem reabrem diálogos fechados. O teste revelou e corrigiu também um rodapé que cobria o botão de salas em janela baixa.
- `scripts/ready-smoke.js`: preparação completa dos recursos em aproximadamente 5,5s no ambiente de teste. O botão pronto aguarda esse preparo; pedidos de controles durante o carregamento são guardados por sala e cancelados ao trocar classe/voltar.

- `scripts/rescue-review.js`: 192 poses de auxílio/levantar, oito distintas por vista, margens completas. A recuperação exibe cinco poses de origem em meio segundo; não usa mais as trinta misturas artificiais da versão anterior.
- Pacote Windows: 484.081.692 bytes, 15 partes, SHA-256 `80b6d85cb1a8c6e1240336aad90ab249bdae82146d248c2ff23b4f9e4fcdffb1`. CRC de 293 entradas passou, executável PE x64 e 196 arquivos de `public/server/desktop` conferidos byte a byte com o código atual.

- `scripts/desktop-smoke.js`: duas instâncias empacotadas via TCP 127.0.0.1, sala real, dano compartilhado do chefe e reconexão. Menu com áudio, solo com troca de classes/bots, diálogos, despertar, emote e dash com energia também passaram. Não representa teste entre dois PCs físicos na rede.

## Medição das cutscenes

`scripts/cinematic-baseline.js` usa o aplicativo nativo, entradas normais, perfil de CPU e 24 amostras de um segundo, sem gravar vídeo ou alterar estado do servidor. Qualidade alta, ambiente headless sem GPU física. A reprodução inicial mostrou **14 FPS na primeira amostra** durante criação/decodificação dos caches; a mediana da apresentação já era 60 FPS. Não havia limite intencional de 14 FPS.

Após preparar recursos no lobby, remover mistura de silhuetas e evitar leituras repetidas de layout, a execução isolada registrou **54 FPS na primeira amostra**, mediana da apresentação **60 FPS**, com uma queda pontual para 44 FPS. O custo JavaScript médio da primeira amostra caiu de aproximadamente 16,9ms para 0,61ms. As primeiras sete amostras de batalha ficaram em aproximadamente 53–60 FPS. Isso mede este ambiente; não garante 60 FPS em todos os PCs. Uma execução concorrente com outro aplicativo nativo ficou mais lenta e está preservada como dado adicional, não como comparação principal.

As amostras completas, verificações e limites ficam em `docs/benchmarks/v1.8.0.json`. A prévia usa entradas virtuais pelo Gamepad API e o fluxo normal de combate; sua codificação em 60 FPS não mede a cadência original da captura. A trilha do jogo é mixada no arquivo de demonstração; não é captura do dispositivo de áudio.

# Histórico: validação da versão 1.7.0

Executada em Linux com Node 24.19.0, Chromium e Electron 44.9.0, em 20/10/2026. Os dados abaixo distinguem cenários controlados, simulações e execução do aplicativo.

- `npm test`: 69 testes passaram, incluindo dano básico solicitado, custos/recargas preservados, quatro segundos de resgate, interrupção por dano, bloqueio por paredes, bots ajudando outros bots, reserva de resgates humanos, antecipação de perigo e prazos de sangramento.
- `scripts/rescue-review.js`: 192 poses de origem em três folhas, todas distintas por vista, carregadas no cache real. Sem contato de silhuetas com a borda dos PNGs ou alfa nos dois pixels externos do cache. Trinta subquadros diferentes em meio segundo de recuperação, misturados pelo renderizador. Acervo de atores: 3.016 poses desenhadas; subquadros interpolados não são desenhos novos.
- `scripts/balance-review.js`: quatro participantes controlados pela mesma IA e loot determinístico. Com os danos anteriores e vida anterior dos chefes: 83/85/132s; com básico 25/32/18 e chefes com 15% mais vida: 57/63/80s. Ambos completaram três vitórias e todas as três fases por chefe, sem recursos inválidos. É uma simulação de regras, não medição de habilidade de jogadores reais.
- `scripts/couch-smoke.js`: três controles virtuais Xbox/PlayStation, três sessões autenticadas no aplicativo empacotado, movimentos/miras independentes, habilidades por pressão, dash com energia, exclusão de teclado/mouse, liderança após desconexão, reconexão, HUD e cinco ciclos de menu passaram. Uma janela nativa e no máximo uma trilha musical ativa. Não houve teste de controles físicos USB/Bluetooth.

- `scripts/native-rescue-smoke.js`: cenário controlado no servidor para isolar o resgate, visto pelo aplicativo nativo empacotado. Humano com B do controle reviveu um bot em quatro segundos; um bot reviveu o humano; depois um bot contornou um pilar e reviveu outro bot. Poses de auxílio/levantar e progresso autoritativo foram conferidos, sem erros de JavaScript. O teste posiciona atores e incapacita vítimas no servidor; suas imagens são fixtures de validação, não gravação de combate espontâneo.
- `scripts/native-keys-preview.js`, `GAMEPAD_DRIVER=1`: uma partida nativa completa com arqueiro e dois bots mortais, controlada por entradas virtuais normais; três vitórias, 2.129 pontos, combates de 55/80/168s, três chaves e Câmara da Coroa aberta. Nyx realizou um resgate durante o combate. Não houve edição de vida, dano ou relógios do servidor nem erros de JavaScript. Executada antes do último acabamento cosmético de poções/coroas; a revisão de arte e a prévia curta verificam esse acabamento à parte.
- `scripts/item-review.js`: quatro objetos, 32 poses distintas com margens completas no cache: cura, gelo, coroa de ferro e coroa restaurada. Arte de objetos é contada separadamente das poses de atores. Os originais PNG não foram modificados.

Os resgates usam apenas regras oficiais de HP, custo, duração e colisão. A IA procura janelas seguras; ela ainda pode falhar, sofrer dano e morrer. A proteção de 0,65s após reviver é uma mudança explícita, não invulnerabilidade permanente. Não há alteração dos recursos pelo cliente.

A versão 1.7 preserva os caches, a adaptação de efeitos, as opções gráficas e o loop de animação da 1.6. As medições de FPS abaixo são históricas da 1.6; não devem ser apresentadas como novos resultados da 1.7 nem como garantia de 60 FPS. Novos sprites são interpolados entre poses de origem, sem gerar 60 desenhos originais por segundo. O executável Windows físico ainda não foi executado neste ambiente.

## Histórico: validação da versão 1.6.0

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

## Arquivos da distribuição 1.7

- ZIP portátil final: 441.207.004 bytes, 272 entradas. CRC de todas as entradas íntegro; executável com cabeçalho PE x64; 175 arquivos de `public/`, `server/` e `desktop/` conferidos byte a byte contra o código desta versão. Guia do PC também idêntico.
- 14 partes de até 32 MiB reconstruíram o mesmo ZIP. SHA-256: `043d471239213b33a6a4f84aa4542731ef8e4406014f7d74f0d60de39cafed98`.
- Prévia curta de 68,23s: captura do aplicativo empacotado com controle virtual, chegada e combate reais. A trilha original de batalha foi mixada no vídeo; não é captura do áudio nativo. O contêiner foi codificado a 60 FPS, com cadência variável na captura de origem; isso não mede nem garante 60 FPS no jogo.
- Dados e limites desta versão: `docs/benchmarks/v1.7.0.json`. A repetição final do teste de três controles após o acabamento dos ícones também passou.
