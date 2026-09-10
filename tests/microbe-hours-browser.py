import asyncio, os
from playwright.async_api import async_playwright
async def run():
 async with async_playwright() as p:
  b=await p.chromium.launch(channel='chrome',headless=True);page=await b.new_page(viewport={'width':390,'height':844});calls=[]
  page.on('request',lambda r:calls.append(r.url) if '/api/microbe' in r.url else None)
  await page.goto(os.environ.get('MICROBE_URL','http://127.0.0.1:8788/microbe.html'));await page.locator('#hours-gate').wait_for(state='visible');await asyncio.sleep(11)
  assert len(calls)==1,calls
  await page.locator('#access-code').fill('wrong');await page.locator('#unlock-form button').click();await page.locator('#unlock-error').filter(has_text='다시').wait_for();assert await page.locator('#lobby').is_hidden()
  await page.screenshot(path='tests/microbe-preview/hours-closed.png',full_page=True)
  await page.locator('#access-code').fill(os.environ.get('MICROBE_ACCESS_CODE',''));await page.locator('#unlock-form button').click();await page.locator('.room').last.wait_for();assert await page.locator('.room').count()==15
  await page.reload();await page.locator('.room').last.wait_for();assert await page.locator('#hours-gate').is_hidden()
  await page.evaluate('async()=>{await authReady;await fbAuth.currentUser.delete()}');await b.close();print('PASS closed polling stopped, wrong code rejected, correct code unlocks, reload persists')
asyncio.run(run())
