from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    display_name = Column(String, nullable=True)
    birth_date = Column(String, nullable=True)

    login_id = Column(String, nullable=True, unique=True)
    password_hash = Column(String, nullable=True)

    is_guest = Column(Boolean, default=True)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)



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


class ActionLog(Base):
    __tablename__ = "action_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    scenario_id = Column(Integer)
    section_id = Column(Integer)
    action = Column(String)
    is_correct = Column(Boolean)
    created_at = Column(DateTime, default=datetime.now)