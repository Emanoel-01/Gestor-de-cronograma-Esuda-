const fs = require('fs');
const path = require('path');

const tronco = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/tronco_comum.json'), 'utf8'));
const bimGpoPredial = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/bim_gpo_predial.json'), 'utf8'));
const neuroAcusticaInteriores = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/neuro_acustica_interiores.json'), 'utf8'));

const allPlanos = [
  ...tronco,
  ...bimGpoPredial,
  ...neuroAcusticaInteriores
];

fs.writeFileSync(path.join(__dirname, '../planos_de_ensino.json'), JSON.stringify(allPlanos, null, 2), 'utf8');
console.log(`planos_de_ensino.json created with ${allPlanos.length} items.`);
