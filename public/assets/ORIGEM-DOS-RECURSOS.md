# Recursos do jogo

Sprites, ícones, ilustrações de menu, arenas e corredor foram gerados para este projeto e integrados como atlas/arte de cenário. Os scripts de análise guardam coordenadas; não alteram os originais. Partículas e efeitos de apresentação são desenhados pelo renderizador.

Música e efeitos Ogg: composição/síntese próprias reproduzíveis por `scripts/compose-audio.py`. Não incluem músicas comerciais ou trilhas do TikTok.

Fonte Pixelify Sans: Copyright 2021 The Pixelify Sans Project Authors. Distribuída sob SIL Open Font License 1.1, incluída em `fonts/OFL.txt`. Origem: repositório oficial `google/fonts`, diretório `ofl/pixelifysans`.

A moldura original `ui-iron-frame.png` foi gerada para esta revisão e integrada sem alterar a imagem de origem, por recortes CSS que preservam os cantos e o centro transparente.

`fx-eruptions.png`: atlas original de 18 quadros, gerado para explosões do castelo, da floresta e da catedral. O original é preservado; recortes registrados e suavização de bordas são feitos no cache do renderizador.

`fx-physical.png` e `fx-occult.png`: dois atlas originais gerados para esta revisão, 18 quadros cada. Incluem cortes de aço e foice, onda de pedras, nuvem venenosa, portal do vazio e correntes. Os arquivos originais são preservados; registro e suavização são feitos no cache do jogo.

Correção 1.4.1: `fx-redEruption.png`, `fx-rootEruption.png`, `fx-crystalEruption.png`, `fx-steelSweep.png`, `fx-stoneWave.png`, `fx-poisonCloud.png`, `fx-voidSweep.png`, `fx-voidRift.png` e `fx-ironChains.png` foram gerados usando as folhas anteriores como referência visual. Cada modelo possui seis poses isoladas numa folha de duas colunas e três linhas. Os originais são preservados; o cache copia células inteiras, sem aparar as bordas. As folhas anteriores permanecem como referência histórica e não são mais carregadas pelo jogo.

`effect-frames.json` registra divisões pelos espaços transparentes reais, analisados por `scripts/analyze-effects.py`; não altera as imagens.
