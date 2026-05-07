import requests
import time
import sys

base_url = "http://localhost:8000/api/v1"

print("1. Logging in as etladmin99@demo.com...")
r = requests.post(f"{base_url}/auth/login", json={"email": "etladmin99@demo.com", "password": "pass"})
if r.status_code != 200:
    print("Login failed:", r.text)
    sys.exit(1)
    
admin_token = r.json().get("access_token")
headers = {"Authorization": f"Bearer {admin_token}"}

print("\n2. Creating Company 'Dashboard Corp'...")
r = requests.post(f"{base_url}/companies/", json={"name": "Dashboard Corp 9", "erp_type": "excel"}, headers=headers)
if r.status_code != 200:
    print("Company creation failed:", r.text)
    sys.exit(1)
company_id = r.json().get("id")
print(f"Company ID: {company_id}")

print("\n3. Checking empty dashboard...")
r = requests.get(f"{base_url}/dashboard/kpis", headers=headers)
print("Empty KPIs:", r.status_code, r.text)

print("\n4. Uploading Excel...")
with open("test_data.xlsx", "rb") as f:
    r = requests.post(f"{base_url}/sync/excel", data={"company_id": company_id}, files={"file": f}, headers=headers)
    
if r.status_code != 200:
    print("Upload failed:", r.text)
    sys.exit(1)

job_id = r.json().get("job_id")
print(f"Job ID: {job_id}")

for _ in range(15):
    time.sleep(2)
    r = requests.get(f"{base_url}/sync/jobs/{job_id}", headers=headers)
    status = r.json().get("status")
    print(f"Job Status: {status}, Error: {r.json().get('error')}")
    if status in ["done", "failed"]:
        break

print("\n5. Checking populated dashboard...")
r = requests.get(f"{base_url}/dashboard/kpis?company_id={company_id}", headers=headers)
print("Populated KPIs:", r.status_code, r.text)

r = requests.get(f"{base_url}/dashboard/top-clientes?company_id={company_id}", headers=headers)
print("Top Clientes:", r.status_code, r.text)
