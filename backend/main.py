from datetime import datetime
from typing import Generator

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine
from models import ActionLog, PlaySession, User


app = FastAPI(
    title="となりのデジジ API",
    description="高齢者向けスマートフォン練習アプリのバックエンドAPI",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


class UserUpdate(BaseModel):
    display_name: str | None = None
    birth_date: str | None = None
    login_id: str | None = None


class PlaySessionStart(BaseModel):
    user_id: int
    scenario_id: int


class LogCreate(BaseModel):
    play_session_id: int
    user_id: int
    scenario_id: int
    section_id: int
    action: str
    is_correct: bool


def calculate_score(correct_count: int, incorrect_count: int) -> int:
    return max(0, correct_count * 100 - incorrect_count * 50)


def session_to_dict(session: PlaySession) -> dict:
    accuracy = (
        round(session.correct_count / session.total_count * 100, 1)
        if session.total_count > 0
        else 0.0
    )

    return {
        "id": session.id,
        "user_id": session.user_id,
        "scenario_id": session.scenario_id,
        "started_at": session.started_at,
        "finished_at": session.finished_at,
        "total_count": session.total_count,
        "correct_count": session.correct_count,
        "incorrect_count": session.incorrect_count,
        "accuracy": accuracy,
        "score": session.score,
        "is_completed": session.is_completed,
    }


@app.get("/")
def root():
    return {
        "message": "Hello Tonari-no-Deziji",
        "status": "running",
    }


@app.post("/users/guest")
def create_guest_user(db: Session = Depends(get_db)):
    new_user = User(
        display_name="ゲスト",
        is_guest=True,
        last_login_at=datetime.now(),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "ゲストユーザーを作成しました",
        "user_id": new_user.id,
    }


@app.get("/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="ユーザーが見つかりません",
        )

    return {
        "id": user.id,
        "display_name": user.display_name,
        "birth_date": user.birth_date,
        "login_id": user.login_id,
        "is_guest": user.is_guest,
        "last_login_at": user.last_login_at,
        "created_at": user.created_at,
    }


@app.patch("/users/{user_id}")
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="ユーザーが見つかりません",
        )

    if user_data.display_name is not None:
        user.display_name = user_data.display_name

    if user_data.birth_date is not None:
        user.birth_date = user_data.birth_date

    if user_data.login_id is not None:
        duplicate = (
            db.query(User)
            .filter(
                User.login_id == user_data.login_id,
                User.id != user_id,
            )
            .first()
        )

        if duplicate is not None:
            raise HTTPException(
                status_code=409,
                detail="このログインIDはすでに使用されています",
            )

        user.login_id = user_data.login_id

    if user.display_name and user.display_name != "ゲスト":
        user.is_guest = False

    user.last_login_at = datetime.now()

    db.commit()
    db.refresh(user)

    return {
        "message": "ユーザー情報を更新しました",
        "user": {
            "id": user.id,
            "display_name": user.display_name,
            "birth_date": user.birth_date,
            "login_id": user.login_id,
            "is_guest": user.is_guest,
        },
    }


@app.post("/play-sessions/start")
def start_play_session(
    data: PlaySessionStart,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == data.user_id).first()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="ユーザーが見つかりません",
        )

    session = PlaySession(
        user_id=data.user_id,
        scenario_id=data.scenario_id,
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "message": "プレイを開始しました",
        "play_session_id": session.id,
    }


@app.post("/logs")
def create_log(
    log: LogCreate,
    db: Session = Depends(get_db),
):
    session = (
        db.query(PlaySession)
        .filter(PlaySession.id == log.play_session_id)
        .first()
    )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="プレイセッションが見つかりません",
        )

    if session.is_completed:
        raise HTTPException(
            status_code=409,
            detail="完了済みのプレイにはログを追加できません",
        )

    if (
        session.user_id != log.user_id
        or session.scenario_id != log.scenario_id
    ):
        raise HTTPException(
            status_code=400,
            detail="プレイ情報とログ情報が一致しません",
        )

    new_log = ActionLog(
        play_session_id=log.play_session_id,
        user_id=log.user_id,
        scenario_id=log.scenario_id,
        section_id=log.section_id,
        action=log.action,
        is_correct=log.is_correct,
    )

    session.total_count += 1

    if log.is_correct:
        session.correct_count += 1
    else:
        session.incorrect_count += 1

    session.score = calculate_score(
        session.correct_count,
        session.incorrect_count,
    )

    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    return {
        "message": "操作ログを保存しました",
        "log_id": new_log.id,
    }


@app.post("/play-sessions/{play_session_id}/finish")
def finish_play_session(
    play_session_id: int,
    db: Session = Depends(get_db),
):
    session = (
        db.query(PlaySession)
        .filter(PlaySession.id == play_session_id)
        .first()
    )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="プレイセッションが見つかりません",
        )

    session.finished_at = datetime.now()
    session.is_completed = True
    session.score = calculate_score(
        session.correct_count,
        session.incorrect_count,
    )

    db.commit()
    db.refresh(session)

    completed_sessions = (
        db.query(PlaySession)
        .filter(
            PlaySession.user_id == session.user_id,
            PlaySession.scenario_id == session.scenario_id,
            PlaySession.is_completed.is_(True),
        )
        .order_by(PlaySession.finished_at.asc())
        .all()
    )

    current_index = next(
        (
            index
            for index, item in enumerate(completed_sessions)
            if item.id == session.id
        ),
        None,
    )

    previous_session = (
        completed_sessions[current_index - 1]
        if current_index is not None and current_index > 0
        else None
    )

    best_session = max(
        completed_sessions,
        key=lambda item: (
            item.score,
            -item.incorrect_count,
            item.correct_count,
        ),
    )

    comparison = None

    if previous_session is not None:
        comparison = {
            "score_difference": (
                session.score - previous_session.score
            ),
            "correct_difference": (
                session.correct_count
                - previous_session.correct_count
            ),
            "incorrect_difference": (
                session.incorrect_count
                - previous_session.incorrect_count
            ),
        }

    return {
        "message": "プレイを完了しました",
        "current": session_to_dict(session),
        "previous": (
            session_to_dict(previous_session)
            if previous_session is not None
            else None
        ),
        "best": session_to_dict(best_session),
        "comparison": comparison,
        "is_new_best": session.id == best_session.id,
    }


@app.get("/users/{user_id}/play-sessions")
def get_play_sessions(
    user_id: int,
    scenario_id: int | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(PlaySession).filter(
        PlaySession.user_id == user_id
    )

    if scenario_id is not None:
        query = query.filter(
            PlaySession.scenario_id == scenario_id
        )

    sessions = query.order_by(
        PlaySession.started_at.desc()
    ).all()

    return {
        "user_id": user_id,
        "sessions": [
            session_to_dict(session)
            for session in sessions
        ],
    }
