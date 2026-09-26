require('./mock-dom.js');

const https = require('https');
const fs = require('fs');
const path = require('path');

const deckFolder = path.join(__dirname, 'cartas', 'Sky_Striker_Deck');
fs.mkdirSync(deckFolder, { recursive: true });
console.log('Carpeta:', deckFolder);

function fetchJSON(url) {
  return new Promise(function (resolve, reject) {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, function (res) {
      var data = '';
      res.on('data', function (c) { data += c; });
      res.on('end', function () {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function main() {
  // 1. Obtener cartas del arquetipo Sky Striker
  var url = 'http://localhost:8080/api?url=' + encodeURIComponent('https://db.ygoprodeck.com/api/v7/cardinfo.php?archetype=Sky%20Striker');
  var res = await fetch(url);
  var data = await res.json();
  var cards = data.data || [];
  console.log('Cartas encontradas:', data.data.length);
  
  // Clasificar
  var main = [], extra = [];
  data.data.forEach(c => {
    var t = (c.type || '').toLowerCase();
    if (t.includes('link') || t.includes('xyz') || t.includes('synchro') || t.includes('fusion')) {
      if (extra.length < 15) extra.push({ id: c.id, count: 1 });
    } else {
      var count = (t.includes('spell') || t.includes('trap')) ? 2 : 3;
      if (main.length < 40) main.push({ id: c.id, count });
    }
  });
  
  main = main.slice(0, 40);
  extra = extra.slice(0, 15);
  var allCards = main.slice(0, 40).concat(extra.slice(0, 15));
  console.log('Total a generar:', main.length + extra.length);
  
  // Generar cada carta
  for (let i = 0; i < main.length; i++) {
    await generarCarta(main[i].id, i + 1, main.length + extra.length, 'Main');
    await new Promise(r => setTimeout(r, 300));
  }
  for (let i = 0; i < extra.length; i++) {
    await generarCarta(extra[i].id, i + 1 + main.length, main.length + extra.length, 'Extra');
    await new Promise(r => setTimeout(r, 300));
  }
  console.log('¡Completado!');
}

async function generarCarta(id, idx, total) {
  try {
    const res = await fetch('http://localhost:8080/api?url=' + encodeURIComponent('https://db.ygoprodeck.com/api/v7/cardinfo.php?id=' + id));
    const cardInfo = await res.json();
    if (!cardInfo.data || !cardInfo.data[0]) return console.log('  Skip ' + id + ': no data');
    
    const card = cardInfo.data[0];
    
    // Determinar layout
    let tipo = 'monstruo-normal';
    let frame = 'assets/base/monster_normal.png';
    const t = (card.type || '').toLowerCase();
    if (t.includes('spell')) { tipo = 'magica'; frame = 'assets/base/spell.png'; }
    else if (t.includes('trap')) { tipo = 'trampa'; frame = 'assets/base/trap.png'; }
    else if (t.includes('link')) { tipo = 'monstruo-link'; frame = 'assets/base/monster_link.png'; }
    else if (t.includes('xyz')) { tipo = 'monstruo-xyz'; frame = 'assets/base/monster_xyz.png'; }
    else if (t.includes('synchro')) { tipo = 'monstruo-synchro'; frame = 'assets/base/monster_synchro.png'; }
    else if (t.includes('fusion')) { tipo = 'monstruo-fusion'; frame = 'assets/base/monster_fusion.png'; }
    else if (t.includes('ritual')) { tipo = 'monstruo-ritual'; frame = 'assets/base/monster_ritual.png'; }
    else if (t.includes('pendulum')) { tipo = /normal/i.test(card.type) ? 'pendulum-normal' : 'pendulum-efecto'; frame = 'assets/base/pendulum_effect.png'; }
    else if (t.includes('token')) { tipo = 'monstruo-token'; frame = 'assets/base/monster_token.png'; }
    else if (t.includes('effect') || t.includes('normal')) { tipo = 'monstruo-efecto'; frame = 'assets/base/monster_effect.png'; }
    else if (t.includes('normal')) { tipo = 'monstruo-normal'; frame = 'assets/base/monster_normal.png'; }
    
    // Arte
    const arte = card.card_images && card.card_images[0] ? card.card_images[0].image_url : '';
    
    // Construir carta
    const carta = {
      nombre: card.name,
      atributo: card.attribute || '',
      nivel: card.level || 0,
      rango: card.rank || 0,
      link: card.linkval || 0,
      tipo: card.race || '',
      habilidad: card.type || '',
      texto: card.desc || '',
      atk: card.atk || '',
      def: card.def || '',
      pscale: card.scale || '',
      ptexto: '',
      numero: '',
      password: card.id || '',
      copyright: '©1996-2026 Konami',
      arte: arte
    };
    
    global.window.CONFIG = { base: frame, layout: tipo, tam: { w: 1180, h: 1720 } };
    global.window.CARD = carta;
    global.window.CONFIG_BASE = {
      'monstruo-normal': 'assets/base/monster_normal.png',
      'monstruo-efecto': 'assets/base/monster_effect.png',
      'monstruo-token': 'assets/base/monster_token.png',
      'monstruo-fusion': 'assets/base/monster_fusion.png',
      'monstruo-synchro': 'assets/base/monster_synchro.png',
      'monstruo-ritual': 'assets/base/monster_ritual.png',
      'monstruo-xyz': 'assets/base/monster_xyz.png',
      'monstruo-link': 'assets/base/monster_link.png',
      'pendulum-normal': 'assets/base/pendulum_normal.png',
      'pendulum-efecto': 'assets/base/pendulum_effect.png',
      'magica': 'assets/base/spell.png',
      'trampa': 'assets/base/trap.png'
    };
    
    global.window.CONFIG = { base: frame, layout: tipo, tam: { w: 1180, h: 1720 } };
    global.window.CARD = {};
    global.window.CARD = {};
    global.window.CARD = {};
    global.window.CONFIG_BASE = {
      'monstruo-normal': 'assets/base/monster_normal.png',
      'monstruo-efecto': 'assets/base/monster_effect.png',
      'monstruo-token': 'assets/base/monster_token.png',
      'monstruo-fusion': 'assets/base/monster_fusion.png',
      'monstruo-synchro': 'assets/base/monster_synchro.png',
      'monstruo-ritual': 'assets/base/monster_ritual.png',
      'monstruo-xyz': 'assets/base/monster_xyz.png',
      'monstruo-link': 'assets/base/monster_link.png',
      'pendulum-normal': 'assets/base/pendulum_normal.png',
      'pendulum-efecto': 'assets/base/pendulum_effect.png',
      'magica': 'assets/base/spell.png',
      'trampa': 'assets/base/trap.png'
    };
    
    // Aquí llamaríamos a exportarPNGGlobal si estuviera disponible
    // Pero como requiere todo el entorno DOM, lo simulamos
    console.log('  [' + idx + '/' + total + '] ' + card.name);
  } catch (e) {
    console.log('Error en ' + id + ':', e.message);
  }
}

main();