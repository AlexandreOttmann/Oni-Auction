import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from dependencies import get_db
from settings import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
_ALGORITHM = "HS256"
_TOKEN_EXPIRE_HOURS = 24
_COOKIE_NAME = "oni_token"


# ── Schemas ───────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    user_id: str
    name: str
    email: str
    role: str


class MeResponse(BaseModel):
    user_id: str
    name: str
    email: str
    role: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def create_access_token(user_id: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=_TOKEN_EXPIRE_HOURS)
    return jwt.encode(
        {"sub": user_id, "role": role, "exp": expire},
        settings.SECRET_KEY,
        algorithm=_ALGORITHM,
    )


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=_COOKIE_NAME,
        value=token,
        httponly=True,                              # JS cannot read it — XSS-proof
        secure=settings.ENVIRONMENT != "development",  # HTTPS only in prod
        samesite="strict",                          # CSRF protection
        max_age=_TOKEN_EXPIRE_HOURS * 3600,
        path="/",
    )


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    oni_token: str | None = Cookie(default=None),
) -> dict:
    """
    Reusable dependency — validates the HttpOnly cookie JWT and returns the user row.
    Import and use in any route that requires authentication:

        from routers.auth import get_current_user
        current_user: dict = Depends(get_current_user)
    """
    if not oni_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "NOT_AUTHENTICATED"},
        )
    try:
        payload = jwt.decode(oni_token, settings.SECRET_KEY, algorithms=[_ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise ValueError("Missing sub")
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN"},
        )

    result = await db.execute(
        text("SELECT id, name, email, role FROM users WHERE id = :id"),
        {"id": user_id},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "USER_NOT_FOUND"},
        )

    return dict(row)


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT id, name, email, role, password_hash FROM users WHERE email = :email"),
        {"email": body.email.lower().strip()},
    )
    row = result.mappings().first()

    if not row or not _pwd_ctx.verify(body.password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS"},
        )

    token = create_access_token(str(row["id"]), row["role"])
    _set_auth_cookie(response, token)
    logger.info("Login: user=%s role=%s", row["id"], row["role"])

    # Return user info only — token is in the cookie, never in the body
    return LoginResponse(
        user_id=str(row["id"]),
        name=row["name"],
        email=row["email"],
        role=row["role"],
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response):
    response.delete_cookie(key=_COOKIE_NAME, path="/")


@router.get("/me", response_model=MeResponse)
async def me(current_user: dict = Depends(get_current_user)):
    return MeResponse(
        user_id=str(current_user["id"]),
        name=current_user["name"],
        email=current_user["email"],
        role=current_user["role"],
    )
