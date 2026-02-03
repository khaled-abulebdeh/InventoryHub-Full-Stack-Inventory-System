import re

PHONE_REGEX = re.compile(r'^\+?[0-9](?:[0-9\-\s]{6,}[0-9])$')

EMAIL_REGEX = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def clean_string(value):
    if value is None:
        return None
    value = str(value).strip()
    return value if value else None


def validate_phones(phones):
    """
    Returns: (cleaned_phones, error_message_or_None)
    """
    if phones is None:
        phones = []

    if not isinstance(phones, list):
        return None, "Phones must be an array"

    cleaned = []

    for phone in phones:
        phone = clean_string(phone)
        if phone:
            cleaned.append(phone)

    if len(cleaned) == 0:
        return None, "At least one phone number is required"

    for phone in cleaned:
        if not PHONE_REGEX.match(phone):
            return None, f"Invalid phone number: {phone}"

    return cleaned, None


def validate_email(value):
    v = clean_string(value)
    if not v:
        return None, "Email is required"
    if not EMAIL_REGEX.match(v):
        return None, "Invalid email format"
    return v, None


def validate_password(value, min_length=8):
    v = clean_string(value)
    if not v:
        return None, "Password is required"
    if len(v) < min_length:
        return None, f"Password must be at least {min_length} characters"
    return v, None


def validate_phone(value):
    v = clean_string(value)
    if not v:
        return None, "Phone is required"
    if not PHONE_REGEX.match(v):
        return None, "Invalid phone number"
    return v, None
