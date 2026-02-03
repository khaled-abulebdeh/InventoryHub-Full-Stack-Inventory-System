from flask import Blueprint, request, jsonify
from Services.brand_service import *

brand_bp = Blueprint(
    "brands",
    __name__,
    url_prefix="/api/brands"
)

@brand_bp.route("", methods=["GET"])
def list_brands():
    brands = get_all_brands()
    return jsonify(brands), 200

@brand_bp.route("/<int:brand_id>", methods=["GET"])
def read_brand(brand_id):
    brand = get_brand(brand_id)
    if not brand:
        return jsonify({"error": "Brand not found"}), 404
    return jsonify(brand), 200

@brand_bp.route("", methods=["POST"])
def create():
    data = request.get_json(silent=True) or {}
    result = create_brand(data)
    status = 400 if "error" in result else 201
    return jsonify(result), status

@brand_bp.route("/<int:brand_id>", methods=["PUT"])
def update(brand_id):
    data = request.get_json(silent=True) or {}
    result = update_brand(brand_id, data)
    status = 400 if "error" in result else 200
    return jsonify(result), status

@brand_bp.route("/<int:brand_id>", methods=["DELETE"])
def delete(brand_id):
    result = delete_brand(brand_id)
    status = 400 if "error" in result else 200
    return jsonify(result), status
