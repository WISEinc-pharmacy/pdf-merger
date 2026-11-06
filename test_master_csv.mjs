import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const start = html.indexOf('function parseCsv(');
const end = html.indexOf('// ---- フォルダ読み込み ----', start);
assert.notEqual(start, -1, 'parseCsv の開始位置が見つかりません');
assert.notEqual(end, -1, 'CSV 関数の終了位置が見つかりません');

const source = html.slice(start, end);
const { parseCsv, importMasterFromRows } = vm.runInNewContext(
  `${source}\n({ parseCsv, importMasterFromRows });`
);
const importCsv = text => JSON.parse(JSON.stringify(importMasterFromRows(parseCsv(text))));

assert.deepEqual(
  importCsv('送付先名,番号\nA病院,001'),
  [{ name: 'A病院', code: '001' }],
  '日本語ヘッダの正順'
);

assert.deepEqual(
  importCsv('番号,送付先名\n001,A病院'),
  [{ name: 'A病院', code: '001' }],
  '日本語ヘッダの逆順'
);

assert.deepEqual(
  importCsv('001,A病院\n002,B薬局'),
  [
    { name: 'A病院', code: '001' },
    { name: 'B薬局', code: '002' }
  ],
  'ヘッダなしの逆順'
);

assert.deepEqual(
  importCsv('A病院,001\nB薬局,002'),
  [
    { name: 'A病院', code: '001' },
    { name: 'B薬局', code: '002' }
  ],
  'ヘッダなしの正順'
);

assert.deepEqual(
  importCsv('\uFEFF番号,送付先名\n001,"A,B病院"'),
  [{ name: 'A,B病院', code: '001' }],
  'BOM とダブルクオート入り名称'
);

assert.deepEqual(
  importCsv('code,name\n001,A病院'),
  [{ name: 'A病院', code: '001' }],
  '英語ヘッダの逆順'
);
assert.deepEqual(
  importCsv('name,code\nA病院,001'),
  [{ name: 'A病院', code: '001' }],
  '英語ヘッダの正順'
);

assert.deepEqual(
  importCsv('no,施設\n１２３-４５,A病院'),
  [{ name: 'A病院', code: '１２３-４５' }],
  '片側だけ判別できるヘッダでは残りの列を使う'
);

assert.deepEqual(
  importCsv('１２３ - ４５,A病院'),
  [{ name: 'A病院', code: '１２３ - ４５' }],
  '全角数字・ハイフン・空白だけの番号を判別する'
);

assert.deepEqual(
  importCsv('3丁目薬局,12'),
  [{ name: '3丁目薬局', code: '12' }],
  '数字を含む名称を番号と誤判定しない'
);

assert.deepEqual(
  importCsv('001,A病院\nB薬局,002\n003,C医院'),
  [
    { name: 'A病院', code: '001' },
    { name: '002', code: 'B薬局' },
    { name: 'C医院', code: '003' }
  ],
  '多数決した列順をCSV全体に適用する'
);

assert.deepEqual(
  importCsv('\nA病院,001\n,002\nB薬局,\n,\n   ,   \n'),
  [
    { name: 'A病院', code: '001' },
    { name: '', code: '002' },
    { name: 'B薬局', code: '' }
  ],
  '空行は除外し、片方だけの値は維持する'
);

assert.match(html, /送付先名,番号/, 'CSV 出力ヘッダを変更しない');

console.log('ALL PASS');
