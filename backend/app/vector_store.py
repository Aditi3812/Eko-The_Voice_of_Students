import os
import chromadb
from chromadb.utils import embedding_functions
from dotenv import load_dotenv

load_dotenv()
"""Create a dedicated file inside your backend app directory eko/backend/app/vector_store.py to initialize ChromaDB persistently inside a local directory layer:"""
#  OLD BROKEN LINE:
# CHROMA_DATA_PATH = os.path.join(os.path.dirname(__dirname), "chroma_db")

# ✅ NEW FIXED LINE:
# os.path.abspath(__file__) gets the path of vector_store.py, and dirname gets its folder.
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
# We look one level up to place chroma_db in the backend root directory
CHROMA_DATA_PATH = os.path.join(os.path.dirname(CURRENT_DIR), "chroma_db")

# Initialize a Persistent Local Client
chroma_client = chromadb.PersistentClient(path=CHROMA_DATA_PATH)

# Configure the explicit Gemini Embedding Function
gemini_ef = embedding_functions.GoogleGeminiEmbeddingFunction(
    model_name="gemini-embedding-001"
)

def get_collection(course_id: str):
    """Fetches or creates a text collection matching the course string context."""
    return chroma_client.get_or_create_collection(
        name=f"course_{course_id.lower().replace('-', '_')}",
        embedding_function=gemini_ef
    )