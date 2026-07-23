from app.vector_store import get_collection

# Fetch the collection created during ingestion
collection = get_collection("CSE-301")

# Print total number of chunks stored
print(f"📊 Total Chunks Stored: {collection.count()}")

# Peek at the first chunk and its metadata
results = collection.peek(limit=1)
print("\n📝 Sample Document Chunk:")
print(results["documents"][0] if results["documents"] else "No documents found.")

print("\n🏷️ Sample Metadata:")
print(results["metadatas"][0] if results["metadatas"] else "No metadata found.")