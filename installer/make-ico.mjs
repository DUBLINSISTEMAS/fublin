// make-ico.mjs — gera installer/relacionador.ico a partir do PNG 256×256 que o app serve.
//
// Uso:  node installer/make-ico.mjs [url]      (padrão: http://localhost:3000/icons/256)
//
// Só módulos nativos do Node (20 ou mais novo). O .ico usa o formato "PNG in ICO"
// (Windows Vista ou mais novo): ICONDIR + ICONDIRENTRY + os bytes do PNG, sem conversão.

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TAMANHO = 256;
const URL_PADRAO = 'http://localhost:3000/icons/256';
const TEMPO_LIMITE_MS = 15_000;
const ASSINATURA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const BYTES_ICONDIR = 6;
const BYTES_ICONDIRENTRY = 16;

const pastaInstalador = path.dirname(fileURLToPath(import.meta.url));
const destino = path.join(pastaInstalador, 'relacionador.ico');
const url = process.argv[2] ?? URL_PADRAO;

async function baixarPng(endereco) {
  const resposta = await fetch(endereco, { signal: AbortSignal.timeout(TEMPO_LIMITE_MS) });
  if (!resposta.ok) {
    throw new Error(`o servidor respondeu ${resposta.status} ${resposta.statusText}`);
  }
  return Buffer.from(await resposta.arrayBuffer());
}

function validarPng(png) {
  if (png.length < 24 || !png.subarray(0, 8).equals(ASSINATURA_PNG)) {
    throw new Error('a resposta não é um PNG válido');
  }
  const largura = png.readUInt32BE(16);
  const altura = png.readUInt32BE(20);
  if (largura !== TAMANHO || altura !== TAMANHO) {
    throw new Error(`esperava um PNG ${TAMANHO}×${TAMANHO}, veio ${largura}×${altura}`);
  }
}

function montarIco(png) {
  const icondir = Buffer.alloc(BYTES_ICONDIR);
  icondir.writeUInt16LE(0, 0); // reservado
  icondir.writeUInt16LE(1, 2); // tipo: 1 = ícone
  icondir.writeUInt16LE(1, 4); // quantidade de imagens

  const entrada = Buffer.alloc(BYTES_ICONDIRENTRY);
  entrada.writeUInt8(0, 0); // largura: 0 significa 256
  entrada.writeUInt8(0, 1); // altura: 0 significa 256
  entrada.writeUInt8(0, 2); // cores na paleta: 0 = sem paleta
  entrada.writeUInt8(0, 3); // reservado
  entrada.writeUInt16LE(1, 4); // planos de cor
  entrada.writeUInt16LE(32, 6); // bits por pixel
  entrada.writeUInt32LE(png.length, 8); // tamanho dos dados da imagem
  entrada.writeUInt32LE(BYTES_ICONDIR + BYTES_ICONDIRENTRY, 12); // onde a imagem começa (22)

  return Buffer.concat([icondir, entrada, png]);
}

function descreverErro(erro) {
  if (!(erro instanceof Error)) return String(erro);
  const causa = erro.cause;
  if (causa && typeof causa === 'object' && 'code' in causa) {
    return `${erro.message} (${causa.code})`;
  }
  return erro.message;
}

try {
  const png = await baixarPng(url);
  validarPng(png);
  const ico = montarIco(png);
  await writeFile(destino, ico);
  console.log(`Ícone gravado em ${destino} (${ico.length} bytes, PNG ${TAMANHO}×${TAMANHO} embutido).`);
} catch (erro) {
  console.error(`Não consegui gerar o ícone a partir de ${url}: ${descreverErro(erro)}`);
  console.error('O servidor do Relacionador precisa estar no ar (npm run dev ou npm start) para baixar o ícone.');
  process.exit(1);
}
