import os
import chromadb
from chromadb.utils import embedding_functions
from dotenv import load_dotenv

# Load .env variables (GEMINI_API_KEY or GOOGLE_API_KEY)
load_dotenv()

# 1. Resolve path relative to backend root: /backend/app -> /backend/chroma_db
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
CHROMA_DATA_PATH = os.path.join(os.path.dirname(CURRENT_DIR), "chroma_db")

# 2. Initialize persistent ChromaDB client
chroma_client = chromadb.PersistentClient(path=CHROMA_DATA_PATH)

# 3. Initialize Gemini Embedding Function (automatically uses GEMINI_API_KEY / GOOGLE_API_KEY from env)
gemini_ef = embedding_functions.GoogleGeminiEmbeddingFunction(
    model_name="models/gemini-embedding-001"
)

# 4. Helper function to fetch or create collections dynamically
def get_unit_collection(unit_id: str):
    """
    Fetches or creates a ChromaDB vector collection for a specific unit.
    Format: unit_<clean_uuid_or_id>
    """
    clean_unit_id = str(unit_id).lower().replace("-", "_")
    return chroma_client.get_or_create_collection(
        name=f"unit_{clean_unit_id}",
        embedding_function=gemini_ef
    )