import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(device_scale_factor=2, viewport={"width":1280,"height":900})
        base = "/home/z/my-project/upload/screenshots"
        
        # ===== LANDING PAGE SECTIONS =====
        print("Loading landing page...")
        await page.goto("https://homeease.vercel.app/", wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(3000)
        
        await page.screenshot(path=f"{base}/fig01_hero.png")
        print("fig01_hero.png")
        
        await page.evaluate("window.scrollTo(0, 350)")
        await page.wait_for_timeout(500)
        await page.screenshot(path=f"{base}/fig02_trust_metrics.png")
        print("fig02_trust_metrics.png")
        
        await page.evaluate("window.scrollTo(0, 550)")
        await page.wait_for_timeout(500)
        await page.screenshot(path=f"{base}/fig03_services_grid.png")
        print("fig03_services_grid.png")
        
        await page.evaluate("window.scrollTo(0, 950)")
        await page.wait_for_timeout(500)
        await page.screenshot(path=f"{base}/fig04_features.png")
        print("fig04_features.png")
        
        await page.evaluate("window.scrollTo(0, 1350)")
        await page.wait_for_timeout(500)
        await page.screenshot(path=f"{base}/fig05_how_it_works.png")
        print("fig05_how_it_works.png")
        
        await page.evaluate("window.scrollTo(0, 1800)")
        await page.wait_for_timeout(500)
        await page.screenshot(path=f"{base}/fig06_cta_footer.png")
        print("fig06_cta_footer.png")
        
        # ===== AUTH FLOWS =====
        await page.evaluate("window.scrollTo(0, 0)")
        await page.wait_for_timeout(500)
        
        btns = await page.query_selector_all('button')
        for b in btns:
            t = await b.text_content()
            if t and 'Get Started' in t:
                await b.click()
                await page.wait_for_timeout(2000)
                break
        await page.screenshot(path=f"{base}/fig07_role_selection.png")
        print("fig07_role_selection.png")
        
        clickables = await page.query_selector_all('button, [class*="cursor-pointer"]')
        for el in clickables:
            t = await el.text_content()
            if t and 'Service Seeker' in t and len(t.strip()) < 30:
                await el.click()
                await page.wait_for_timeout(1500)
                break
        await page.screenshot(path=f"{base}/fig08_seeker_signup.png")
        print("fig08_seeker_signup.png")
        
        btns2 = await page.query_selector_all('button')
        for b in btns2:
            t = await b.text_content()
            if t and 'Sign In' in t and len(t.strip()) < 20:
                await b.click()
                await page.wait_for_timeout(1000)
                break
        await page.screenshot(path=f"{base}/fig09_login_form.png")
        print("fig09_login_form.png")
        
        btns3 = await page.query_selector_all('button')
        for b in btns3:
            t = await b.text_content()
            if t and 'Sign Up' in t:
                await b.click()
                await page.wait_for_timeout(1000)
                break
        await page.wait_for_timeout(300)
        
        clickables2 = await page.query_selector_all('button, [class*="cursor-pointer"]')
        for el in clickables2:
            t = await el.text_content()
            if t and 'Service Provider' in t and len(t.strip()) < 30:
                await el.click()
                await page.wait_for_timeout(1500)
                break
        await page.screenshot(path=f"{base}/fig10_provider_signup_top.png")
        print("fig10_provider_signup_top.png")
        
        # Scroll dialog down
        await page.evaluate("""
            const scrollable = document.querySelector('[class*="overflow-y-auto"]');
            if (scrollable) scrollable.scrollTop = 400;
        """)
        await page.wait_for_timeout(500)
        await page.screenshot(path=f"{base}/fig11_provider_skills.png")
        print("fig11_provider_skills.png")
        
        await page.evaluate("""
            const scrollable = document.querySelector('[class*="overflow-y-auto"]');
            if (scrollable) scrollable.scrollTop = 800;
        """)
        await page.wait_for_timeout(500)
        await page.screenshot(path=f"{base}/fig12_provider_bank.png")
        print("fig12_provider_bank.png")
        
        # Close and get architecture diagram
        for b in await page.query_selector_all('button'):
            t = await b.text_content()
            if t and ('Close' in t or t.strip() in ['✕', 'X']):
                await b.click()
                await page.wait_for_timeout(300)
                break
        
        await page.goto("https://homeease.vercel.app/architecture-diagram.png", wait_until="load", timeout=30000)
        await page.wait_for_timeout(2000)
        await page.screenshot(path=f"{base}/fig13_architecture.png")
        print("fig13_architecture.png")
        
        await browser.close()
        print(f"\nAll 13 screenshots captured!")

asyncio.run(main())
