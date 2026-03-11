"""
Pytest configuration for auction-timer tests.

Stubs out heavy native dependencies (confluent_kafka, pydantic_settings) that
are only available inside Docker so the pure-logic tests can run on the host.
"""
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import MagicMock

# ── sys.path ──────────────────────────────────────────────────
SERVICE_ROOT = Path(__file__).parent.parent
REPO_ROOT = SERVICE_ROOT.parent.parent

for p in (str(SERVICE_ROOT), str(REPO_ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

# ── Stub confluent_kafka (not installed on host) ──────────────
sys.modules.setdefault("confluent_kafka", MagicMock())
sys.modules.setdefault("confluent_kafka.admin", MagicMock())

# ── Stub pydantic_settings if not installed ───────────────────
try:
    import pydantic_settings  # noqa: F401
except ModuleNotFoundError:
    # Provide a minimal BaseSettings that returns hardcoded defaults so that
    # settings.py can be imported without pydantic_settings installed.
    _fake_ps = ModuleType("pydantic_settings")

    class _BaseSettings:
        def __init_subclass__(cls, **kwargs):
            super().__init_subclass__(**kwargs)

        def __init__(self, **kwargs):
            pass

    class _SettingsConfigDict(dict):
        pass

    _fake_ps.BaseSettings = _BaseSettings
    _fake_ps.SettingsConfigDict = _SettingsConfigDict
    sys.modules["pydantic_settings"] = _fake_ps

# ── Now import settings and guarantee field values ────────────
# settings.py relies on pydantic_settings to populate fields from env.
# Since we stubbed it above (or it wasn't installed), we patch the
# settings singleton with a plain namespace that has known defaults.
import settings as _settings_mod

_settings_mod.settings = SimpleNamespace(
    KAFKA_BOOTSTRAP_SERVERS="kafka:9092",
    REDIS_URL="redis://redis:6379",
    ENVIRONMENT="development",
    TICK_INTERVAL=1.0,
    SOFT_CLOSE_WINDOW=300,
    SOFT_CLOSE_EXTENSION=300,
    CLOSING_WARN_SECONDS=300,
)
