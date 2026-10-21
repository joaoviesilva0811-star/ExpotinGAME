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

Versão 1.7: `rescue-knight.png`, `rescue-archer.png` e `rescue-rogue.png` são folhas originais geradas com as artes de Muralha Real, Flecha Congelante e Passo Sombrio como referência. Cada folha tem oito colunas e oito linhas: quatro vistas de auxílio e quatro de recuperação, 64 poses por personagem e 192 novas poses no total (acervo de atores: 3.016). Os PNGs são preservados integralmente. `scripts/analyze-rescue.py` só analisa alfa/silhuetas e grava registro dos pés, escala e contorno em `rescue-frames.json`. Poses ajoelhadas e deitadas mantêm sua altura menor; a escala é calculada sobre as poses em pé. O cache Canvas guarda recortes com margem e mistura poses alinhadas sem editar os arquivos de origem.

Complemento visual 1.7: `relic-items.png` é uma folha original gerada a partir da direção artística das chaves, preservada sem edição. São 32 poses, oito por item: poção rubi de cura, frasco cristalino de gelo, coroa de ferro amaldiçoada e coroa real restaurada com três gemas. `scripts/analyze-items.py` analisa apenas as silhuetas e registra recortes em `item-layouts.js`. O cache desenha os ícones em células com margens; movimento e brilhos são apresentados no Canvas. As poções estão integradas ao loot e ao inventário, e as coroas ao menu e aos desfechos. Esses quadros de objetos são contados separadamente das 3.016 poses de atores.

Versão 1.8: quinze PNGs originais gerados para o projeto e preservados sem edição:
três `express-*.png` (213 poses de emotes), três `cinema-*.png` (95 poses utilizáveis
de repouso/despertar/fúria), três `gait-*.png` (224 poses, quatro vistas de caminhada),
`strike-varkhul-riposte.png` (48), `strike-tharazul-roots.png` (64),
`strike-azrakiel-orbit.png` (42), e três `variants-*.png` (91 quadros utilizáveis de
12 efeitos). São 686 poses adicionais de atores e 3.702 utilizáveis no acervo;
os 145 quadros de efeitos e os 32 quadros de objetos são contados separadamente.
Os scripts `analyze-motion.py`, `analyze-strikes.py --new-only` e
`analyze-variants.py` apenas leem alfa/silhuetas e escrevem metadados. O registro
segue os pés e preserva armas/capas; desenhos que já tocam a borda de origem são
excluídos dos grupos de reprodução. Uma pose de despertar de Azrakiel e cinco
poses novas de efeitos foram excluídas; as duas últimas vistas de órbita também
não são carregadas e usam espelhamento de vistas completas compatíveis.

As folhas geradas nem sempre contêm o número pedido de colunas: as contagens
acima refletem os desenhos reais, não a grade solicitada. A 1.8 remove a mistura
alfa de corpos inteiros usada na 1.6/1.7, que causava contornos duplos. Um quadro
apresenta uma pose de origem inteira, com movimentação/recuo/câmera contínuos;
não são 60 desenhos originais por segundo. As descrições de mistura anteriores
registram o histórico dessas versões, não o renderizador atual.

Versão 1.9: quatro PNGs originais gerados e preservados sem edição: `transit-knight.png`,
`transit-archer.png`, `transit-rogue.png` e `cast-portraits.png`. Os três atlas de postura
fornecem 159 poses integradas: 63 do cavaleiro, 40 do arqueiro e 56 do ladino. O acervo
de atores passa a 3.861; os seis retratos, 145 quadros de efeitos e 32 quadros de objetos
são contados separadamente. As folhas nem sempre seguem a grade pedida. Poses cortadas
ou com direção inconsistente foram excluídas. Oeste do arqueiro e guarda oeste do
ladino usam fontes leste espelhadas; norte do arqueiro mantém os sprites direcionais
anteriores. Espelhamentos não são contados como novas poses.

`analyze-transitions.py` e `analyze-portraits.py` apenas leem PNGs e gravam recortes,
contornos e registro de pés/escala nos JSONs. O cache Canvas preserva margem e os
originais. Os seis bustos são separados pelo contorno de cada silhueta, preservando
coroas, chifres e ombros mesmo onde os retângulos se sobrepõem. Coberturas, destroços,
feixes e névoa são desenho procedural em superfícies Canvas reutilizadas; não são
novos sprites gerados nem imagens editadas por scripts.

## 1.10 — Coberturas e destroços

`arena-covers.png` é um atlas RGBA original gerado para o jogo, com seis desenhos completos: três coberturas e três estados destruídos. Fonte preservada sem alterações: `exec-8f3f8ed4-f525-4b45-83e8-6662f2fcb34d.png`.
`cover-frames.json` registra os retângulos e tamanhos de reprodução; `scripts/analyze-cover-art.py` apenas lê a transparência e escreve JSON. O Canvas prepara a arte em cache, acrescentando a rachadura de meia vida. Colisão/vida continuam no servidor. Desenhos de cenário não entram na contagem de 3.861 poses de atores.

## 1.11 — Movimento, portões, menu e pôster

Fontes RGBA originais preservadas: `stride-knight.png` (exec-2cf5ffe9-7767-4854-a9b2-411330356fba.png), `stride-archer.png` (exec-be59dd43-a1e9-4e3f-835f-9cb9031adb50.png), `stride-rogue.png` (exec-39f835ed-5e9d-413d-be82-201d41ee6158.png). As folhas não atenderam integralmente ao ciclo de 16 poses solicitado. Não são apresentadas como 184 poses novas utilizáveis: análise de continuidade aceitou 25 candidatas, das quais **20** são usadas nas direções realmente alcançáveis (5 cavaleiro, 4 arqueiro, 11 ladino). Metadados preservam o tempo das poses base e inserem a intermediária no meio do intervalo. Acervo de atores: 3.881 poses, sem contar espelhamentos.

`dungeon-gates.png` (exec-abb77939-acf0-4134-9000-61ae3f0e0edb.png): seis partes originais de portões, moldura e grade para cada arena. O PNG não é alterado; `analyze-gates.py` registra componentes e contornos em JSON; o jogo prepara as camadas em cache.

`menu-expedition.png` (exec-f2782fd2-4034-4d10-8a01-92e037dabd71.png): nova ilustração de menu original, com animação sutil na camada de apresentação.
`artwork/IronCrown-Poster.png` (exec-6c81550d-0055-4286-a0ac-1fe9f6d4d33c.png): pôster original do projeto. Não é uma captura de gameplay. `tool-*.svg` são quatro ícones originais em caminhos com alinhamento a pixels, integrados às molduras existentes.

Cutscenes em HQ: `comic-throne.png` (`exec-e0eac2cb-4412-4a71-aed2-bd2ca5a560b8.png`), `comic-forest.png` (`exec-b3efb983-97c2-4f1a-9288-c2f017a56d90.png`), `comic-cathedral.png` (`exec-fcb4eb20-0f45-4fd2-9607-fc4920728aa2.png`). Nove quadros originais, criados usando `cast-portraits.png` como referência explícita dos personagens. Os PNGs são preservados sem alterações; o Canvas seleciona os três painéis, revela-os em sequência e anima enquadramento sutil, partículas e tremor sincronizado ao portão. Não são poses novas de atores nem animação corporal quadro a quadro. A abertura dura 9,6s antes dos diálogos; a partida aguarda o horário autoritativo. As ilustrações de fundo anteriores foram descartadas por inconsistência visual.

## 1.11.1 — Recortes de Varkhul

PNGs originais de correntes e contra-ataque preservados. `repair-boss-crops.py` registra as quantidades reais por linha (a folha de contra-ataque tem sete poses nas primeiras duas linhas), separa corpos por watershed mascarado e salva intervalos exatos de pixels por linha. Isso impede que o intervalo mínimo/máximo incorpore um segundo corpo entre partes de uma arma. São 112 recortes revisados, sem novos desenhos ou alterações no combate. QA Python requer Pillow, NumPy, SciPy e scikit-image; essas ferramentas não são dependências do jogo.

## 1.12 — Coroa Viva

Três páginas HQ originais, sem modificar os PNGs de origem, usando `cast-portraits.png` e a HQ aprovada de Varkhul como referências de estilo/personagens:
- `comic-bridge-forest.png`: exec-cef1ccfb-743c-4a75-83a4-382adf823c8a.png.
- `comic-bridge-cathedral.png`: exec-1d76c737-3a7a-4df7-838b-bb20123601a9.png.
- `comic-ending-crown.png`: exec-b31ce878-245b-47b3-8a09-4cd2ebe6f1f2.png.
São nove quadros de ilustração, separados de poses de atores (acervo permanece 3.881). Canvas revela os painéis, acrescenta enquadramento/motes e texto sem misturar silhuetas. Iluminação, materiais de partículas, contatos e resíduos são desenho procedural/cache; não se contam como novos sprites gerados.
