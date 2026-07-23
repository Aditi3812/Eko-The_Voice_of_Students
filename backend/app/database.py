import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

#bckend-db the connection initialization code
#searches your eko/backend/ directory for the .env file you just set up and loads its key-value pairs into the system
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# The engine handles the active socket pipeline to Neon
#engine: The actual pipeline/connection manager to Neon. It handles the low-level TCP connections and SQL execution protocols between your Python app and the database.
engine = create_engine(DATABASE_URL)

#factory class. Every time a user triggers an action (like saving collaborative text or logging an agent handoff state), a unique instance of this session will be generated
#autocommit=False ensures transactions don't save prematurely before your agents finish their logical steps.
#autoflush=False prevents SQLAlchemy from automatically pushing changes to the database before you explicitly commit them.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
#future ORM data models (like Telemetry or Notes) will inherit from so SQLAlchemy knows how to map Python classes directly into SQL tables.

# Context manager ensures connections close gracefully after use
# whenever request comes in like students sending telemetry log, FastAPI provides an active database transaction window.

def get_db():
    db = SessionLocal()
    try:
        #yield db: When a request comes in (e.g., a student sending telemetry logs or saving data), FastAPI provides an active database transaction window (db).
        yield db
    finally:
        db.close()