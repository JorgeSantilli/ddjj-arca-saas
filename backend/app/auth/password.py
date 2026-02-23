from pwdlib import PasswordHash

password_hash = PasswordHash.recommended()

# Dummy hash for timing attack prevention (OWASP best practice)
DUMMY_HASH = password_hash.hash("dummypassword-timing-attack-prevention")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hash.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    return password_hash.hash(password)
