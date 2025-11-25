from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base
from .security import EncryptedType

# Association table for member tags
member_tags = Table('member_tags', Base.metadata,
    Column('member_id', Integer, ForeignKey('members.id')),
    Column('tag_id', Integer, ForeignKey('tags.id'))
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    firebase_uid = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    role = Column(String, default="user") # admin, user
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Member(Base):
    __tablename__ = "members"

    id = Column(Integer, primary_key=True, index=True)
    
    # Encrypted PII
    first_name = Column(EncryptedType)
    middle_name = Column(EncryptedType, nullable=True)
    last_name = Column(EncryptedType)
    
    # Searchable blind index for exact matches
    email_hash = Column(String, index=True, nullable=True)
    
    nationbuilder_id = Column(Integer, unique=True, index=True)
    
    # Contact fields (Encrypted)
    email = Column(EncryptedType, nullable=True)
    phone = Column(EncryptedType, nullable=True)
    mobile = Column(EncryptedType, nullable=True)
    
    # Address fields (Encrypted)
    primary_address1 = Column(EncryptedType)
    primary_address2 = Column(EncryptedType, nullable=True)
    primary_address3 = Column(EncryptedType, nullable=True)
    primary_city = Column(EncryptedType)
    primary_state = Column(String) # State is not PII, keep unencrypted for filtering
    primary_zip = Column(String) # Postcode is low sensitivity, keep unencrypted for filtering
    primary_country_code = Column(String, default="AU")
    
    # Membership fields
    membership_status = Column(String, default="active")  # active, lapsed, suspended
    join_date = Column(DateTime, nullable=True)
    renewal_date = Column(DateTime, nullable=True)
    membership_type = Column(String, nullable=True)  # e.g., full, supporter, associate
    
    # System fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_duplicate = Column(Boolean, default=False)
    duplicate_of_id = Column(Integer, ForeignKey('members.id'), nullable=True)
    
    # Relationships
    check_results = relationship("CheckResult", back_populates="member", cascade="all, delete-orphan")
    notes = relationship("MemberNote", back_populates="member", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary=member_tags, back_populates="members")
    duplicate_of = relationship("Member", remote_side=[id], foreign_keys=[duplicate_of_id])

class CheckResult(Base):
    __tablename__ = "check_results"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("members.id"))
    
    result = Column(String)  # Pass, Fail, Partial, etc.
    federal_division = Column(String, nullable=True)
    state_division = Column(String, nullable=True)
    local_government = Column(String, nullable=True)
    local_ward = Column(String, nullable=True)
    
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    member = relationship("Member", back_populates="check_results")


class MemberNote(Base):
    __tablename__ = "member_notes"
    
    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("members.id"))
    
    note = Column(Text)
    created_by = Column(String)  # User who created the note
    created_at = Column(DateTime, default=datetime.utcnow)
    
    member = relationship("Member", back_populates="notes")


class Tag(Base):
    __tablename__ = "tags"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    color = Column(String, default="#3B82F6")  # Hex color for UI
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    members = relationship("Member", secondary=member_tags, back_populates="tags")
