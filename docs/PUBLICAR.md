# Publicar a edição web (opcional)

**Para jogar no PC ou na mesma rede sem pagar hospedagem**, use o ZIP executável e siga [PC-LEIA-ME.txt](PC-LEIA-ME.txt). As etapas abaixo se aplicam somente à edição web pública.

São duas partes: **cliente estático na InfinityFree** e **backend Node.js em uma hospedagem com WebSocket e disco persistente**. A InfinityFree não executa este servidor Node.js; PHP não substitui o backend implementado.

## 1. Ligar o backend

Use uma hospedagem de aplicação Node.js ou uma VPS. Precisa de Node 24+, processo sempre em execução, conexões WebSocket de longa duração, HTTPS e diretório persistente para SQLite. Use uma única instância do servidor.

Na hospedagem, envie o projeto completo, instale com `npm ci --omit=dev` e configure:

```dotenv
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
DATA_DIR=/caminho/do/disco-persistente/iron-crown
ALLOWED_ORIGINS=https://seusite.example
TRUST_PROXY=1
```

Use a porta fornecida pela hospedagem quando houver. `ALLOWED_ORIGINS` deve conter a origem real do site InfinityFree, com `https://` e sem caminho ou barra final. `TRUST_PROXY=1` é para um proxy HTTPS confiável, gerenciado por você ou pelo provedor. Sem proxy, configure HTTPS na frente do Node antes de usar em produção.

Comando de início: `npm start`. Confira `https://seu-backend.example/api/health`: deve responder `{"status":"ok",...}`. Não exponha dados SQLite nem `.env` como arquivos estáticos. Hospedagens gratuitas que dormem/reciclam processos interrompem as partidas; discos efêmeros perdem contas e ranking. Escolha persistência se quiser manter esses dados.

### Opção Docker

O Dockerfile está incluído, mas o build Docker não faz parte dos testes locais desta entrega.

```sh
docker build -t iron-crown .
docker volume create iron-crown-data
docker run --name iron-crown --restart unless-stopped -p 3000:3000 \
  -v iron-crown-data:/app/data \
  -e ALLOWED_ORIGINS=https://seusite.example \
  -e TRUST_PROXY=1 iron-crown
```

Coloque um proxy HTTPS confiável na frente da porta 3000. O volume precisa ser gravável pelo usuário `node` (UID 1000). Restrinja o acesso direto à porta HTTP quando usar `TRUST_PROXY=1`.

Exemplo de Caddy na mesma VPS:

```caddyfile
seu-backend.example {
  reverse_proxy 127.0.0.1:3000
}
```

## 2. Configurar e enviar o cliente

Edite `public/config.js` antes de empacotar:

```js
window.IRON_CONFIG = { serverUrl: "https://seu-backend.example" };
```

Este endereço é público. Não coloque senha ou token ali. O cliente deriva automaticamente `wss://seu-backend.example/ws` para a conexão multiplayer.

Rode `npm run build`. Extraia `dist/infinityfree-cliente.zip` e envie **o conteúdo** para `htdocs` da InfinityFree, mantendo `assets/` e todos os arquivos JS/CSS juntos. O `index.html` deve ficar diretamente no diretório servido. Também é possível enviar o conteúdo de `dist/infinityfree/` por FTP.

Ative HTTPS no domínio do cliente. Não use backend HTTP por trás de um site HTTPS: o navegador bloqueia conteúdo misto. O frontend não precisa de build no servidor e não depende de PHP.

## 3. Validar a publicação

1. Abra o endereço HTTPS do jogo e confira “Servidor disponível”.
2. Crie uma sessão, uma sala e copie o código.
3. Em outro dispositivo, abra o mesmo endereço, crie outra sessão e entre com o código.
4. Selecione classes, marque todos como prontos e inicie pelo líder.
5. Movimente os jogadores; ambos devem observar as mesmas posições e vida do chefe.
6. Use habilidades, observe gasto de energia e recargas e finalize a expedição.
7. Recarregue um cliente durante a batalha; ele deve retomar a própria identidade.
8. Verifique o ranking após o final da partida e a persistência dos dados após reiniciar o backend.

Essas verificações em domínio público exigem o backend e o domínio configurados por você. Os testes locais não equivalem a uma publicação já realizada.

## Problemas comuns

- **Servidor offline:** confira `config.js`, saúde do backend e logs. Não abra o cliente com `file://`; sirva por HTTP/HTTPS.
- **Origem não autorizada:** copie exatamente a origem da barra de endereço para `ALLOWED_ORIGINS` e reinicie o backend.
- **Login exige HTTPS:** ative HTTPS e configure o proxy confiável corretamente.
- **WebSocket falha:** o proxy deve encaminhar `/ws` com upgrade; não use hospedagem que aceita somente funções HTTP curtas.
- **Identidade substituída:** duas abas do mesmo perfil usam o mesmo token. Use perfil separado ou janela anônima para outro jogador.
- **Sala desapareceu:** ela expira após todos desconectarem por 60s ou o backend foi reiniciado. Crie uma nova sala.
- **Banco/recordes sumiram:** o diretório de dados da hospedagem não era persistente ou foi apagado no deploy.
