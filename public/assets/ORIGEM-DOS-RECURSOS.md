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
