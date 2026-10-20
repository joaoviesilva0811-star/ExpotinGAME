# Recursos do jogo

Sprites, ícones, ilustrações de menu, arenas e corredor foram gerados para este projeto e integrados como atlas/arte de cenário. Os scripts de análise guardam coordenadas; não alteram os originais. Partículas e efeitos de apresentação são desenhados pelo renderizador.

Música e efeitos Ogg: composição/síntese próprias reproduzíveis por `scripts/compose-audio.py`. Não incluem músicas comerciais ou trilhas do TikTok.

Fonte Pixelify Sans: Copyright 2021 The Pixelify Sans Project Authors. Distribuída sob SIL Open Font License 1.1, incluída em `fonts/OFL.txt`. Origem: repositório oficial `google/fonts`, diretório `ofl/pixelifysans`.

A moldura original `ui-iron-frame.png` foi gerada para esta revisão e integrada sem alterar a imagem de origem, por recortes CSS que preservam os cantos e o centro transparente.

`fx-eruptions.png`: atlas original de 18 quadros, gerado para explosões do castelo, da floresta e da catedral. O original é preservado; recortes registrados e suavização de bordas são feitos no cache do renderizador.

`fx-physical.png` e `fx-occult.png`: dois atlas originais gerados para esta revisão, 18 quadros cada. Incluem cortes de aço e foice, onda de pedras, nuvem venenosa, portal do vazio e correntes. Os arquivos originais são preservados; registro e suavização são feitos no cache do jogo.

Correção 1.4.1: `fx-redEruption.png`, `fx-rootEruption.png`, `fx-crystalEruption.png`, `fx-steelSweep.png`, `fx-stoneWave.png`, `fx-poisonCloud.png`, `fx-voidSweep.png`, `fx-voidRift.png` e `fx-ironChains.png` foram gerados usando as folhas anteriores como referência visual. Cada modelo possui seis poses isoladas numa folha de duas colunas e três linhas. Os originais são preservados; o cache copia células inteiras, sem aparar as bordas. As folhas anteriores permanecem como referência histórica e não são mais carregadas pelo jogo.

`effect-frames.json` registra divisões pelos espaços transparentes reais, analisados por `scripts/analyze-effects.py`; não altera as imagens.

Versão 1.5: nove folhas `walk-<chefe>-<direção>.png` (12 poses cada, 108 no total), nove folhas `hurt-<ator>.png` (16 poses cada, 144 no total), `boss-keys.png` (três chaves) , `secret-chamber.png` e sua variante com porta aberta `secret-chamber-open.png` foram gerados para o projeto usando a arte anterior como referência. Imagens originais preservadas. Caminhada usa sul/norte/leste e espelhamento para oeste; reações usam quatro vistas. As vistas leste inconsistentes de cavaleiro e arqueiro são espelhadas no cache.

`analyze-polish-sprites.py` analisa o alfa com Pillow, NumPy e SciPy, sem editar os PNGs. Coordenadas, escala e margens ficam nos JSONs. Para a caminhada leste de Varkhul, armazena também o contorno completo de cada silhueta conectada para excluir pixels da capa vizinha que passam pelo mesmo retângulo. Recortes e espelhamento ocorrem somente no cache Canvas. As 252 poses adicionais somam 984 quadros de atores; os 54 quadros de efeitos são contados à parte.

Versão 1.6: 24 atlas `strike-<ator>-<ação>.png` gerados para este projeto, com a aparência anterior como referência. São 1.464 poses desenhadas originais: 736 dos heróis, 544 dos chefes e 184 dos lacaios. Há oito vistas por folha, com seis a oito poses por vista. A contagem é feita sobre as células reais, sem contar subquadros interpolados nem espelhamentos como novas imagens. Três folhas foram regeneradas para afastar efeitos das bordas.

`strike-layouts.json` registra as colunas conferidas visualmente. `scripts/analyze-strikes.py` usa alfa e separação de silhuetas para registrar recortes, contornos, pés e margens em `strike-frames.json`. Apenas analisa os PNGs; não altera as imagens. O Canvas aplica os contornos no cache, normaliza os poucos desenhos de recarga do arqueiro com corpo menor e preserva armas inteiras fora do retângulo nominal. Vistas leste inconsistentes de cavaleiro/arqueiro usam as vistas oeste correspondentes espelhadas. A interpolação acontece em superfícies temporárias reutilizadas por ator, sem gerar arquivos de imagem.

Complemento 1.6: seis folhas `strike-<ator>-walk.png` de caminhada dos heróis e lacaios, geradas a partir da arte dos ataques. Cinco têm 64 poses e a do ladino tem 56; são mais 376 poses, 1.840 novas nesta atualização e 2.824 no acervo de atores. Não são cópias de células; os testes verificam todas as poses por direção. Chefes em perseguição mantêm o ciclo de 12 poses mesmo sob hits repetidos, com reação aditiva de corpo/brilho. As misturas usam superfícies alinhadas e alfa premultiplicado para evitar o corpo transparente durante a troca de pose.

As quatro trilhas foram recompostas com motivos próprios, metais sintetizados, sinos/coros e percussão reforçada; loudness de destino -16 LUFS na renderização em Ogg. Volume de reprodução padrão da música passou de 0,36 para 0,68, com ajuste independente dos efeitos. Música de cada documento é parada ao sair e os menus preservam o mesmo player musical.
