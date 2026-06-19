import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(device_scale_factor=2, viewport={"width":1280,"height":900})
        base = "/home/z/my-project/upload/screenshots"
        
        await page.goto("http://localhost:3000/", wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(4000)
        
        # Get Started
        btns = await page.query_selector_all('button')
        for b in btns:
            t = await b.text_content()
            if t and 'Get Started' in t:
                await b.click()
                await page.wait_for_timeout(2000)
                break
        await page.screenshot(path=f"{base}/fig07_roleselect.png")
        print("fig07_roleselect.png")
        
        # Service Seeker
        for el in await page.query_selector_all('button, [class*="cursor-pointer"]'):
            t = await el.text_content()
            if t and 'Service Seeker' in t and 'Provider' not in t:
                await el.click()
                await page.wait_for_timeout(1500)
                break
        await page.screenshot(path=f"{base}/fig08_seeker_signup.png")
        print("fig08_seeker_signup.png")
        
        # Login - click in the dialog, not the nav
        dialog_btns = await page.query_selector_all('[role="dialog"] button')
        for b in dialog_btns:
            t = await b.text_content()
            if t and 'Sign In' in t and len(t.strip()) < 20:
                await b.click()
                await page.wait_for_timeout(1000)
                break
        await page.screenshot(path=f"{base}/fig09_login.png")
        print("fig09_login.png")
        
        # Sign Up -> Provider
        dialog_btns2 = await page.query_selector_all('[role="dialog"] button')
        for b in dialog_btns2:
            t = await b.text_content()
            if t and 'Sign Up' in t:
                await b.click()
                await page.wait_for_timeout(1000)
                break
        await page.wait_for_timeout(500)
        
        # Back button to get role selection, then click Provider
        back_btns = await page.query_selector_all('[role="dialog"] button')
        for b in back_btns:
            t = await b.text_content()
            if 'Back' in t or '←' in t:
                await b.click()
                await page.wait_for_timeout(1000)
                break
        await page.wait_for_timeout(500)
        
        # Now click Provider
        for el in await page.query_selector_all('button, [class*="cursor-pointer"]'):
            t = await el.text_content()
            if t and 'Service Provider' in t and 'Seeker' not in t:
                await el.click()
                await page.wait_for_timeout(1500)
                break
        await page.screenshot(path=f"{base}/fig10_provider_top.png")
        print("fig10_provider_top.png")
        
        # Scroll in dialog
        scrollable = await page.query_selector('[class*="overflow-y-auto"]')
        if scrollable:
            await scrollable.evaluate('el => el.scrollTop = 300')
            await page.wait_for_timeout(500)
        await page.screenshot(path=f"{base}/fig11_provider_skills.png")
        print("fig11_provider_skills.png")
        
        if scrollable:
            await scrollable.evaluate('el => el.scrollTop = 600')
            await page.wait_for_timeout(500)
        await page.screenshot(path=f"{base}/fig12_provider_bank.png")
        print("fig12_provider_bank.png")
        
        # Architecture diagram
        try:
            await page.goto("http://localhost:3000/architecture-diagram.png", wait_until="load", timeout=10000)
            await page.wait_for_timeout(2000)
            await page.screenshot(path=f"{base}/fig13_arch.png")
            print("fig13_arch.png")
        except:
            print("Architecture diagram failed")
        
        await browser.close()
        print("\nDone!")

asyncio.run(main())
