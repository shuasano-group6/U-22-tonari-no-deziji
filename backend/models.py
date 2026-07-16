from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    display_name = Column(String, nullable=True)
    birth_date = Column(String, nullable=True)
    login_id = Column(String, nullable=True, unique=True)
    password_hash = Column(String, nullable=True)
    family_code = Column(String, nullable=True, unique=True, index=True)
    is_guest = Column(Boolean, default=True)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    play_sessions = relationship(
        "PlaySession",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    result_comments = relationship(
        "ResultComment",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String)


class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"))
    step = Column(Integer)
    title = Column(String)
    instruction = Column(String)
    hint = Column(String)


class PlaySession(Base):
    __tablename__ = "play_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    scenario_id = Column(Integer, nullable=False)

    started_at = Column(DateTime, default=datetime.now, nullable=False)
    finished_at = Column(DateTime, nullable=True)

    total_count = Column(Integer, default=0, nullable=False)
    correct_count = Column(Integer, default=0, nullable=False)
    incorrect_count = Column(Integer, default=0, nullable=False)
    score = Column(Integer, default=0, nullable=False)

    is_completed = Column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="play_sessions")

    action_logs = relationship(
        "ActionLog",
        back_populates="play_session",
        cascade="all, delete-orphan",
    )

    result_comments = relationship(
        "ResultComment",
        back_populates="play_session",
        cascade="all, delete-orphan",
    )


class ActionLog(Base):
    __tablename__ = "action_logs"

    id = Column(Integer, primary_key=True, index=True)

    play_session_id = Column(
        Integer,
        ForeignKey("play_sessions.id"),
        nullable=False,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    scenario_id = Column(Integer, nullable=False)
    section_id = Column(Integer, nullable=False)
    action = Column(String, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    created_at = Column(DateTime, default=datetime.now)

    play_session = relationship(
        "PlaySession",
        back_populates="action_logs",
    )


class ResultComment(Base):
    __tablename__ = "result_comments"

    id = Column(Integer, primary_key=True, index=True)

    play_session_id = Column(
        Integer,
        ForeignKey("play_sessions.id"),
        nullable=False,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    # ai / user / family
    author_type = Column(String, nullable=False)

    # AI、本人名、家族の呼び名など
    author_name = Column(String, nullable=False)

    content = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    play_session = relationship(
        "PlaySession",
        back_populates="result_comments",
    )

    user = relationship(
        "User",
        back_populates="result_comments",
    )
