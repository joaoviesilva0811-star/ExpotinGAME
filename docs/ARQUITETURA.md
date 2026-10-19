# Arquitetura e regras

O cliente é uma aplicação de Canvas 2D com interface HTML. Arte, partículas, áudio e interpolação são locais; nenhum resultado de combate é decidido pelo cliente. O atlas em `public/assets/characters.png` é a adaptação em visão de cima gerada nesta conversa, usada diretamente pelo renderizador. O original tem transparência alfa, inclusive onde a prévia do chat exibe uma cor de fundo.

O servidor HTTP também pode servir o cliente. Em produção, o cliente pode ficar na InfinityFree e o backend em outro domínio. Requisições REST são usadas para autenticação, lista de salas e ranking. Uma conexão WebSocket autenticada por token transporta intenções e snapshots.

Fluxo de partida: `lobby → countdown → battle → round_end → countdown → battle → ... → finished`. Toda rodada começa com 3s de preparação. Intervalos duram 7s. Somente o líder inicia ou retorna ao lobby; todos precisam estar conectados e prontos para iniciar. Uma derrota não impede tentar as arenas seguintes; a vitória completa exige as três vitórias.

O servidor calcula movimento a 20 Hz, normaliza a direção, suaviza aceleração e limita a arena. Inputs param após 0,6s sem atualização, evitando personagem preso andando quando a conexão cai. Obstáculos sólidos impedem passagem. Projéteis usam colisão por segmento. O ataque corpo a corpo exige alcance, direção e linha livre em relação aos pilares. A habilidade de teleporte/investida percorre passos pequenos, sem atravessar pilares ou bordas.

Cada comando de combate tem sequência crescente; duplicatas e sequências antigas são descartadas. O servidor não usa valores de dano, vida, posição ou energia enviados pelo cliente. Há limite de tamanho e frequência de mensagens. Recargas e recursos são oficiais no servidor. O cliente recebe timestamps para desenhar as recargas; editar o HUD não altera a simulação.

Os chefes alternam alvos a cada ataque, perseguem alvos vivos, preparam áreas visíveis, executam e recuperam. Fases de transição duram 1,5s com imunidade. Varkhul acelera os encadeamentos abaixo de 40%, Tharazul cria raízes sólidas abaixo de 50%, Azrakiel adiciona zonas abaixo de 35%. Alguns golpes ignoram a redução da defesa comum. A Muralha Real ainda é uma proteção distinta. Veneno usa dano periódico e não se acumula consigo mesmo para o mesmo ladino.

Vida dos chefes: `vida_base × (0,25 + 0,1875 × jogadores)`, arredondada. Bases para quatro jogadores: 1200/1600/2200. Não se reduz a vida do chefe quando um participante sai durante uma rodada.

Pontuação: cada vitória dá 100/150/250 pontos, mais `floor(segundos_restantes / 3)`; vencer as três adiciona 150. No final, soma-se por jogador `floor(dano_real / 30 + dano_bloqueado / 8 + revives × 30)`. Dano excedente ao HP restante não conta. Habilidades só contam ao serem aceitas, mas sua repetição não gera pontos por si só. Ranking e recorde de formação são gravados em SQLite no fim da expedição.

As sessões são aleatórias, nunca derivadas do nome ou do código da sala. O banco guarda somente SHA-256 do token, além do identificador da sessão, nome e validade. Senhas são derivadas com `scrypt`, sal aleatório e comparação em tempo constante. Nomes iguais não autorizam assumir uma sessão. A mesma sessão aberta em outra aba substitui a conexão anterior.

As salas ficam em memória e não sobrevivem a reinício. A reconexão preserva a sessão e o estado existente por até 60s. O líder passa para um aliado conectado quando cai. Em uma queda total, a batalha pode ser perdida enquanto não há jogadores ativos. Para escala horizontal ou tolerância a reinício seria necessário armazenamento compartilhado e coordenação de partidas, que não estão implementados.


## Edição PC e companheiros (1.1)

Electron abre um menu local com preload mínimo e IPC validado pela origem do arquivo. A janela de jogo é separada, sem integração Node, com sandbox e isolamento de contexto. O servidor usa um processo filho do Node oficial incluído no pacote, para manter compatibilidade com SQLite; não depende do Node da instalação do usuário. Dados ficam no perfil do usuário.

Solo escuta somente em 127.0.0.1, em porta livre. LAN escuta em 0.0.0.0:48230; clientes do aplicativo conectam ao IPv4 privado informado. Fechar a janela de jogo do anfitrião encerra seu servidor. Não há migração de servidor.

`server/bots.js` decide intenções a cada 150ms: busca alcance adequado, considera áreas perigosas e obstáculos, usa habilidades com recargas normais, defende e tenta reviver. As intenções passam pelos mesmos comandos e funções de combate dos humanos. Não há vida ou dano especial. No solo, `syncBots` cria somente as outras duas classes. No lobby LAN, completar classes com IA é opcional; humanos têm prioridade nos slots. Bots nunca são líderes.
