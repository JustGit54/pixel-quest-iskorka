import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const root = process.cwd();
const android = path.join(root, 'android');
const manifestPath = path.join(android, 'app', 'src', 'main', 'AndroidManifest.xml');

if (!fs.existsSync(manifestPath)) throw new Error('Android-проект не найден. Сначала выполни: npx cap add android');

let manifest = fs.readFileSync(manifestPath, 'utf8');
if (!manifest.includes('android:screenOrientation="landscape"')) {
  manifest = manifest.replace('android:launchMode="singleTask"', 'android:launchMode="singleTask"\n            android:screenOrientation="landscape"');
}
if (!manifest.includes('android:usesCleartextTraffic="false"')) {
  manifest = manifest.replace('android:supportsRtl="true"', 'android:supportsRtl="true"\n        android:usesCleartextTraffic="false"');
}
fs.writeFileSync(manifestPath, manifest);

const svg = fs.readFileSync(path.join(root, 'resources', 'icon.svg'));
for (const [density, pixels] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
  const dir = path.join(android, 'app', 'src', 'main', 'res', `mipmap-${density}`);
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: pixels } }).render().asPng();
  fs.mkdirSync(dir, { recursive: true });
  for (const name of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) fs.writeFileSync(path.join(dir, name), png);
}

console.log('Android: настроены ландшафтная ориентация и иконки Pixel Quest.');
