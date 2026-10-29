// 저장소 루트의 게임 파일을 www/로 복사하고, index.html에 앱 전용 다리(native-bridge.js)를 끼워 넣는다.
// 게임 코드는 건드리지 않는다. `npm run sync` 때마다 다시 만든다.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const app = path.resolve(__dirname, '..');
const www = path.join(app, 'www');

fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });
for (const name of ['index.html', 'style.css', 'src', 'assets']) {
  fs.cpSync(path.join(root, name), path.join(www, name), { recursive: true });
}
fs.copyFileSync(path.join(app, 'native-bridge.js'), path.join(www, 'native-bridge.js'));

const indexPath = path.join(www, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');
const marker = '<script src="src/utils.js"></script>';
if (!html.includes(marker)) throw new Error('index.html에서 첫 스크립트(' + marker + ')를 찾지 못했습니다');
fs.writeFileSync(indexPath, html.replace(marker, '<script src="native-bridge.js"></script>\n' + marker));
console.log('www/ 준비 완료');
