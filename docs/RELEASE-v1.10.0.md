# Iron Crown 1.10.0 — Impacto e Imersão

- Câmera do coop acompanha o último jogador de pé e mantém enquadramento válido quando todos caem.
- Hurt cam direcional com impulso, retorno amortecido e limite de deslocamento. Golpes fortes, bloqueios, quebra de defesa e queda têm intensidades diferentes. O tremor de explosões distantes é atenuado e a câmera compartilhada reduz os impactos recebidos.
- Personagens, chefes e lacaios reagem visualmente na direção da origem do dano. Recuo aditivo preserva animações, controles, colisões e a simulação contínua.
- Som grave de contato, estilhaço ao quebrar defesa, vibração conforme o golpe e breve redução da música para destacar o impacto, sem duplicar ou reiniciar faixas.
- Vida recém-perdida permanece dourada antes de desaparecer nas barras do jogador, chefe e três jogadores locais. Bordas discretas e pulso sonoro avisam vida crítica na tela individual, sem desfoque. Reações adicionais podem ser desligadas em Gráficos e áudio; tremor continua ajustável até zero.
- Seis desenhos novos de coberturas/destroços: pilar de pedra entalhada, raízes amaldiçoadas e cristal gótico. Arte RGBA original, registrada e preparada em cache no lobby; mantém rachaduras, colisão, vida e destruição no servidor.
- Proteção por Muralha Real deixa de ser apresentada como bloqueio de escudo. Números de dano recebido mostram a vida realmente perdida, incluindo o último golpe. O aviso EXPOSTO acompanha a duração real do bônus.

Mantidos coop para três controles no mesmo PC, PS/Xbox, LAN, bots mortais e resgate, três chefes/chaves e a Câmara da Coroa. Dano básico preservado em 25/32/18, com energia e dificuldade existentes.

Extraia **todo o ZIP** e abra **Shadows of the Iron Crown.exe**. Não precisa instalar Node nem pagar hospedagem.

A prévia mostra o aplicativo nativo equivalente em Linux com controle virtual pela API normal; trilha do jogo mixada na gravação. Validação, medições e limites em `docs/VALIDACAO.md`. Não houve teste físico de Windows/controles; desempenho depende do PC.
