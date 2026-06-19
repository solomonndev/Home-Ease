import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(device_scale_factor=2, viewport={"width":1280,"height":900})
        base = "/home/z/my-project/upload/screenshots"
        
        # Load the page
        print("Loading...")
        await page.goto("http://localhost:3000/", wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(5000)  # Wait for full render
        
        text = await page.evaluate("document.body.innerText")
        print(f"Page text first 200 chars: {text[:200]}")
        
        if "Find Trusted" in text:
            print("CORRECT VERSION - has new landing page")
        else:
            print("WRONG VERSION - old landing page")
            await browser.close()
            return
        
        # 1. Hero section (scroll position 0)
        await page.screenshot(path=f"{base}/fig01_hero.png")
        print("fig01_hero.png captured")
        
        # 2. Trust metrics (scroll ~400)
        await page.evaluate("window.scrollBy(0, 400)")
        await page.wait_for_timeout(500)
        await page.screenshot(path=f"{base}/fig02_trust.png")
        print("fig02_trust.png captured")
        
        # 3. Services grid (~800)
        await page.evaluate("window.scrollBy(0, 400)")
        await page.wait_for_timeout(500)
        await page.screenshot(path=f"{base}/fig03_services.png")
        print("fig03_services.png captured")
        
        # 4. Features (~1200)
        await page.evaluate("window.scrollBy(0, 400)")
        await page.wait_for_timeout(500)
        await page.screenshot(path=f"{base}/fig04_features.png")
        print("fig04_features.png captured")
        
        # 5. How it works (~1600)
        await page.evaluate("window.scrollBy(0, 400)")
        await page.wait_for_timeout(500)
        await page.screenshot(path=f"{base}/fig05_howitworks.png")
        print("fig05_howitworks.png captured")
        
        # 6. CTA + footer (~2000)
        await page.evaluate("window.scrollBy(0, 400)")
        await page.wait_for_timeout(500)
        await page.screenshot(path=f"{base}/fig06_footer.png")
        print("fig06_footer.png captured")
        
        # Go back to top for auth flows
        await page.evaluate("window.scrollTo(0, 0)")
        await page.wait_for_timeout(500)
        
        # 7. Click Get Started
        clicked = False
        btns = await page.query_selector_all('button')
        for b in btns:
            t = await b.text_content()
            if t and 'Get Started' in t:
                await b.click()
                await page.wait_for_timeout(2000)
                clicked = True
                break
        if clicked:
            await page.screenshot(path=f"{base}/fig07_roleselect.png")
            print("fig07_roleselect.png captured")
        else:
            print("Could not find Get Started button")
        
        # 8. Click Service Seeker
        clicked2 = False
        for el in await page.query_selector_all('button, [class*="cursor-pointer"]'):
            t = await el.text_content()
            if t and 'Service Seeker' in t and 'Provider' not in t:
                await el.click()
                await page.wait_for_timeout(1500)
                clicked2 = True
                break
        if clicked2:
            await page.screenshot(path=f"{base}/fig08_seeker_signup.png")
            print("fig08_seeker_signup.png captured")
        
        # 9. Switch to login
        for b in await page.query_selector_all('button'):
            t = await b.text_content()
            if t and 'Sign In' in t and len(t.strip()) < 20:
                await b.click()
                await page.wait_for_timeout(1000)
                break
        await page.screenshot(path=f"{base}/fig09_login.png")
        print("fig09_login.png captured")
        
        # 10. Switch to Sign Up, then Provider
        for b in await page.query_selector_all('button'):
            t = await b.text_content()
            if t and 'Sign Up' in t:
                await b.click()
                await page.wait_for_timeout(1000)
                break
        await page.wait_for_timeout(500)
        
        for el in await page.query_selector_all('button, [class*="cursor-pointer"]'):
            t = await el.text_content()
            if t and 'Service Provider' in t and 'Seeker' not in t:
                await el.click()
                await page.wait_for_timeout(1500)
                break
        await page.screenshot(path=f"{base}/fig10_provider_top.png")
        print("fig10_provider_top.png captured")
        
        # 11. Scroll down in provider form for skills
        scrollable = await page.query_selector('[class*="overflow-y-auto"]')
        if scrollable:
            await scrollable.evaluate('el => el.scrollTop = 300')
            await page.wait_for_timeout(500)
        await page.screenshot(path=f"{base}/fig11_provider_skills.png")
        print("fig11_provider_skills.png captured")
        
        # 12. Scroll more for bank details
        if scrollable:
            await scrollable.evaluate('el => el.scrollTop = 600')
            await page.wait_for_timeout(500)
        await page.screenshot(path=f"{base}/fig12_provider_bank.png")
        print("fig12_provider_bank.png captured")
        
        # 13. Architecture diagram
        try:
            await page.goto("http://localhost:3000/architecture-diagram.png", wait_until="load", timeout=10000)
            await page.wait_for_timeout(2000)
            await page.screenshot(path=f"{base}/fig13_arch.png")
            print("fig13_arch.png captured")
        except:
            print("Could not capture architecture diagram")
        
        await browser.close()
        print("\nDone!")

asyncio.run(main())
