from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
GENERATED_DATA_DIR = BASE_DIR / "generated_data"

DEMO_CLIENT_ID = "demo_client"
DEMO_CLIENT_SECRET = "demo_secret"
TOKEN_PREFIX = "fake_access_token_"
TOKEN_EXPIRES_SECONDS = 86_400

START_DATE = "2023-01-01"
END_DATE = "2025-12-31"
RANDOM_SEED = 4242
