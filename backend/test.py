import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

print("=== ALL AVAILABLE MODELS ===")
for model in client.models.list():
    # 'supported_actions' replaces 'supported_generation_methods' in the new SDK
    actions = getattr(model, 'supported_actions', None) or getattr(model, 'supported_generation_methods', [])
    print(f"Model ID: {model.name}")
    print(f"Display Name: {model.display_name}")
    print(f"Supported Actions: {actions}")
    print("-" * 50)