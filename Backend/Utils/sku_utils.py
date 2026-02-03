import re

SKU_RE = re.compile(r"^[A-Z0-9_-]{5,40}$")

def normalize_sku(sku: str) -> str:
    return (sku or "").strip().upper()

def validate_sku(sku: str):
    sku = normalize_sku(sku)

    if not sku:
        return None, "SKU is required"

    if not SKU_RE.match(sku):
        return None, "SKU must be 5-40 chars and contain only A-Z, 0-9, _ or -"

    return sku, None