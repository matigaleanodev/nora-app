import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: [process.env.RUNTIME_NODE_MODULES || process.cwd()] }));
const directory = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 1250 } });
  await page.goto(pathToFileURL(path.join(directory, 'nora-presupuesto-ejemplo.html')).href);
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.join(directory, 'nora-presupuesto-ejemplo.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  await page.screenshot({ path: path.join(directory, 'nora-presupuesto-ejemplo.png'), fullPage: true });
} finally {
  await browser.close();
}
