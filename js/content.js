window.CONFIG = {
  base: "assets/base/monster_normal.png",
  layout: "monstruo-normal",
  tam: { w: 1180, h: 1720 }
};

var PIE = "©1996-2026 Konami";

window.CARTAS = {
  "mago-oscuro": {
    etiqueta: "Mago Oscuro (Normal)",
    base: "assets/base/monster_normal.png",
    layout: "monstruo-normal",
    carta: {
      nombre: "Mago Oscuro",
      ingles: "Dark Magician",
      atributo: "DARK",
      nivel: 7,
      habilidad: "Normal",
      tipo: "Lanzador de Conjuros",
      texto: "El mago más poderoso en cuanto a ataque y defensa.",
      atk: 2500,
      def: 2100,
      arte: "assets/art/DarkMagician-TF05-JP-VG-artwork.png",
      numero: "SDY-006",
      password: "46986414",
      copyright: PIE
    }
  },

  "blue-eyes-ultimate": {
    etiqueta: "Dragón Blanco de Ojos Azules Definitivo (Fusión)",
    base: "assets/base/monster_fusion.png",
    layout: "monstruo-fusion",
    carta: {
      nombre: "Dragón Blanco de Ojos Azules Definitivo",
      ingles: "Blue-Eyes Ultimate Dragon",
      atributo: "LIGHT",
      nivel: 12,
      habilidad: "Fusion",
      tipo: "Dragón",
      texto: "\"Dragón Blanco de Ojos Azules\" + \"Dragón Blanco de Ojos Azules\" + \"Dragón Blanco de Ojos Azules\"",
      atk: 4500,
      def: 3800,
      arte: "assets/art/BlueEyesUltimateDragon.jpg",
      numero: "DEMO-001",
      password: "23995346",
      copyright: PIE
    }
  },

  "stardust": {
    etiqueta: "Dragón de Polvo de Estrellas (Sincronía)",
    base: "assets/base/monster_synchro.png",
    layout: "monstruo-synchro",
    carta: {
      nombre: "Dragón de Polvo de Estrellas",
      ingles: "Stardust Dragon",
      atributo: "WIND",
      nivel: 8,
      habilidad: "Synchro / Effect",
      tipo: "Dragón",
      texto: "Cuando un monstruo del adversario declara un ataque: puedes Sacrificar esta carta; niega el ataque y, si lo haces, Invoca esta carta de Modo Especial desde el Cementerio durante la End Phase.",
      atk: 2500,
      def: 2000,
      arte: "assets/art/StardustDragon.jpg",
      numero: "DEMO-002",
      password: "44508094",
      copyright: PIE
    }
  },

  "utopia": {
    etiqueta: "Número 39: Utopía (Xyz)",
    base: "assets/base/monster_xyz.png",
    layout: "monstruo-xyz",
    carta: {
      nombre: "Número 39: Utopía",
      ingles: "Number 39: Utopia",
      atributo: "LIGHT",
      rango: 4,
      habilidad: "Xyz / Effect",
      tipo: "Guerrero",
      texto: "2 monstruos de Nivel 4. Cuando un monstruo declara un ataque: puedes desacoplar 1 material de esta carta; niega ese ataque.",
      atk: 2500,
      def: 2000,
      arte: "assets/art/Number39Utopia.jpg",
      numero: "DEMO-003",
      password: "84013237",
      copyright: PIE
    }
  },

  "decode-talker": {
    etiqueta: "Decodificador Hablador (Link)",
    base: "assets/base/monster_link.png",
    layout: "monstruo-link",
    carta: {
      nombre: "Decodificador Hablador",
      ingles: "Decode Talker",
      atributo: "DARK",
      link: 3,
      flechas: "Up,UpLeft,UpRight",
      habilidad: "Link / Effect",
      tipo: "Ciberso",
      texto: "2+ Monstruos de Efecto. Esta carta gana 500 ATK por cada monstruo al que apunte. Solo una vez por turno, si un monstruo que controlas es destruido en batalla o por efecto de carta del adversario: puedes seleccionar 1 monstruo que controlas y que no apunte a esta carta, o tu adversario no controle; Invócalo de Modo Especial.",
      atk: 2300,
      arte: "assets/art/DecodeTalker.jpg",
      numero: "DEMO-004",
      password: "1861629",
      copyright: PIE
    }
  },

  "black-chaos": {
    etiqueta: "Mago del Caos Negro (Ritual)",
    base: "assets/base/monster_ritual.png",
    layout: "monstruo-ritual",
    carta: {
      nombre: "Mago del Caos Negro",
      ingles: "Magician of Black Chaos",
      atributo: "DARK",
      nivel: 8,
      habilidad: "Ritual",
      tipo: "Lanzador de Conjuros",
      texto: "Puede ser Invocado por Ritual sólo con la Carta Mágica de Ritual \"Mágica de Ritual Oscura\".",
      atk: 2800,
      def: 2600,
      arte: "assets/art/MagicianOfBlackChaos-OW.png",
      numero: "DEMO-005",
      password: "30208479",
      copyright: PIE
    }
  },

  "odd-eyes": {
    etiqueta: "Dragón Péndulo de Ojos Anómalos (Péndulo)",
    base: "assets/base/pendulum_effect.png",
    layout: "pendulum-efecto",
    carta: {
      nombre: "Dragón Péndulo de Ojos Anómalos",
      ingles: "Odd-Eyes Pendulum Dragon",
      atributo: "DARK",
      nivel: 7,
      pscale: 4,
      habilidad: "Effect / Pendulum",
      tipo: "Dragón",
      ptexto: "Durante tu Main Phase: puedes reducir en 1 el Nivel de 1 monstruo boca arriba que controles (mínimo 1).",
      texto: "Si esta carta batalla con un monstruo del adversario, el daño de batalla que inflige se duplica.",
      atk: 2500,
      def: 2000,
      arte: "assets/art/OddEyesPendulumDragon.jpg",
      numero: "DEMO-006",
      password: "16178681",
      copyright: PIE
    }
  },

  "monster-reborn": {
    etiqueta: "Monstruo Renacido (Mágica)",
    base: "assets/base/spell.png",
    layout: "magica",
    carta: {
      nombre: "Monstruo Renacido",
      ingles: "Monster Reborn",
      atributo: "SPELL",
      habilidad: "",
      tipo: "",
      texto: "Selecciona 1 monstruo en cualquier Cementerio; Invócalo de Modo Especial.",
      arte: "assets/art/MonsterReborn.jpg",
      numero: "DEMO-007",
      password: "83764719",
      copyright: PIE
    }
  },

  "mirror-force": {
    etiqueta: "Barrera de Espejo (Trampa)",
    base: "assets/base/trap.png",
    layout: "trampa",
    carta: {
      nombre: "Barrera de Espejo",
      ingles: "Mirror Force",
      atributo: "TRAP",
      habilidad: "",
      tipo: "",
      texto: "Cuando un monstruo del adversario declara un ataque: destruye todos los monstruos en Posición de Ataque que controle tu adversario.",
      arte: "assets/art/MirrorForce.jpg",
      numero: "DEMO-008",
      password: "44095762",
      copyright: PIE
    }
  }
};

window.CARD = {};

window.CONFIG_BASE = {
  "monstruo-normal": "assets/base/monster_normal.png",
  "monstruo-efecto": "assets/base/monster_effect.png",
  "monstruo-token": "assets/base/monster_token.png",
  "monstruo-fusion": "assets/base/monster_fusion.png",
  "monstruo-synchro": "assets/base/monster_synchro.png",
  "monstruo-ritual": "assets/base/monster_ritual.png",
  "monstruo-xyz": "assets/base/monster_xyz.png",
  "monstruo-link": "assets/base/monster_link.png",
  "pendulum-normal": "assets/base/pendulum_normal.png",
  "pendulum-efecto": "assets/base/pendulum_effect.png",
  "magica": "assets/base/spell.png",
  "trampa": "assets/base/trap.png"
};

window.aplicarCartaWeb = function (datos) {
  var slug = "web-" + Date.now();
  window.CARTAS[slug] = {
    etiqueta: datos.carta.nombre,
    base: datos.base,
    layout: datos.layout,
    carta: datos.carta
  };
  window.CONFIG.base = datos.base;
  window.CONFIG.layout = datos.layout;
  window.CARD = Object.assign({}, datos.carta);
  return slug;
};

window.cargarPreset = function (nombre) {
  var p = window.CARTAS[nombre];
  if (!p) {
    return false;
  }
  window.CONFIG.base = p.base;
  window.CONFIG.layout = p.layout;
  window.CARD = Object.assign({}, p.carta);
  return true;
};

window.cargarPreset("mago-oscuro");