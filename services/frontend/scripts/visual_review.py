import asyncio
from playwright.async_api import async_playwright

BASE = "https://frontend-production-0ec5.up.railway.app"
EMAIL = "babottomas561@gmail.com"
PASSWORD = "1234"

PANELS = [
    ("dashboard",    f"{BASE}/dashboard"),
    ("ventas",       f"{BASE}/analytics/ventas"),
    ("compras",      f"{BASE}/analytics/compras"),
    ("resultado",    f"{BASE}/analytics/resultado"),
    ("stock",        f"{BASE}/analytics/stock"),
    ("vendedores",   f"{BASE}/analytics/vendedores"),
    ("clientes",     f"{BASE}/analytics/clientes"),
    ("proveedores",  f"{BASE}/analytics/proveedores"),
    ("caja",         f"{BASE}/analytics/caja"),
    ("admin",        f"{BASE}/admin/companies"),
    ("reportes_redir", f"{BASE}/reportes"),
]

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1440, "height": 900}, ignore_https_errors=True)
        page = await ctx.new_page()

        # Login
        print("==> Logging in...")
        await page.goto(f"{BASE}/login", wait_until="networkidle")
        await page.screenshot(path="/tmp/00_login.png")
        await page.fill('input[type="email"]', EMAIL)
        await page.fill('input[type="password"]', PASSWORD)
        await page.click('button[type="submit"]')
        await page.wait_for_url("**/dashboard**", timeout=15000)
        print(f"    Logged in. Current URL: {page.url}")
        await page.screenshot(path="/tmp/01_dashboard_initial.png")

        # Select company with Infomanager (Demo Infomanager Real)
        print("\n==> Selecting active company (Demo Infomanager Real)...")
        await page.goto(f"{BASE}/admin/companies", wait_until="networkidle")
        await page.wait_for_timeout(2000)
        # Find the "Entrar" button for "Demo Infomanager Real"
        # Look for the row containing that company name, then click its Entrar button
        await page.screenshot(path="/tmp/01b_admin_before_select.png")

        # "Entrar" is a span inside a clickable <li> — find <li> rows
        rows = await page.query_selector_all('ul li[class*="cursor-pointer"]')
        print(f"    Found {len(rows)} company rows")
        clicked = False
        for i, row in enumerate(rows):
            try:
                text = await row.inner_text()
                print(f"    Row {i}: {text[:80].strip()}")
                if "infomanager real" in text.lower() or "real" in text.lower():
                    print(f"    -> Clicking row: {text[:60].strip()}")
                    await row.click()
                    await page.wait_for_timeout(3000)
                    print(f"    Active company set. URL: {page.url}")
                    clicked = True
                    break
            except Exception as e:
                print(f"    Error on row {i}: {e}")

        if not clicked and rows:
            print("    -> Falling back: clicking last row")
            await rows[-1].click()
            await page.wait_for_timeout(3000)
            print(f"    Clicked last row. URL: {page.url}")

        await page.screenshot(path="/tmp/01c_after_company_select.png")

        for idx, (name, url) in enumerate(PANELS, start=2):
            print(f"\n==> Panel: {name} — {url}")
            await page.goto(url, wait_until="networkidle", timeout=30000)
            # Wait a bit for data fetches
            await page.wait_for_timeout(3000)
            final_url = page.url
            fname = f"/tmp/{idx:02d}_{name}.png"
            await page.screenshot(path=fname, full_page=True)
            print(f"    Final URL: {final_url}")
            print(f"    Screenshot: {fname}")

            # Gather visible text for KPIs/errors
            try:
                body_text = await page.inner_text("body")
                lines = [l.strip() for l in body_text.splitlines() if l.strip()]
                # Print first 40 non-empty lines
                for l in lines[:40]:
                    print(f"    > {l}")
            except Exception as e:
                print(f"    (could not read body: {e})")

        await browser.close()
        print("\n==> Done.")

asyncio.run(main())
