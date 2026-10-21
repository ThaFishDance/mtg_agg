const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true});
 try {
 const page = await browser.newPage();
 for (const width of [320,375,768,1280]) {
  await page.setViewportSize({width,height:900});
  await page.goto('http://127.0.0.1:8765');
  for (const zoom of [1,2]) {
   await page.evaluate(z => {document.documentElement.style.zoom=z;},zoom);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),`fixture overflow at ${width}/${zoom}`);
   assert.equal(await page.locator('.ui-button-primary').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(201, 168, 76)');
   assert.equal(await page.locator('.ui-status-error').evaluate(e=>getComputedStyle(e).borderTopColor),'rgb(255, 180, 171)');
   const sizes=await page.locator('button,input').evaluateAll(es=>es.map(e=>({tag:e.tagName,w:parseFloat(getComputedStyle(e).width),h:parseFloat(getComputedStyle(e).height)})));
   for (const size of sizes) assert(size.w>=44 && size.h>=44,JSON.stringify({width,zoom,size}));
  }
  await page.evaluate(()=>{document.documentElement.style.zoom=1;});
  await page.goto('http://127.0.0.1:8765');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Skip to content');
  const outline=await page.evaluate(()=>getComputedStyle(document.activeElement).outlineWidth);
  assert.equal(outline,'2px');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'main');
  await page.getByLabel('Email', {exact:false}).fill('player@example.com');
  assert.equal(await page.getByLabel('Email', {exact:false}).inputValue(),'player@example.com');
  if (width===375 || width===1280) await page.screenshot({path:`${process.env.UI_SCREENSHOT_DIR || '/tmp/mtg-ui-check'}/fixture-${width}.png`,fullPage:true});
  console.log(`Fixture ${width}px: 100%/200% layout, target sizes, focus and fields passed`);
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('.ui-spinner').evaluate(e=>getComputedStyle(e).animationDuration),'1e-05s');


 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
