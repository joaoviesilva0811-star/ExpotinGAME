# Iron Crown 1.12.0 — Coroa Viva

Habilidades e dash respondem melhor às pressões próximas do fim da recarga. O combate ganhou efeitos com materiais distintos, as arenas receberam mais profundidade e a história continua em novas páginas de HQ entre os chefes e no final.

- **Comandos mais responsivos:** uma habilidade ou dash pressionado até **140 ms** antes de ficar disponível pode ser executado uma vez ao liberar. O servidor continua validando energia, recarga, defesa, estado e sequência dos comandos. A intenção expira e é descartada ao cair, desconectar ou trocar de rodada; não repete ações por uma única pressão.
- **Impactos com acabamento próprio:** brasas, lascas, fragmentos e faíscas se comportam conforme o material. Flechas/projéteis deixam rastros direcionais, o contato das armas tem resposta visual própria e ataques dos chefes deixam resíduos no chão que se dissipam. Esses resíduos são visuais; a área e o tempo reais de dano continuam definidos pelo servidor.
- **Arenas com mais profundidade:** iluminação, sombras de contato, névoa nas bordas e detalhes em primeiro plano reforçam a identidade de cada sala. Coberturas intactas deixam de exibir barras de vida permanentes. O indicador **EXPOSTO** mostra o tempo restante da janela de vulnerabilidade, sem alterar o bônus existente.
- **Três novas páginas de HQ, com nove quadros:** travessia para a floresta, passagem para a catedral e epílogo da Câmara da Coroa. Personagens seguem os retratos dos diálogos. As páginas anteriores também receberam revelação de quadros, enquadramento suave, molduras, partículas temáticas e legendas progressivas. Movimento reduzido mantém o texto completo e desativa movimentos/partículas da apresentação.
- **História acompanha a conquista real:** as travessias exigem vitória e chave coletada; o epílogo exige os três chefes, as três chaves e a abertura autoritativa da câmara. Rodadas perdidas não exibem chaves ou finais conquistados.
- **Orçamentos visuais preservados:** reaproveitamento de partículas, superfícies em cache e redução adaptativa de detalhes continuam ativos. Avisos de perigo e espaços seguros permanecem completos.

Mantidos **três controles no mesmo PC**, identificação Xbox/PlayStation, multiplayer pela rede local, bots mortais que podem ajudar nos resgates e danos básicos de **25 / 32 / 18** para cavaleiro, arqueiro e ladino. Os recortes corrigidos de Varkhul e as opções de intensidade do tremor foram preservados.

## Baixar e jogar

[Baixar Windows portátil](https://github.com/joaoviesilva0811-star/ExpotinGAME/releases/download/v1.12.0/IronCrown-Windows-x64.zip) · [Ver a prévia](https://github.com/joaoviesilva0811-star/ExpotinGAME/releases/download/v1.12.0/previa-pc.mp4) · [Página da versão](https://github.com/joaoviesilva0811-star/ExpotinGAME/releases/tag/v1.12.0)

Extraia **todo o ZIP em uma pasta nova** e abra **Shadows of the Iron Crown.exe**. Não é necessário instalar Node.js ou pagar hospedagem.

## Validação

**128 testes unitários aprovados.** Passaram também o teste nativo com três controles virtuais e a verificação de duas instâncias compartilhando a partida por TCP local. Esses testes usam o aplicativo Linux equivalente; a conexão entre instâncias foi feita por `127.0.0.1`.

A campanha completa passou com três vitórias, três chaves, câmara e epílogo, sem erros de JavaScript. Na medição isolada por software, a batalha teve mediana de 60 FPS, com quedas em ataques pesados; os valores completos estão na validação.

O ZIP Windows foi conferido estruturalmente, incluindo integridade e correspondência com a fonte. **Windows físico, controles USB/Bluetooth e GPU física ainda não foram testados.** Dados detalhados, medições e limites ficam em [docs/VALIDACAO.md](https://github.com/joaoviesilva0811-star/ExpotinGAME/blob/v1.12.0/docs/VALIDACAO.md). A codificação da prévia em 60 FPS não mede a cadência da partida nem garante esse desempenho em todos os PCs.
