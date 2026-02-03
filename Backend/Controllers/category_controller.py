from flask import Blueprint, request, jsonify
from Services.category_service import *

category_bp = Blueprint(
    "categories",
    __name__,
    url_prefix="/api/categories"
)

@category_bp.route("", methods=["GET"])
def list_categories():
    categories = get_all_categories()
    return jsonify(categories), 200

@category_bp.route("/<int:category_id>", methods=["GET"])
def read_category(category_id):
    category = get_category(category_id)
    if not category:
        return jsonify({"error": "Category not found"}), 404
    return jsonify(category), 200

@category_bp.route("", methods=["POST"])
def create():
    data = request.get_json(silent=True) or {}
    result = create_category(data)
    status = 400 if "error" in result else 201
    return jsonify(result), status

@category_bp.route("/<int:category_id>", methods=["PUT"])
def update(category_id):
    data = request.get_json(silent=True) or {}
    result = update_category(category_id, data)
    status = 400 if "error" in result else 200
    return jsonify(result), status

@category_bp.route("/<int:category_id>", methods=["DELETE"])
def delete(category_id):
    result = delete_category(category_id)
    status = 400 if "error" in result else 200
    return jsonify(result), status
