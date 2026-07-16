from datetime import datetime
from hashlib import pbkdf2_hmac
from secrets import choice, token_hex
from typing import Generator

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine
from models import (
    ActionLog,
    PlaySession,
    ResultComment,
    User,
)


app = FastAPI(
    title="となりのデジジ API",
    description="高齢者向けスマートフォン練習アプリのバックエンドAPI",
    version="2.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


def ensure_family_code_column() -> None:
    inspector = inspect(engine)
    columns = {
        column["name"]
        for column in inspector.get_columns("users")
    }

    if "family_code" not in columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN family_code VARCHAR"
                )
            )

    with engine.begin() as connection:
        connection.execute(
            text(
                "CREATE UNIQUE INDEX IF NOT EXISTS "
                "ix_users_family_code "
                "ON users (family_code)"
            )
        )


ensure_family_code_column()


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


class UserRegister(BaseModel):
    display_name: str
    birth_date: str | None = None
    login_id: str
    password: str


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


class CommentCreate(BaseModel):
    author_type: str
    author_name: str | None = None
    content: str


class FamilyLogin(BaseModel):
    family_code: str


class FamilyCommentCreate(BaseModel):
    family_code: str
    author_name: str
    content: str




FAMILY_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def normalize_family_code(value: str) -> str:
    return (
        value.strip()
        .replace("-", "")
        .replace(" ", "")
        .upper()
    )


def generate_unique_family_code(
    db: Session,
    length: int = 6,
) -> str:
    for _ in range(100):
        code = "".join(
            choice(FAMILY_CODE_ALPHABET)
            for _ in range(length)
        )

        duplicate = (
            db.query(User)
            .filter(User.family_code == code)
            .first()
        )

        if duplicate is None:
            return code

    raise HTTPException(
        status_code=500,
        detail="家族コードを発行できませんでした",
    )


def get_user_by_family_code(
    family_code: str,
    db: Session,
) -> User:
    normalized_code = normalize_family_code(
        family_code
    )

    if len(normalized_code) != 6:
        raise HTTPException(
            status_code=400,
            detail="家族コードは6文字で入力してください",
        )

    user = (
        db.query(User)
        .filter(User.family_code == normalized_code)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="家族コードが見つかりません",
        )

    return user


def hash_password(password: str) -> str:
    salt = token_hex(16)

    password_hash = pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        120_000,
    ).hex()

    return f"{salt}${password_hash}"


def calculate_score(
    correct_count: int,
    incorrect_count: int,
) -> int:
    return max(
        0,
        correct_count * 100
        - incorrect_count * 50,
    )


def session_to_dict(session: PlaySession) -> dict:
    accuracy = (
        round(
            session.correct_count
            / session.total_count
            * 100,
            1,
        )
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


def comment_to_dict(comment: ResultComment) -> dict:
    return {
        "id": comment.id,
        "play_session_id": comment.play_session_id,
        "user_id": comment.user_id,
        "author_type": comment.author_type,
        "author_name": comment.author_name,
        "content": comment.content,
        "created_at": comment.created_at,
    }


def build_ai_comment(
    session: PlaySession,
    previous_session: PlaySession | None,
) -> str:
    if previous_session is None:
        if session.incorrect_count == 0:
            return (
                "初めての挑戦で、最後まで間違えずにできました！"
                "とてもすばらしいです。"
            )

        return (
            "初めて最後まで取り組むことができました！"
            "できた操作を大切にしながら、"
            "少しずつ慣れていきましょう。"
        )

    score_difference = (
        session.score - previous_session.score
    )

    if score_difference > 0:
        return (
            f"前回より{score_difference}点アップしました！"
            "練習の成果がしっかり表れています。"
        )

    if score_difference == 0:
        return (
            "前回と同じスコアを取ることができました！"
            "安定して操作できています。"
        )

    if session.incorrect_count == 0:
        return (
            "今回も間違えずに最後までできました！"
            "落ち着いて操作できています。"
        )

    return (
        "最後まで挑戦できたことが大切です。"
        "間違えたところをもう一度練習すると、"
        "さらに上達できます。"
    )


@app.get("/")
def root():
    return {
        "message": "Hello Tonari-no-Deziji",
        "status": "running",
    }


@app.post("/users/guest")
def create_guest_user(
    db: Session = Depends(get_db),
):
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
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

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
        "family_code": user.family_code,
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
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="ユーザーが見つかりません",
        )

    if user_data.display_name is not None:
        user.display_name = (
            user_data.display_name.strip()
        )

    if user_data.birth_date is not None:
        user.birth_date = user_data.birth_date

    if user_data.login_id is not None:
        login_id = user_data.login_id.strip()

        duplicate = (
            db.query(User)
            .filter(
                User.login_id == login_id,
                User.id != user_id,
            )
            .first()
        )

        if duplicate is not None:
            raise HTTPException(
                status_code=409,
                detail=(
                    "このログインIDは"
                    "すでに使用されています"
                ),
            )

        user.login_id = login_id

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


@app.put("/users/{user_id}/register")
def register_user(
    user_id: int,
    user_data: UserRegister,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="ユーザーが見つかりません",
        )

    display_name = user_data.display_name.strip()
    login_id = user_data.login_id.strip()

    if not display_name:
        raise HTTPException(
            status_code=400,
            detail="お名前を入力してください",
        )

    if len(login_id) < 4:
        raise HTTPException(
            status_code=400,
            detail=(
                "ログインIDは"
                "4文字以上で入力してください"
            ),
        )

    if len(user_data.password) < 8:
        raise HTTPException(
            status_code=400,
            detail=(
                "パスワードは"
                "8文字以上で入力してください"
            ),
        )

    duplicate = (
        db.query(User)
        .filter(
            User.login_id == login_id,
            User.id != user_id,
        )
        .first()
    )

    if duplicate is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "このログインIDは"
                "すでに使用されています"
            ),
        )

    user.display_name = display_name
    user.birth_date = user_data.birth_date or None
    user.login_id = login_id
    user.password_hash = hash_password(
        user_data.password
    )

    if not user.family_code:
        user.family_code = generate_unique_family_code(db)

    user.is_guest = False
    user.last_login_at = datetime.now()

    db.commit()
    db.refresh(user)

    return {
        "message": "ユーザー登録が完了しました",
        "user": {
            "id": user.id,
            "display_name": user.display_name,
            "birth_date": user.birth_date,
            "login_id": user.login_id,
            "family_code": user.family_code,
            "is_guest": user.is_guest,
        },
    }


@app.get("/users/{user_id}/family-code")
def get_family_code(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="ユーザーが見つかりません",
        )

    if user.is_guest:
        raise HTTPException(
            status_code=403,
            detail="ユーザー登録後に家族コードを利用できます",
        )

    if not user.family_code:
        user.family_code = generate_unique_family_code(db)
        db.commit()
        db.refresh(user)

    return {
        "user_id": user.id,
        "display_name": user.display_name,
        "family_code": user.family_code,
    }


@app.post("/users/{user_id}/family-code")
def issue_family_code(
    user_id: int,
    regenerate: bool = False,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="ユーザーが見つかりません",
        )

    if user.is_guest:
        raise HTTPException(
            status_code=403,
            detail="ユーザー登録後に家族コードを発行できます",
        )

    if user.family_code and not regenerate:
        return {
            "message": "発行済みの家族コードです",
            "user_id": user.id,
            "family_code": user.family_code,
        }

    user.family_code = generate_unique_family_code(db)
    db.commit()
    db.refresh(user)

    return {
        "message": (
            "家族コードを再発行しました"
            if regenerate
            else "家族コードを発行しました"
        ),
        "user_id": user.id,
        "family_code": user.family_code,
    }


@app.post("/family/login")
def family_login(
    data: FamilyLogin,
    db: Session = Depends(get_db),
):
    user = get_user_by_family_code(
        data.family_code,
        db,
    )

    return {
        "message": "家族コードを確認しました",
        "user": {
            "id": user.id,
            "display_name": (
                user.display_name or "利用者"
            ),
        },
        "family_code": user.family_code,
    }


@app.post("/play-sessions/start")
def start_play_session(
    data: PlaySessionStart,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.id == data.user_id)
        .first()
    )

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
        .filter(
            PlaySession.id == log.play_session_id
        )
        .first()
    )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "プレイセッションが"
                "見つかりません"
            ),
        )

    if session.is_completed:
        raise HTTPException(
            status_code=409,
            detail=(
                "完了済みのプレイには"
                "ログを追加できません"
            ),
        )

    if (
        session.user_id != log.user_id
        or session.scenario_id
        != log.scenario_id
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "プレイ情報とログ情報が"
                "一致しません"
            ),
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


@app.post(
    "/play-sessions/{play_session_id}/finish"
)
def finish_play_session(
    play_session_id: int,
    db: Session = Depends(get_db),
):
    session = (
        db.query(PlaySession)
        .filter(
            PlaySession.id == play_session_id
        )
        .first()
    )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "プレイセッションが"
                "見つかりません"
            ),
        )

    if session.is_completed:
        completed_sessions = (
            db.query(PlaySession)
            .filter(
                PlaySession.user_id
                == session.user_id,
                PlaySession.scenario_id
                == session.scenario_id,
                PlaySession.is_completed.is_(True),
            )
            .order_by(
                PlaySession.finished_at.asc()
            )
            .all()
        )
    else:
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
                PlaySession.user_id
                == session.user_id,
                PlaySession.scenario_id
                == session.scenario_id,
                PlaySession.is_completed.is_(True),
            )
            .order_by(
                PlaySession.finished_at.asc()
            )
            .all()
        )

    current_index = next(
        (
            index
            for index, item
            in enumerate(completed_sessions)
            if item.id == session.id
        ),
        None,
    )

    previous_session = (
        completed_sessions[current_index - 1]
        if (
            current_index is not None
            and current_index > 0
        )
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
                session.score
                - previous_session.score
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

    existing_ai_comment = (
        db.query(ResultComment)
        .filter(
            ResultComment.play_session_id
            == session.id,
            ResultComment.author_type == "ai",
        )
        .first()
    )

    if existing_ai_comment is None:
        ai_comment = ResultComment(
            play_session_id=session.id,
            user_id=session.user_id,
            author_type="ai",
            author_name="デジジ",
            content=build_ai_comment(
                session,
                previous_session,
            ),
        )

        db.add(ai_comment)
        db.commit()

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
        "is_new_best": (
            session.id == best_session.id
        ),
    }


@app.get(
    "/play-sessions/{play_session_id}/comments"
)
def get_result_comments(
    play_session_id: int,
    db: Session = Depends(get_db),
):
    session = (
        db.query(PlaySession)
        .filter(
            PlaySession.id == play_session_id
        )
        .first()
    )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "プレイセッションが"
                "見つかりません"
            ),
        )

    comments = (
        db.query(ResultComment)
        .filter(
            ResultComment.play_session_id
            == play_session_id
        )
        .order_by(
            ResultComment.created_at.asc(),
            ResultComment.id.asc(),
        )
        .all()
    )

    return {
        "play_session_id": play_session_id,
        "comments": [
            comment_to_dict(comment)
            for comment in comments
        ],
    }


@app.post(
    "/play-sessions/{play_session_id}/comments"
)
def create_result_comment(
    play_session_id: int,
    data: CommentCreate,
    db: Session = Depends(get_db),
):
    session = (
        db.query(PlaySession)
        .filter(
            PlaySession.id == play_session_id
        )
        .first()
    )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "プレイセッションが"
                "見つかりません"
            ),
        )

    if not session.is_completed:
        raise HTTPException(
            status_code=409,
            detail=(
                "プレイ完了後に"
                "コメントできます"
            ),
        )

    author_type = data.author_type.strip().lower()
    content = data.content.strip()

    if author_type not in {
        "user",
        "family",
    }:
        raise HTTPException(
            status_code=400,
            detail=(
                "投稿者は本人または"
                "家族を指定してください"
            ),
        )

    if not content:
        raise HTTPException(
            status_code=400,
            detail="コメントを入力してください",
        )

    if len(content) > 300:
        raise HTTPException(
            status_code=400,
            detail=(
                "コメントは"
                "300文字以内で入力してください"
            ),
        )

    user = (
        db.query(User)
        .filter(User.id == session.user_id)
        .first()
    )

    if author_type == "user":
        author_name = (
            user.display_name
            if (
                user is not None
                and user.display_name
                and user.display_name != "ゲスト"
            )
            else "本人"
        )
    else:
        author_name = (
            data.author_name or "家族"
        ).strip()

        if not author_name:
            author_name = "家族"

    comment = ResultComment(
        play_session_id=session.id,
        user_id=session.user_id,
        author_type=author_type,
        author_name=author_name,
        content=content,
    )

    db.add(comment)
    db.commit()
    db.refresh(comment)

    return {
        "message": "コメントを保存しました",
        "comment": comment_to_dict(comment),
    }


@app.get("/users/{user_id}/play-sessions")
def get_play_sessions(
    user_id: int,
    scenario_id: int | None = None,
    db: Session = Depends(get_db),
):
    query = (
        db.query(PlaySession)
        .filter(
            PlaySession.user_id == user_id
        )
    )

    if scenario_id is not None:
        query = query.filter(
            PlaySession.scenario_id
            == scenario_id
        )

    sessions = (
        query.order_by(
            PlaySession.started_at.desc()
        )
        .all()
    )

    return {
        "user_id": user_id,
        "sessions": [
            session_to_dict(session)
            for session in sessions
        ],
    }


@app.get(
    "/users/{user_id}/scenarios/"
    "{scenario_id}/reflection"
)
def get_scenario_reflection(
    user_id: int,
    scenario_id: int,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="ユーザーが見つかりません",
        )

    sessions = (
        db.query(PlaySession)
        .filter(
            PlaySession.user_id == user_id,
            PlaySession.scenario_id
            == scenario_id,
            PlaySession.is_completed.is_(True),
        )
        .order_by(
            PlaySession.finished_at.asc()
        )
        .all()
    )

    scenario_names = {
        1: "電話",
        2: "LINE",
        3: "写真",
    }

    section_names = {
        1: {
            0: "シナリオ選択",
            1: "電話アイコンを探す",
            2: "孫の連絡先を選ぶ",
            3: "連絡先の詳細を開く",
            4: "電話ボタンを押す",
        },
        2: {
            0: "シナリオ選択",
            99: "シナリオ完了",
        },
        3: {
            0: "シナリオ選択",
            99: "シナリオ完了",
        },
    }

    if not sessions:
        return {
            "user_id": user_id,
            "scenario_id": scenario_id,
            "scenario_name": (
                scenario_names.get(
                    scenario_id,
                    f"シナリオ{scenario_id}",
                )
            ),
            "summary": {
                "attempts": 0,
                "average_score": 0,
                "best_score": 0,
                "average_accuracy": 0.0,
                "latest_score": None,
                "latest_played_at": None,
            },
            "history": [],
            "sections": [],
        }

    total_score = sum(
        session.score
        for session in sessions
    )

    total_count = sum(
        session.total_count
        for session in sessions
    )

    total_correct = sum(
        session.correct_count
        for session in sessions
    )

    average_accuracy = (
        round(
            total_correct
            / total_count
            * 100,
            1,
        )
        if total_count > 0
        else 0.0
    )

    latest = sessions[-1]

    best = max(
        sessions,
        key=lambda item: (
            item.score,
            -item.incorrect_count,
            item.correct_count,
        ),
    )

    logs = (
        db.query(ActionLog)
        .filter(
            ActionLog.user_id == user_id,
            ActionLog.scenario_id
            == scenario_id,
        )
        .order_by(
            ActionLog.created_at.asc()
        )
        .all()
    )

    section_totals = {}

    for log in logs:
        if (
            log.section_id
            not in section_totals
        ):
            section_totals[log.section_id] = {
                "correct_count": 0,
                "incorrect_count": 0,
                "total_count": 0,
            }

        item = section_totals[
            log.section_id
        ]

        item["total_count"] += 1

        if log.is_correct:
            item["correct_count"] += 1
        else:
            item["incorrect_count"] += 1

    sections = []

    for (
        section_id,
        counts,
    ) in sorted(section_totals.items()):
        total = counts["total_count"]

        accuracy = (
            round(
                counts["correct_count"]
                / total
                * 100,
                1,
            )
            if total > 0
            else 0.0
        )

        sections.append({
            "section_id": section_id,
            "section_name": (
                section_names
                .get(scenario_id, {})
                .get(
                    section_id,
                    f"セクション{section_id}",
                )
            ),
            "correct_count": (
                counts["correct_count"]
            ),
            "incorrect_count": (
                counts["incorrect_count"]
            ),
            "total_count": total,
            "accuracy": accuracy,
        })

    history = []

    for session in sessions:
        comments = (
            db.query(ResultComment)
            .filter(
                ResultComment.play_session_id
                == session.id
            )
            .order_by(
                ResultComment.created_at.asc(),
                ResultComment.id.asc(),
            )
            .all()
        )

        history.append({
            "play_session_id": session.id,
            "played_at": session.finished_at,
            "score": session.score,
            "accuracy": (
                round(
                    session.correct_count
                    / session.total_count
                    * 100,
                    1,
                )
                if session.total_count > 0
                else 0.0
            ),
            "correct_count": (
                session.correct_count
            ),
            "incorrect_count": (
                session.incorrect_count
            ),
            "comments": [
                comment_to_dict(comment)
                for comment in comments
            ],
        })

    return {
        "user_id": user_id,
        "scenario_id": scenario_id,
        "scenario_name": (
            scenario_names.get(
                scenario_id,
                f"シナリオ{scenario_id}",
            )
        ),
        "summary": {
            "attempts": len(sessions),
            "average_score": round(
                total_score / len(sessions)
            ),
            "best_score": best.score,
            "average_accuracy": (
                average_accuracy
            ),
            "latest_score": latest.score,
            "latest_played_at": (
                latest.finished_at
            ),
        },
        "history": history,
        "sections": sections,
    }

@app.get("/users/{user_id}/family-report")
def get_family_report(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="ユーザーが見つかりません",
        )

    completed_sessions = (
        db.query(PlaySession)
        .filter(
            PlaySession.user_id == user_id,
            PlaySession.is_completed.is_(True),
        )
        .order_by(PlaySession.finished_at.asc())
        .all()
    )

    scenario_names = {
        1: "電話",
        2: "LINE",
        3: "写真",
    }

    now = datetime.now()
    week_start = now.replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    # 月曜日を週の開始日にする
    week_start = week_start.replace(
        day=week_start.day
    )
    week_start = (
        week_start
        - __import__("datetime").timedelta(
            days=week_start.weekday()
        )
    )

    this_week_sessions = [
        session
        for session in completed_sessions
        if (
            session.finished_at is not None
            and session.finished_at >= week_start
        )
    ]

    scenario_summaries = []

    for scenario_id in (1, 2, 3):
        sessions = [
            session
            for session in completed_sessions
            if session.scenario_id == scenario_id
        ]

        if sessions:
            total_score = sum(
                session.score
                for session in sessions
            )

            total_count = sum(
                session.total_count
                for session in sessions
            )

            total_correct = sum(
                session.correct_count
                for session in sessions
            )

            accuracy = (
                round(
                    total_correct
                    / total_count
                    * 100,
                    1,
                )
                if total_count > 0
                else 0.0
            )

            latest = sessions[-1]

            best = max(
                sessions,
                key=lambda item: (
                    item.score,
                    -item.incorrect_count,
                    item.correct_count,
                ),
            )

            average_score = round(
                total_score / len(sessions)
            )

            latest_score = latest.score
            best_score = best.score

        else:
            accuracy = 0.0
            average_score = 0
            latest_score = None
            best_score = 0

        scenario_summaries.append({
            "scenario_id": scenario_id,
            "scenario_name": (
                scenario_names[scenario_id]
            ),
            "attempts": len(sessions),
            "average_score": average_score,
            "latest_score": latest_score,
            "best_score": best_score,
            "accuracy": accuracy,
        })

    phone_sessions = [
        session
        for session in completed_sessions
        if session.scenario_id == 1
    ]

    latest_phone = (
        phone_sessions[-1]
        if phone_sessions
        else None
    )

    previous_phone = (
        phone_sessions[-2]
        if len(phone_sessions) >= 2
        else None
    )

    score_difference = None

    if (
        latest_phone is not None
        and previous_phone is not None
    ):
        score_difference = (
            latest_phone.score
            - previous_phone.score
        )

    all_logs = (
        db.query(ActionLog)
        .filter(ActionLog.user_id == user_id)
        .all()
    )

    section_names = {
        1: {
            1: "電話アイコンを探す",
            2: "孫の連絡先を選ぶ",
            3: "連絡先の詳細を開く",
            4: "電話ボタンを押す",
        },
    }

    section_totals = {}

    for log in all_logs:
        if log.section_id == 0:
            continue

        key = (
            log.scenario_id,
            log.section_id,
        )

        if key not in section_totals:
            section_totals[key] = {
                "correct": 0,
                "incorrect": 0,
                "total": 0,
            }

        item = section_totals[key]
        item["total"] += 1

        if log.is_correct:
            item["correct"] += 1
        else:
            item["incorrect"] += 1

    skill_items = []

    for (
        scenario_id,
        section_id,
    ), counts in section_totals.items():
        accuracy = (
            round(
                counts["correct"]
                / counts["total"]
                * 100,
                1,
            )
            if counts["total"] > 0
            else 0.0
        )

        skill_items.append({
            "scenario_id": scenario_id,
            "scenario_name": (
                scenario_names.get(
                    scenario_id,
                    f"シナリオ{scenario_id}",
                )
            ),
            "section_id": section_id,
            "section_name": (
                section_names
                .get(scenario_id, {})
                .get(
                    section_id,
                    f"セクション{section_id}",
                )
            ),
            "accuracy": accuracy,
            "correct_count": counts["correct"],
            "incorrect_count": counts["incorrect"],
        })

    skill_items.sort(
        key=lambda item: (
            item["accuracy"],
            -item["incorrect_count"],
        )
    )

    weakest_skill = (
        skill_items[0]
        if skill_items
        else None
    )

    strongest_skill = (
        max(
            skill_items,
            key=lambda item: (
                item["accuracy"],
                item["correct_count"],
            ),
        )
        if skill_items
        else None
    )

    comments = (
        db.query(ResultComment)
        .filter(ResultComment.user_id == user_id)
        .order_by(
            ResultComment.created_at.desc(),
            ResultComment.id.desc(),
        )
        .limit(12)
        .all()
    )

    recent_timeline = []

    for comment in comments:
        session = (
            db.query(PlaySession)
            .filter(
                PlaySession.id
                == comment.play_session_id
            )
            .first()
        )

        recent_timeline.append({
            "comment_id": comment.id,
            "play_session_id": (
                comment.play_session_id
            ),
            "scenario_id": (
                session.scenario_id
                if session is not None
                else None
            ),
            "scenario_name": (
                scenario_names.get(
                    session.scenario_id,
                    "シナリオ",
                )
                if session is not None
                else "シナリオ"
            ),
            "score": (
                session.score
                if session is not None
                else None
            ),
            "author_type": (
                comment.author_type
            ),
            "author_name": (
                comment.author_name
            ),
            "content": comment.content,
            "created_at": (
                comment.created_at
            ),
        })

    achievements = []

    if completed_sessions:
        achievements.append({
            "icon": "🎉",
            "title": "初めてのシナリオクリア",
            "description": (
                "最後まで練習を"
                "やり遂げました。"
            ),
        })

    if any(
        session.score >= 300
        for session in completed_sessions
    ):
        achievements.append({
            "icon": "🏅",
            "title": "高得点を達成",
            "description": (
                "300点以上の記録を"
                "残しました。"
            ),
        })

    if len(phone_sessions) >= 5:
        achievements.append({
            "icon": "☎️",
            "title": "電話を5回クリア",
            "description": (
                "電話の練習を"
                "5回完了しました。"
            ),
        })

    if (
        latest_phone is not None
        and latest_phone.incorrect_count == 0
    ):
        achievements.append({
            "icon": "✨",
            "title": "間違いなしでクリア",
            "description": (
                "最新の電話練習を"
                "間違えずに完了しました。"
            ),
        })

    if not completed_sessions:
        family_message = (
            "まだ完了した練習はありません。"
            "最初の挑戦を一緒に"
            "応援してみましょう。"
        )

    elif (
        score_difference is not None
        and score_difference > 0
    ):
        family_message = (
            f"最新の電話練習は"
            f"前回より{score_difference}点"
            "上がりました。"
            "「上手になったね」と"
            "声をかけてみましょう。"
        )

    elif weakest_skill is not None:
        family_message = (
            f"次は「{weakest_skill['section_name']}」を"
            "一緒に練習すると、"
            "さらに自信につながりそうです。"
        )

    else:
        family_message = (
            "練習を続けられています。"
            "今日できたことを"
            "一緒に喜んでみましょう。"
        )

    return {
        "user": {
            "id": user.id,
            "display_name": (
                user.display_name
                or "利用者"
            ),
            "is_guest": user.is_guest,
        },
        "week": {
            "completed_count": (
                len(this_week_sessions)
            ),
            "scenario_counts": {
                str(scenario_id): len([
                    session
                    for session in this_week_sessions
                    if (
                        session.scenario_id
                        == scenario_id
                    )
                ])
                for scenario_id in (1, 2, 3)
            },
        },
        "growth": {
            "latest_phone_score": (
                latest_phone.score
                if latest_phone is not None
                else None
            ),
            "previous_phone_score": (
                previous_phone.score
                if previous_phone is not None
                else None
            ),
            "score_difference": (
                score_difference
            ),
        },
        "scenarios": scenario_summaries,
        "strongest_skill": strongest_skill,
        "weakest_skill": weakest_skill,
        "achievements": achievements[:4],
        "recent_timeline": recent_timeline,
        "family_message": family_message,
    }

@app.get("/family/report")
def get_family_report_by_code(
    family_code: str,
    db: Session = Depends(get_db),
):
    user = get_user_by_family_code(
        family_code,
        db,
    )

    return get_family_report(
        user_id=user.id,
        db=db,
    )

@app.post(
    "/family/play-sessions/{play_session_id}/comments"
)
def create_family_result_comment(
    play_session_id: int,
    data: FamilyCommentCreate,
    db: Session = Depends(get_db),
):
    user = get_user_by_family_code(
        data.family_code,
        db,
    )

    session = (
        db.query(PlaySession)
        .filter(
            PlaySession.id == play_session_id
        )
        .first()
    )

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="プレイセッションが見つかりません",
        )

    if session.user_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="この結果にはコメントできません",
        )

    if not session.is_completed:
        raise HTTPException(
            status_code=409,
            detail="プレイ完了後にコメントできます",
        )

    author_name = data.author_name.strip()
    content = data.content.strip()

    if not author_name:
        raise HTTPException(
            status_code=400,
            detail="お名前・続柄を入力してください",
        )

    if not content:
        raise HTTPException(
            status_code=400,
            detail="コメントを入力してください",
        )

    if len(author_name) > 30:
        raise HTTPException(
            status_code=400,
            detail="お名前・続柄は30文字以内で入力してください",
        )

    if len(content) > 300:
        raise HTTPException(
            status_code=400,
            detail="コメントは300文字以内で入力してください",
        )

    comment = ResultComment(
        play_session_id=session.id,
        user_id=user.id,
        author_type="family",
        author_name=author_name,
        content=content,
    )

    db.add(comment)
    db.commit()
    db.refresh(comment)

    return {
        "message": "家族コメントを保存しました",
        "comment": comment_to_dict(comment),
    }

