"""Verify Clerk sessions and enforce local account / pod permissions."""

import os
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app import models
from app.db import get_db

DB = Annotated[Session, Depends(get_db, scope="function")]
bearer = HTTPBearer(auto_error=False, scheme_name="ClerkSession", description="Clerk session JWT")
Credentials = Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]


def optional_subject(credentials: Credentials) -> str | None:
    if credentials is None:
        return None
    key = os.getenv("CLERK_JWT_KEY")
    issuer = os.getenv("CLERK_ISSUER")
    parties = [value.strip() for value in os.getenv("CLERK_AUTHORIZED_PARTIES", "").split(",") if value.strip()]
    if not key or not issuer or not parties:
        raise HTTPException(503, "Clerk authentication is not configured")
    try:
        claims = jwt.decode(
            credentials.credentials, key, algorithms=["RS256"], issuer=issuer,
            audience=os.getenv("CLERK_AUDIENCE") or None,
            options={"require": ["sub", "sid", "exp", "iat", "nbf", "iss", "azp"],
                     "verify_aud": bool(os.getenv("CLERK_AUDIENCE"))},
        )
        if (claims["azp"] not in parties or not isinstance(claims["sub"], str)
                or not claims["sub"] or not isinstance(claims["sid"], str)
                or not claims["sid"] or claims.get("sts") == "pending"):
            raise jwt.InvalidTokenError()
    except jwt.exceptions.InvalidKeyError:
        raise HTTPException(503, "Clerk verification key is invalid") from None
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid session", headers={"WWW-Authenticate": "Bearer"}) from None
    except (ValueError, TypeError):
        raise HTTPException(503, "Clerk verification key is invalid") from None
    return claims["sub"]


Subject = Annotated[str | None, Depends(optional_subject)]


def required_subject(subject: Subject) -> str:
    if subject is None:
        raise HTTPException(401, "Sign in required", headers={"WWW-Authenticate": "Bearer"})
    return subject


VerifiedSubject = Annotated[str, Depends(required_subject)]


def optional_actor(subject: Subject, db: DB) -> models.User | None:
    if subject is None:
        return None
    return db.scalar(select(models.User).where(models.User.clerk_user_id == subject))


OptionalActor = Annotated[models.User | None, Depends(optional_actor)]


def current_actor(subject: VerifiedSubject, db: DB) -> models.User:
    row = db.scalar(select(models.User).where(models.User.clerk_user_id == subject))
    if row is None:
        raise HTTPException(403, "Create your local profile first")
    return row


Actor = Annotated[models.User, Depends(current_actor)]


def pod_membership(user_id: int):
    return select(models.PodMember.pod_member_id).where(
        models.PodMember.pod_id == models.Pod.pod_id,
        models.PodMember.user_id == user_id,
    ).exists()


def private_pod_filter(actor: models.User):
    return or_(models.Pod.owner_user_id == actor.user_id, pod_membership(actor.user_id))


def access_pod(db: Session, pod_id: int, actor: models.User | None,
               *, public: bool = False, write: bool = False, owner_only: bool = False) -> models.Pod:
    pod = db.scalar(select(models.Pod).where(models.Pod.pod_id == pod_id).with_for_update(read=not write))
    if pod is None:
        raise HTTPException(404, "Record not found")
    owner = actor is not None and pod.owner_user_id == actor.user_id
    member = actor is not None and db.scalar(select(models.PodMember.pod_member_id).where(
        models.PodMember.pod_id == pod_id, models.PodMember.user_id == actor.user_id,
    )) is not None
    if not owner and not member:
        if public and pod.is_public and not write and not owner_only:
            return pod
        raise HTTPException(404, "Record not found")
    if owner_only and not owner:
        raise HTTPException(403, "Pod owner required")
    if write and not owner:
        admin = db.get(models.PodAdmin, (pod_id, actor.user_id))
        if admin is None or not admin.is_admin:
            raise HTTPException(403, "Pod admin required")
    return pod
