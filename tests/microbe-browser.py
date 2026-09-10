import asyncio, json, os
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    root = os.environ.get('MICROBE_URL', 'http://127.0.0.1:8788/microbe.html')
    out = Path('tests/microbe-preview'); out.mkdir(exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='chrome', headless=True)
        contexts = [await browser.new_context(viewport={'width':1440,'height':1050}), await browser.new_context(viewport={'width':390,'height':844})]
        pages = [await c.new_page() for c in contexts]
        errors=[]
        for page in pages: page.on('pageerror', lambda e: errors.append(str(e)))
        try:
            await asyncio.gather(*(page.goto(root) for page in pages))
            for page in pages:
                await page.wait_for_function("!document.getElementById('hours-gate').hidden || document.querySelectorAll('.room').length===15")
                if await page.locator('#hours-gate').is_visible():
                    await page.locator('#access-code').fill(os.environ.get('MICROBE_ACCESS_CODE',''))
                    await page.locator('#unlock-form button').click()
                await page.locator('.room').last.wait_for(timeout=30000)
            assert await pages[0].locator('.room').count()==15
            await pages[0].screenshot(path=str(out/'lobby-desktop.png'), full_page=True)
            await pages[1].screenshot(path=str(out/'lobby-mobile.png'), full_page=True)
            empty = pages[0].locator('.room').filter(has_text='0/2명').last
            roomname = await empty.locator('strong').inner_text()
            await empty.click()
            await pages[0].locator('#match').wait_for(state='visible')
            assert await pages[0].locator('#ready').is_disabled()
            await pages[1].locator('.room').filter(has_text=roomname).click()
            for page in pages: await page.locator('#ready:enabled').wait_for(timeout=15000)
            await pages[0].locator('#ready').click()
            await pages[0].get_by_role('button',name='준비 완료',exact=True).wait_for()
            assert await pages[0].locator('#game-panel').is_hidden()
            await pages[1].locator('#ready').click()
            for page in pages: await page.locator('#game-panel').wait_for(state='visible', timeout=15000)
            actor=pages[0] if '내 차례' in await pages[0].locator('#status').inner_text() else pages[1]
            await actor.locator('.card').first.click()
            await actor.locator('.site.candidate').first.click()
            await actor.screenshot(path=str(out/'selected-card.png'),full_page=True)
            await actor.locator('#roll').click()
            await actor.locator('#confirm:enabled').wait_for()
            await actor.locator('#confirm').click()
            await actor.locator('#history li').first.wait_for()
            for page in pages: await page.locator("#history li").first.wait_for(timeout=15000)
            for i,page in enumerate(pages):
                assert await page.locator('#history li').count()==1
                assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                await page.screenshot(path=str(out/('game-desktop.png' if i==0 else 'game-mobile.png')),full_page=True)
            await pages[0].reload()
            await pages[0].locator('#history li').first.wait_for(timeout=15000)
            assert not errors, errors
            print(json.dumps({'pass':True,'rooms':15,'twoBrowsers':True,'readyGate':True,'turnPlayed':True,'refreshRestored':True,'mobileOverflow':False}))
        finally:
            for page in pages:
                try:
                    await page.evaluate('''async()=>{await authReady;const user=fbAuth.currentUser;const token=await user.getIdToken();const room=localStorage.getItem('knn-microbe-room');if(room)await fetch('/api/microbe',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({type:'leave',room})});await user.delete();}''')
                except Exception: pass
            await browser.close()

asyncio.run(main())
