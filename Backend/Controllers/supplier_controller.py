from flask import Blueprint, request, jsonify
from Services.supplier_service import *

supplier_bp = Blueprint(
    "suppliers",
    __name__,
    url_prefix="/api/suppliers"
)

@supplier_bp.route("", methods=["GET"])
def list_suppliers():
    filters = {
        "search": request.args.get("search"),
        "email": request.args.get("email"),
        "sort_by": request.args.get("sort_by"),
        "sort_order": request.args.get("order")
    }
    suppliers = get_filtered_suppliers(filters)
    return jsonify(suppliers), 200


@supplier_bp.route("/<int:supplier_id>", methods=["GET"])
def read_supplier(supplier_id):
    supplier = get_supplier(supplier_id)
    if not supplier:
        return jsonify({"error": "Supplier not found"}), 404
    return jsonify(supplier), 200

@supplier_bp.route("", methods=["POST"])
def create():
    data = request.get_json(silent=True) or {}
    response, status = create_supplier(data)
    return jsonify(response), status

@supplier_bp.route("/<int:supplier_id>", methods=["PUT"])
def update(supplier_id):
    data = request.get_json(silent=True) or {}
    response, status = update_supplier(supplier_id, data)
    return jsonify(response), status

@supplier_bp.route("/<int:supplier_id>", methods=["DELETE"])
def delete(supplier_id):
    result = delete_supplier(supplier_id)
    status = 400 if "error" in result else 200
    return jsonify(result), status
