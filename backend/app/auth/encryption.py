"""
Field-level encryption for sensitive data (clave_fiscal).
Uses AES-256-GCM — authenticated encryption, tamper-proof.

Key is loaded from FIELD_ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
Encrypted values are stored as "enc:<base64(nonce+ciphertext+tag)>".
Plain-text values (legacy/migration) are returned as-is.
"""
import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _get_key() -> bytes:
    from app.config import settings
    try:
        key = bytes.fromhex(settings.FIELD_ENCRYPTION_KEY)
    except ValueError:
        raise RuntimeError("FIELD_ENCRYPTION_KEY debe ser 64 caracteres hexadecimales válidos")
    if len(key) != 32:
        raise RuntimeError("FIELD_ENCRYPTION_KEY debe ser 64 caracteres hexadecimales (32 bytes)")
    return key


def encrypt_clave(plaintext: str) -> str:
    """Encrypt clave_fiscal. Returns 'enc:<base64>' string.
    If value is already encrypted, returns it unchanged.
    """
    if not plaintext:
        return plaintext
    if plaintext.startswith("enc:"):
        return plaintext  # Ya encriptado

    key = _get_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # 96-bit nonce for GCM
    ciphertext_with_tag = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    encoded = base64.b64encode(nonce + ciphertext_with_tag).decode("ascii")
    return f"enc:{encoded}"


def decrypt_clave(stored: str) -> str:
    """Decrypt clave_fiscal. Returns plaintext.
    If value is NOT encrypted (legacy plain text), returns it as-is.
    """
    if not stored:
        return stored
    if not stored.startswith("enc:"):
        return stored  # Valor legado en texto plano — compatibilidad hacia atrás

    key = _get_key()
    aesgcm = AESGCM(key)
    try:
        raw = base64.b64decode(stored[4:])  # Quitar prefijo "enc:"
        nonce = raw[:12]
        ciphertext_with_tag = raw[12:]
        return aesgcm.decrypt(nonce, ciphertext_with_tag, None).decode("utf-8")
    except Exception:
        # Si falla la desencriptación, devolver el valor tal cual
        # (no debería ocurrir con datos correctamente encriptados)
        return stored
