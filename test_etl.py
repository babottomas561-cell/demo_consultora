import requests
import time
import subprocess
import os
import sys

base_url = "http://localhost:8080/api/v1"

# 1. Start uvicorn
api_proc = subprocess.Popen(["../../.venv/bin/python", "-m", "uvicorn", "app.main:app", "--port", "8080"], cwd="services/api")

# 2. Start Celery worker
# Need to set PYTHONPATH so it can find the app
env = os.environ.copy()
env["PYTHONPATH"] = os.path.abspath("services/worker")
worker_proc = subprocess.Popen(
    ["../../.venv/bin/celery", "-A", "worker_app.celery_app", "worker", "--loglevel=info"], 
    cwd="services/worker",
    env=env
)

time.sleep(5) # wait for both to start

try:
    print("1. Registering Admin...")
    r = requests.post(f"{base_url}/auth/register", json={"email": "etladmin99@demo.com", "password": "pass"})
    print("Register Status:", r.status_code)
    
    print("\n2. Logging in...")
    r = requests.post(f"{base_url}/auth/login", json={"email": "etladmin99@demo.com", "password": "pass"})
    admin_token = r.json().get("access_token")
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    print("\n3. Creating Company...")
    r = requests.post(f"{base_url}/companies/", json={"name": "ETL Corp", "erp_type": "excel"}, headers=headers)
    company_id = r.json().get("id")
    
    # Needs to log in again to get the updated token with company_id!
    # Wait, the first time you login you don't have a company.
    # We must login AGAIN to get the updated tenant_schema in the JWT.
    print("\n4. Logging in AGAIN to refresh token with company_id...")
    r = requests.post(f"{base_url}/auth/login", json={"email": "etladmin99@demo.com", "password": "pass"})
    admin_token = r.json().get("access_token")
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    print("\n5. Uploading valid Excel...")
    with open("test_data.xlsx", "rb") as f:
        r = requests.post(f"{base_url}/sync/excel", data={"company_id": company_id}, files={"file": f}, headers=headers)
    
    print("Upload Status:", r.status_code, r.text)
    if r.status_code != 200:
        print("Upload failed!")
        sys.exit(1)
        
    job_id = r.json().get("job_id")
    
    print("\n6. Polling for job completion...")
    for _ in range(15):
        r = requests.get(f"{base_url}/sync/jobs/{job_id}", headers=headers)
        status = r.json().get("status")
        print(f"Job Status: {status}")
        if status in ["done", "failed"]:
            print("Result:", r.json())
            break
        time.sleep(2)
        
    print("\n7. Uploading BAD Excel...")
    with open("bad_data.xlsx", "rb") as f:
        r = requests.post(f"{base_url}/sync/excel", data={"company_id": company_id}, files={"file": f}, headers=headers)
    bad_job_id = r.json().get("job_id")
    
    for _ in range(15):
        r = requests.get(f"{base_url}/sync/jobs/{bad_job_id}", headers=headers)
        status = r.json().get("status")
        print(f"Bad Job Status: {status}")
        if status in ["done", "failed"]:
            print("Result:", r.json())
            break
        time.sleep(2)
        
finally:
    api_proc.terminate()
    worker_proc.terminate()
