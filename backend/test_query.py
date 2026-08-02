import chromadb

client = chromadb.PersistentClient(path="./chroma_db")
# Query your unit collection
collection = client.get_collection("unit_<YOUR_UNIT_ID>")
results = collection.query(query_texts=["sample query"], n_results=3)
print(results)