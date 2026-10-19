# Arquitetura e regras

O cliente é uma aplicação de Canvas 2D com interface HTML. Arte, partículas, áudio e interpolação são locais; nenhum resultado de combate é decidido pelo cliente. O atlas em `public/assets/characters.png` é a adaptação em visão de cima gerada nesta conversa, usada diretamente pelo renderizador. O original tem transparência alfa, inclusive onde a prévia do chat exibe uma cor de fundo.

O servidor HTTP também pode servir o cliente. Em produção, o cliente pode ficar na InfinityFree e o backend em outro domínio. Requisições REST são usadas para autenticação, lista de salas e ranking. Uma conexão WebSocket autenticada por token transporta intenções e snapshots.

Fluxo de partida: `lobby → countdown → battle → round_end → countdown → battle → ... → ending → finished`. Toda rodada tem 17,7s de chegada/portão/diálogo/despertar/contagem, fora do cronômetro. Intervalos duram 11s, com corredor nos últimos 5s. O epílogo dura 14s antes das estatísticas finais. Somente o líder inicia ou retorna ao lobby; todos precisam estar conectados e prontos para iniciar. Uma derrota não impede tentar as arenas seguintes; a vitória completa exige as três vitórias.

O servidor calcula movimento a 20 Hz, normaliza a direção, suaviza aceleração e limita a arena. Inputs param após 0,6s sem atualização, evitando personagem preso andando quando a conexão cai. Obstáculos sólidos impedem passagem. Projéteis usam colisão por segmento. O ataque corpo a corpo exige alcance, direção e linha livre em relação aos pilares. A habilidade de teleporte/investida percorre passos pequenos, sem atravessar pilares ou bordas.

Cada comando de combate tem sequência crescente; duplicatas e sequências antigas são descartadas. O servidor não usa valores de dano, vida, posição ou energia enviados pelo cliente. Há limite de tamanho e frequência de mensagens. Recargas e recursos são oficiais no servidor. O cliente recebe timestamps para desenhar as recargas; editar o HUD não altera a simulação.

Os chefes alternam alvos a cada ataque, perseguem alvos vivos, preparam áreas visíveis, executam e recuperam. Fases de transição duram 1,5s com imunidade. Varkhul acelera os encadeamentos abaixo de 40%, Tharazul cria raízes sólidas abaixo de 50%, Azrakiel adiciona zonas abaixo de 35%. Alguns golpes ignoram a redução da defesa comum. A Muralha Real ainda é uma proteção distinta. Veneno usa dano periódico e não se acumula consigo mesmo para o mesmo ladino.

Vida dos chefes: `vida_base × (0,25 + 0,1875 × jogadores)`, arredondada. Bases para quatro jogadores: 5600/7200/9200. Não se reduz a vida do chefe quando um participante sai durante uma rodada.

Pontuação: cada vitória dá 100/150/250 pontos, mais `floor(segundos_restantes / 3)`; vencer as três adiciona 150. No final, soma-se por jogador `floor(dano_real / 30 + dano_bloqueado / 8 + revives × 30)`. Dano excedente ao HP restante não conta. Habilidades só contam ao serem aceitas, mas sua repetição não gera pontos por si só. Ranking e recorde de formação são gravados em SQLite no fim da expedição.

As sessões são aleatórias, nunca derivadas do nome ou do código da sala. O banco guarda somente SHA-256 do token, além do identificador da sessão, nome e validade. Senhas são derivadas com `scrypt`, sal aleatório e comparação em tempo constante. Nomes iguais não autorizam assumir uma sessão. A mesma sessão aberta em outra aba substitui a conexão anterior.

As salas ficam em memória e não sobrevivem a reinício. A reconexão preserva a sessão e o estado existente por até 60s. O líder passa para um aliado conectado quando cai. Em uma queda total, a batalha pode ser perdida enquanto não há jogadores ativos. Para escala horizontal ou tolerância a reinício seria necessário armazenamento compartilhado e coordenação de partidas, que não estão implementados.


## Edição PC e companheiros (1.1)

Electron abre um menu local com preload mínimo e IPC validado pela origem do arquivo. A janela de jogo é separada, sem integração Node, com sandbox e isolamento de contexto. O servidor usa um processo filho do Node oficial incluído no pacote, para manter compatibilidade com SQLite; não depende do Node da instalação do usuário. Dados ficam no perfil do usuário.

Solo escuta somente em 127.0.0.1, em porta livre. LAN escuta em 0.0.0.0:48230; clientes do aplicativo conectam ao IPv4 privado informado. Fechar a janela de jogo do anfitrião encerra seu servidor. Não há migração de servidor.

`server/bots.js` decide intenções a cada 150ms: busca alcance adequado, considera áreas perigosas e obstáculos, usa habilidades com recargas normais, defende e tenta reviver. As intenções passam pelos mesmos comandos e funções de combate dos humanos. Não há vida ou dano especial. No solo, `syncBots` cria somente as outras duas classes. No lobby LAN, completar classes com IA é opcional; humanos têm prioridade nos slots. Bots nunca são líderes.


## Expansão 1.2

`bosses.js` define seis padrões por chefe e suas geometrias. `hazardContains` em `shared.js` é a definição comum de alcance para o servidor e companheiros. Cones, linhas e anéis com centro seguro têm avisos separados da execução. A fase 2 começa em 65–70% e a fase 3 em 30–35%; transições cancelam ataques futuros. Preparação nas fases avançadas reduz o dano recebido pelo chefe em 35%, deixando a recuperação como janela ofensiva.

`minions.js` administra invocações limitadas, mira fixada antes do ataque, projéteis e perseguição. `loot.js` gera os drops no servidor, limita inventário a três itens, valida coleta por proximidade e valida consumo. Jogadores incapacitados não usam itens ou dash. Poções não exigem energia, mas exigem posse e recarga de 1,25s; dash custa 20 com recarga de 2,4s e invulnerabilidade de 0,24s.

Chapéu é um enum validado no lobby. Emotes também são enums, possuem recarga de 5s e duração de 3,6s, cancelados por ação ou dano. Mudanças são parte do snapshot compartilhado; o cliente só desenha.

`animation.js` escolhe frames pelo estado e timestamps do servidor, pela distância percorrida e pelo ângulo de mira em oito setores. A análise de alfa salva coordenadas em JSON, sem alterar as artes originais. `telegraphs.js` desenha a mesma geometria das colisões. `vfx.js` limita partículas a 680 e rachaduras a 80; o renderizador antigo mantém até 400 fragmentos leves adicionais. `ARENA_OBSTACLES` é compartilhado por física e renderização; cobre paredes, árvores, bancos, pedras e barricadas.

A música e os sons Ogg ficam no pacote. `compose-audio.py` permite reconstruir a composição própria com numpy e FFmpeg; esses programas são ferramentas opcionais de desenvolvimento, não requisitos dos jogadores.

`scenes.js` calcula a posição visual durante chegada, travessia e epílogo usando timestamps compartilhados. Essas posições são somente apresentação; o servidor só habilita movimento e combate ao entrar em `battle`. `story.js` contém três capítulos, duas pontes e os desfechos de vitória completa, parcial e derrota. O servidor publica o resultado e grava o recorde já em `ending`, sem esperar o fim do epílogo.

`ARENA_OBSTACLES` contém centros físicos e recortes de oclusão alinhados à ilustração de cada arena. O renderizador redesenha os objetos na ordem de profundidade para cobrir personagens que passam atrás deles.

## Revisão 1.3

`animation-state.js` mantém a pose direcional do arqueiro durante mira, disparo e dano. O servidor aceita a direção na própria entrada e normaliza componentes zero sem substituir um eixo válido pela mira anterior. `aimDirection` também orienta habilidades e dash. O cliente recalcula a mira a partir da posição atual da câmera.

`ui-iron-frame.png` é uma moldura original usada por nove recortes CSS nos menus, retratos e HUD; o centro é transparente. Falas usam retratos e revelação por tempo compartilhado, sem mudar a duração da cena. Os chapéus foram removidos do cliente e do estado da sala.

Telegraphs mantêm a geometria do dano, com contornos separados para anéis. Rastros de armas são polígonos afilados; partículas e projéteis permanecem limitados por orçamento local e não decidem colisões ou dano.

## Revisão 1.4

`archerDirection` seleciona as poses oeste/noroeste/sudoeste verificadas e espelha para leste/nordeste/sudeste, corrigindo a orientação do capuz nos próprios desenhos. O teste de revisão captura flechas reais e usa a pose do mesmo snapshot, em vez de verificar apenas índices distintos.

`impact-geometry.js` distribui pontos pelo interior e pela largura das hitboxes. `vfx.js` usa o mesmo contorno como recorte para superfícies de impacto e frentes de choque; furos seguros ficam sem preenchimento. Até 16 superfícies transitórias e 1.800 partículas permanecem ativas. Os atlas `fx-eruptions.png`, `fx-physical.png` e `fx-occult.png` contêm 54 quadros; `volumes.js` mantém as imagens em cache, registra o contato com o chão e suaviza bordas dos recortes apenas na renderização. Até 96 partículas de fumaça e 160 erupções são desenhadas simultaneamente. As marcações futuras são redesenhadas por cima do volume. Lacaios têm orçamento por tamanho de equipe e fase, máximo de dez, com invocação anunciada e dano controlado pelo servidor.

`chooseBossAttack` separa padrões próximos e distantes para cada chefe, evita repetição imediata e alterna alvos. Os novos padrões 6 e 7 trazem controle a distância e pressão próxima. Todas as áreas ficam fixas após o aviso, e transições de fase cancelam preparações/rajadas pendentes. O evento `shot` publica a direção real do projétil no instante do disparo, inclusive quando uma cobertura o absorve antes do próximo snapshot.

Nove modelos de impacto distinguem brasas, corte de aço, onda de pedras, raízes, nuvem venenosa, correntes, cristais, corte de foice e fenda do vazio. A seleção usa o tipo de área publicado pelo servidor; cortes acompanham o ângulo do golpe e nuvens de veneno não usam raízes.

## Correção 1.4.1

`animation-layout.js` mantém as dimensões lógicas de cada personagem como referência de posição, porém dimensiona o cache para conter armas e membros que ultrapassam essa referência. O desenho compensa a margem sem mudar o corpo ou a escala. O inventário dos 732 quadros identifica 113 poses que ultrapassavam o cache anterior; a verificação inclui todas as poses armazenadas.

Os efeitos usam nove folhas individuais `fx-<modelo>.png`, com duas colunas e três linhas. `volumes.js` conserva as células inteiras com margem adicional, sem máscara para disfarçar cortes. A análise de alfa calcula o contato real com o chão e a largura de referência do modelo; partículas e projéteis também desenham a imagem completa. As folhas antigas de três linhas são preservadas como referências de arte, mas não são carregadas pelo renderizador.

`drawGroundFX` continua recortando o chão à geometria do dano. `drawFX` desenha os volumes completos no ar, sem abrir um buraco circular no meio das raízes ou da fumaça. Uma borda sobreposta mantém o centro seguro do anel identificável; a colisão não mudou.

`analyze-effects.py` encontra faixas transparentes reais e salva `effect-frames.json`, sem editar os originais. O cache usa essas coordenadas em vez de supor células iguais; o contato com o chão é registrado pela base de cada pose. Isso preserva, por exemplo, a base dos portais que cruza a divisão nominal de uma folha.
