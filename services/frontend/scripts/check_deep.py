import asyncio
from playwright.async_api import async_playwright

BASE = "https://frontend-production-0ec5.up.railway.app"
EMAIL = "babottomas561@gmail.com"
PASSWORD = "1234"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1440, "height": 900}, ignore_https_errors=True)
        page = await ctx.new_page()

        # Login + select company
        await page.goto(f"{BASE}/login", wait_until="networkidle")
        await page.fill('input[type="email"]', EMAIL)
        await page.fill('input[type="password"]', PASSWORD)
        await page.click('button[type="submit"]')
        await page.wait_for_url("**/dashboard**", timeout=15000)
        await page.goto(f"{BASE}/admin/companies", wait_until="networkidle")
        await page.wait_for_timeout(2000)
        rows = await page.query_selector_all('ul li[class*="cursor-pointer"]')
        for row in rows:
            text = await row.inner_text()
            if "real" in text.lower():
                await row.click()
                await page.wait_for_timeout(3000)
                break

        # Check Compras - dump ALL text to find vencimientos widget
        print("="*60)
        print("COMPRAS - Full text (looking for Vencimientos widget)")
        await page.goto(f"{BASE}/analytics/compras", wait_until="networkidle")
        await page.wait_for_timeout(6000)
        body = await page.inner_text("body")
        lines = [l.strip() for l in body.splitlines() if l.strip()]
        print(f"Total lines: {len(lines)}")
        # Print last 100 lines (widgets at bottom of page)
        print("\n--- Last 100 lines ---")
        for l in lines[-100:]:
            print(f"  {l}")

        # Check for errors in page
        errors = await page.query_selector_all('[class*="error"], [class*="Error"]')
        print(f"\nError elements found: {len(errors)}")
        for e in errors[:5]:
            try:
                print(f"  Error: {await e.inner_text()}")
            except:
                pass

        await page.screenshot(path="/tmp/deep_compras_full.png", full_page=True)

        # Check Dashboard - dump all text
        print("\n" + "="*60)
        print("DASHBOARD - Full text (looking for VentasPorEmpresa widget)")
        await page.goto(f"{BASE}/dashboard", wait_until="networkidle")
        await page.wait_for_timeout(5000)
        body = await page.inner_text("body")
        lines = [l.strip() for l in body.splitlines() if l.strip()]
        print(f"Total lines: {len(lines)}")
        print("\n--- All lines ---")
        for l in lines:
            print(f"  {l}")
        await page.screenshot(path="/tmp/deep_dashboard_full.png", full_page=True)

        await browser.close()
        print("\n==> Done.")

asyncio.run(main())
