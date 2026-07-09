from fastapi import FastAPI
from pydantic import BaseModel
from database import engine, SessionLocal
from models import Base, ActionLog,User
from datetime import datetime


app = FastAPI()

Base.metadata.create_all(bind=engine)

class LogCreate(BaseModel):
    user_id: int
    scenario_id: int
    section_id: int
    action: str
    is_correct: bool

@app.get("/")
def root():
    return {"message": "Hello Tonari-no-Deziji"}

@app.post("/logs")
def create_log(log: LogCreate):
    db = SessionLocal()

    new_log = ActionLog(
        user_id=log.user_id,
        scenario_id=log.scenario_id,
        section_id=log.section_id,
        action=log.action,
        is_correct=log.is_correct
    )

    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    db.close()

    return {
        "message": "ログを保存しました",
        "log_id": new_log.id
    }

@app.post("/users/guest")
def create_guest_user():
    db = SessionLocal()

    new_user = User(
        display_name="ゲスト",
        is_guest=True,
        last_login_at=datetime.now()
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    db.close()

    return {
        "message": "ゲストユーザーを作成しました",
        "user_id": new_user.id
    }