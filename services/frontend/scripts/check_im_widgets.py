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

        # Login
        await page.goto(f"{BASE}/login", wait_until="networkidle")
        await page.fill('input[type="email"]', EMAIL)
        await page.fill('input[type="password"]', PASSWORD)
        await page.click('button[type="submit"]')
        await page.wait_for_url("**/dashboard**", timeout=15000)

        # Select company
        await page.goto(f"{BASE}/admin/companies", wait_until="networkidle")
        await page.wait_for_timeout(2000)
        rows = await page.query_selector_all('ul li[class*="cursor-pointer"]')
        for row in rows:
            text = await row.inner_text()
            if "infomanager real" in text.lower() or "real" in text.lower():
                await row.click()
                await page.wait_for_timeout(3000)
                break

        IM_PANELS = [
            ("ventas_im", f"{BASE}/analytics/ventas", ["cobranza", "eficiencia", "Eficiencia", "En vivo", "Infomanager"]),
            ("compras_im", f"{BASE}/analytics/compras", ["vencimiento", "Vencimiento", "proveedor", "En vivo", "Infomanager"]),
            ("clientes_im", f"{BASE}/analytics/clientes", ["saldo", "Saldo", "facturas", "crédito", "Credito", "En vivo", "Infomanager"]),
            ("dashboard_im", f"{BASE}/dashboard", ["empresa", "Empresa", "ventas-por-empresa", "En vivo"]),
        ]

        for name, url, keywords in IM_PANELS:
            print(f"\n{'='*60}")
            print(f"PANEL: {name}")
            await page.goto(url, wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(5000)  # Extra wait for IM widgets to load

            body = await page.inner_text("body")
            lines = [l.strip() for l in body.splitlines() if l.strip()]

            # Print ALL lines (no truncation)
            found_keywords = []
            for kw in keywords:
                if kw.lower() in body.lower():
                    found_keywords.append(kw)

            print(f"Keywords found: {found_keywords}")
            print(f"Total text lines: {len(lines)}")

            # Find and print lines containing keywords
            for kw in keywords:
                for i, line in enumerate(lines):
                    if kw.lower() in line.lower():
                        start = max(0, i-2)
                        end = min(len(lines), i+5)
                        print(f"\n  Context around '{kw}':")
                        for l in lines[start:end]:
                            print(f"    {l}")
                        break

            fname = f"/tmp/imcheck_{name}.png"
            await page.screenshot(path=fname, full_page=True)
            print(f"\nScreenshot: {fname}")

        await browser.close()
        print("\n==> Done.")

asyncio.run(main())
