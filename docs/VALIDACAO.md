# Validação da entrega

Executada em ambiente Linux com Node 24 e Chromium, em 19/10/2026.

- `npm test`: **20 testes passaram**, nenhum falhou ou foi pulado.
- Teste de navegador `scripts/browser-smoke.js`: dois contextos independentes, criação/entrada na mesma sala, seleção de classe, partida, movimento, habilidade, gasto de energia na defesa, recuperação de sessão por recarregamento e interface/controle móvel passaram sem erro JavaScript.
- Aceitação `scripts/full-match.js`: **quatro sessões de navegador independentes concluíram as três rodadas** enviando intenções normais ao servidor. Os quatro clientes observaram o mesmo resultado, três vitórias e a mesma pontuação. Os controles automatizados deste teste são separados dos companheiros IA opcionais introduzidos na edição 1.1.
- A primeira execução completa registrada terminou com **1.101 pontos** e dano individual de 878, 1560, 1014 e 1548. Essa pontuação varia com o tempo de execução e as decisões; não é um resultado inserido no código.
- A biblioteca WebSocket foi atualizada para `ws 8.22.0` após a auditoria apontar correções relevantes. `npm audit --omit=dev` não reportou vulnerabilidades após a atualização.
- Os ZIPs são gerados sem `.env`, banco de dados, hashes de sessão, `node_modules` ou metadados Git. Há somas SHA-256 em `dist/SHA256SUMS.txt`.

As capturas em `artifacts/` são produzidas pelo navegador durante os testes e mostram a interface real, não mockups. O diretório é local e não faz parte do cliente publicado.

Não houve publicação em domínio público, teste entre dispositivos físicos em redes distintas, teste de carga, build Docker ou avaliação prolongada de balanceamento com jogadores humanos. A publicação requer definir o endereço do backend HTTPS e a origem do cliente. SQLite deve usar disco persistente.

## Edição PC 1.1

- Quatro testes adicionais verificam as classes complementares dos bots, slots/limites/liderança em LAN, combate real dos companheiros ao longo das três rodadas e reviver um humano pelo temporizador normal. Total: 20 testes.
- Executável Windows x64 montado com Electron e Node oficiais; hashes SHA-256 dos arquivos de origem verificados. Não é necessário Node instalado no PC de destino.
- Aplicativo equivalente Linux empacotado aberto com seu runtime incluso: menu nativo, criação automática da sessão e sala solo, troca das classes dos bots e combate verificados.
- A execução do binário Windows em um Windows físico, firewall e comunicação entre dois PCs físicos distintos ainda dependem de validação nesses dispositivos. O teste nativo usa processos independentes em Linux e TCP em loopback (127.0.0.1). O acesso ao IPv4 privado da máquina foi bloqueado pela política de rede do ambiente de teste; não é evidência de falha no código LAN.
- Prévia é captura do aplicativo rodando, não imagem conceitual. O vídeo não contém trilha gravada; os sons do jogo são ativados no botão musical.
