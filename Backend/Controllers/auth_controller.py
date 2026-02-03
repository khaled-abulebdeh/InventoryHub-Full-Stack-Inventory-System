from flask import Blueprint, request, jsonify
from Services.auth_service import authenticate, create_user
from Utils.validation import validate_email, validate_password, validate_phone, clean_string

auth_bp = Blueprint(
    "auth",
    __name__,
    url_prefix="/api/auth"
)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get('email')
    password = data.get('password')

    email, err = validate_email(email)
    if err:
        return jsonify({'error': err}), 400

    # Relaxed validation for login
    if not password:
        return jsonify({'error': 'Password is required'}), 400

    user = authenticate(email, password)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    return jsonify(user), 200

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json(silent=True) or {}
    full_name = data.get('full_name')
    email = data.get('email')
    phone = data.get('phone')
    password = data.get('password')

    role = 'USER'

    full_name = clean_string(full_name)
    if not full_name:
        return jsonify({'error': 'full_name is required'}), 400

    email, err = validate_email(email)
    if err:
        return jsonify({'error': err}), 400

    password, err = validate_password(password, min_length=8)
    if err:
        return jsonify({'error': err}), 400

    if phone:
        phone, err = validate_phone(phone)
        if err:
            return jsonify({'error': err}), 400

    user, err = create_user(full_name, email, phone, password, role)
    if err:
        return jsonify({'error': err}), 400

    return jsonify(user), 201
