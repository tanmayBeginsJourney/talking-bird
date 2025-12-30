"""Create admin user script."""

import sys
sys.path.insert(0, "/app")

from sqlalchemy.orm import Session
from app.core.database import engine
from app.core.security import get_password_hash
from app.models.database import Base, User

Base.metadata.create_all(bind=engine)

with Session(engine) as db:
    existing = db.query(User).filter(User.email == "admin@talkingbird.com").first()
    if existing:
        print("Admin user already exists!")
    else:
        admin = User(
            email="admin@talkingbird.com",
            hashed_password=get_password_hash("admin123"),
            role="admin",
        )
        db.add(admin)
        db.commit()
        print("Admin user created successfully!")

