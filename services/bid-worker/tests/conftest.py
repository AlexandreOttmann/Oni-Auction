"""
Pytest configuration for bid-worker tests.

Stubs out heavy native dependencies (psycopg2, confluent_kafka) that are only
available inside Docker so the pure-logic tests can run on the host.
"""
import sys
from pathlib import Path
from unittest.mock import MagicMock

# ── sys.path ──────────────────────────────────────────────────
SERVICE_ROOT = Path(__file__).parent.parent
REPO_ROOT = SERVICE_ROOT.parent.parent

for p in (str(SERVICE_ROOT), str(REPO_ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

# ── Stub native packages not installed on the host ───────────
sys.modules.setdefault("psycopg2", MagicMock())
sys.modules.setdefault("psycopg2.extras", MagicMock())
sys.modules.setdefault("confluent_kafka", MagicMock())
sys.modules.setdefault("confluent_kafka.admin", MagicMock())
