export const WORLD = { w: 1200, h: 760, margin: 55 };
export const CLASSES = {
  knight: { name: 'Cavaleiro', role: 'Tanque • proteção', hp: 160, speed: 184, damage: 12, range: 96, interval: .58, color: '#e6b76c',
    skills: ['Golpe de Espada', 'Investida de Ferro', 'Muralha Real'], descriptions: ['25 de dano próximo', 'Avança e causa 35 de dano', '4s: protege você e aliados próximos'] },
  archer: { name: 'Arqueiro', role: 'Distância • controle', hp: 100, speed: 216, damage: 15, range: 540, interval: .72, color: '#8cd9ae',
    skills: ['Flecha Perfurante', 'Chuva de Flechas', 'Flecha Congelante'], descriptions: ['30 de dano à distância', '5 flechas: até 40 de dano', '20 de dano e lentidão por 2s'] },
  rogue: { name: 'Ladino', role: 'Mobilidade • explosão', hp: 115, speed: 244, damage: 10, range: 84, interval: .36, color: '#c4a2f2',
    skills: ['Corte Duplo', 'Passo Sombrio', 'Lâminas Venenosas'], descriptions: ['Dois golpes de 18 de dano', 'Teleporte e +25 no próximo golpe', '24 de dano de veneno em 3s'] }
};
export const COSTS = [20, 30, 40];
export const COOLDOWNS = [2, 6, 12];
export const BOSSES = [
  { name: 'VARKHUL', title: 'O Rei Sem Trono', arena: 'Ruínas do Trono', hp: 1200, color: '#ed5c67', threshold: .4, phase: 'Coroa Sangrenta', reward: 100, speed: 91, radius: 48 },
  { name: 'THARAZUL', title: 'O Devorador de Raízes', arena: 'Floresta Amaldiçoada', hp: 1600, color: '#89d789', threshold: .5, phase: 'Fúria da Floresta', reward: 150, speed: 76, radius: 62 },
  { name: 'AZRAKIEL', title: 'O Carrasco do Vazio', arena: 'Catedral do Fim', hp: 2200, color: '#bf8df5', threshold: .35, phase: 'Apocalipse', reward: 250, speed: 106, radius: 53 }
];
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
