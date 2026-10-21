// Run with PLAYWRIGHT_MODULE pointing to an installed Playwright package.
// Exercises the real component with a fake Clerk session and HTTP responses.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const { createServer } = await import('vite');
  const root = process.cwd();
  const user = { firstName: 'Ada', lastName: 'Player', primaryEmailAddress: { emailAddress: 'ada@example.com' } };
  const server = await createServer({
    configFile: false, root, server: { host: '127.0.0.1', port: 8766, strictPort: true },
    esbuild: { jsx: 'automatic' },
    resolve: { alias: { '@': path.join(root, 'src') } },
    plugins: [{
      name: 'profile-fixture',
      enforce: 'pre',
      resolveId(id) {
        if (id === '@clerk/nextjs') return '\0mock-clerk';
        if (id === '/profile-entry.jsx') return '\0profile-entry.jsx';
      },
      load(id) {
        if (id === '\0profile-entry.jsx') return `import React from 'react';
          import {createRoot} from 'react-dom/client';
          import {ProfileOnboarding} from '/src/components/ProfileOnboarding.tsx';
          createRoot(document.getElementById('root')).render(React.createElement('main',{className:'ui-container ui-section'},React.createElement(ProfileOnboarding)));`;
        if (id === '\0mock-clerk') return `import React from 'react'; const user=${JSON.stringify(user)};
          export const useUser=()=>({isLoaded:true,isSignedIn:!location.search.includes('signedout'),user});
          export const SignInButton=({children})=>children;`;
      },
      configureServer(instance) {
        instance.middlewares.use((req, res, next) => {
          if (!req.url.startsWith('/fixture')) return next();
          res.setHeader('Content-Type', 'text/html');
          res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/profile-fixture.css"></head><body><div id="root"></div><script type="module" src="/profile-entry.jsx"></script></body></html>`);
        });
      },
    }],
    optimizeDeps: { include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'], exclude: ['@clerk/nextjs'] },
  });
  await server.listen();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on('pageerror', error => console.error(error.message));
    await page.route('**/profile-fixture.css', route => route.fulfill({
      contentType: 'text/css', path: '/tmp/mtg-ui-check/ui.css',
    }));
    let mode = 'form';
    let posts = 0;
    await page.route('**/api/profile', async route => {
      if (route.request().method() === 'POST') {
        posts++;
        if (mode === 'network') return route.abort();
        if (mode === 'conflict') return route.fulfill({ status: 409, json: { detail: 'Conflict' } });
        if (mode === 'validation') return route.fulfill({ status: 422, json: { detail: [] } });
        return route.fulfill({ status: 201, json: { user_id: 1, ...JSON.parse(route.request().postData()) } });
      }
      if (mode === 'expired') return route.fulfill({ status: 401, json: { detail: 'Expired' } });
      if (mode === 'loaderror') return route.fulfill({ status: 502, json: { detail: 'Backend unavailable' } });
      return route.fulfill({ status: 403, json: { detail: 'Create your local profile first' } });
    });
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      mode = 'form';
      await page.goto('http://127.0.0.1:8766/fixture');
      await page.getByLabel('First name').waitFor();
      assert.equal(await page.getByLabel('First name').inputValue(), 'Ada');
      for (const zoom of [1, 2]) {
        await page.evaluate(z => { document.documentElement.style.zoom = z; }, zoom);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow ${width}/${zoom}`);
        for (const box of await page.locator('input,button').evaluateAll(es => es.map(e => ({ w: parseFloat(getComputedStyle(e).width), h: parseFloat(getComputedStyle(e).height) })))) {
          assert(box.w >= 44 && box.h >= 44);
        }
      }
      await page.evaluate(() => { document.documentElement.style.zoom = 1; });
      await page.getByLabel('First name').fill('Edited');
      for (const failure of ['network', 'conflict', 'validation']) {
        mode = failure;
        await page.getByRole('button', { name: 'Save profile' }).click();
        await page.getByRole('alert').waitFor();
        assert.equal(await page.getByLabel('First name').inputValue(), 'Edited');
      }
      mode = 'form';
      await page.getByRole('button', { name: 'Save profile' }).click();
      await page.getByText('Welcome, Edited', { exact: true }).waitFor();
      console.log(`Profile ${width}px: layout, 200% CSS scaling, save, validation, conflict and retry passed`);
    }
    mode = 'loaderror';
    await page.goto('http://127.0.0.1:8766/fixture');
    await page.getByRole('button', { name: 'Retry' }).waitFor();
    mode = 'form';
    await page.getByRole('button', { name: 'Retry' }).click();
    await page.getByLabel('First name').waitFor();
    mode = 'expired';
    await page.reload();
    await page.getByRole('button', { name: 'Sign in again' }).waitFor();
    await page.goto('http://127.0.0.1:8766/fixture?signedout');
    await page.getByText('Sign in using the button above to set up your profile.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Sign in', exact: true }).count(), 0);
    assert.equal(posts, 16);
    console.log('Profile load retry, session expiry and signed-out states passed');
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
