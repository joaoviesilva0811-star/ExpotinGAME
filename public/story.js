export const STORY=[
 {chapter:'I · A ÚLTIMA VIGÍLIA',title:'O rei que não pôde morrer.',text:'A Coroa selava o Vazio. Alguém a quebrou. O reino precisa de três chaves.'},
 {chapter:'II · O CORAÇÃO SOB AS RAÍZES',title:'A floresta guarda a segunda chave.',text:'As raízes negras do trono levam à segunda chave, no coração da floresta.'},
 {chapter:'III · O ÚLTIMO ECLIPSE',title:'Uma coroa. Um último guardião.',text:'Azrakiel partiu o selo. A última chave está na catedral. O Vazio aguarda.'}
];
export const BRIDGES=[
 ['O rei cai. A Coroa continua pulsando.','A chave sangrenta destranca a passagem. Raízes vivas conduzem o grupo à floresta.'],
 ['O coração da floresta se cala.','A chave do Coração Verde abre a porta da catedral. Do outro lado, seis asas apagam a última luz.']
];
export function endingStory(wins){
 if(wins===3)return{chapter:'EPÍLOGO · A PRIMEIRA AURORA',title:'A Câmara da Coroa se abriu.',text:'Aldric, Lyra e Nyx erguem as três chaves. Os selos de ferro, raízes e asas se abrem. Na câmara secreta, a Coroa reencontra seus guardiões. O Vazio se cala. A primeira aurora ilumina o reino.'};
 if(wins>0)return{chapter:'EPÍLOGO · AS BRASAS DO REINO',title:'Nem toda sombra encontrou seu fim.',text:'A equipe arrancou poder da Coroa, mas o selo continua partido. As portas se abrem para uma retirada. Os nomes dos sobreviventes serão lembrados — até a próxima expedição.'};
 return{chapter:'EPÍLOGO · A NOITE SEM FIM',title:'O reino ainda espera por sua aurora.',text:'A Coroa permanece inteira. O Vazio engole os últimos passos, mas uma centelha cruza os portões. Outras lendas ouvirão esse chamado. Esta história ainda não acabou.'};
}
