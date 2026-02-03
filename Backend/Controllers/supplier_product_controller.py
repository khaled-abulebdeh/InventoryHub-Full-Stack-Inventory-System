from flask import Blueprint, request, jsonify
from Services.supplier_product_service import (
    get_suppliers_for_variant,
    add_supplier_to_variant,
    update_supplier_link,
    remove_supplier_from_variant,
    get_supplier_product_map,
    bulk_update_supplier_links
)

supplier_product_bp = Blueprint('supplier_product_bp', __name__)

@supplier_product_bp.route('/api/variants/<int:variant_id>/suppliers', methods=['GET'])
def get_variant_suppliers(variant_id):
    result, status = get_suppliers_for_variant(variant_id)
    return jsonify(result), status

@supplier_product_bp.route('/api/variants/<int:variant_id>/suppliers', methods=['POST'])
def link_supplier(variant_id):
    data = request.get_json()
    result, status = add_supplier_to_variant(variant_id, data)
    return jsonify(result), status

@supplier_product_bp.route('/api/variants/<int:variant_id>/suppliers/<int:supplier_id>', methods=['PUT'])
def update_link(variant_id, supplier_id):
    data = request.get_json()
    result, status = update_supplier_link(variant_id, supplier_id, data)
    return jsonify(result), status

@supplier_product_bp.route('/api/variants/<int:variant_id>/suppliers/<int:supplier_id>', methods=['DELETE'])
def delete_link(variant_id, supplier_id):
    result, status = remove_supplier_from_variant(variant_id, supplier_id)
    return jsonify(result), status

# =========================
# REVERSE LINKING ROUTES
# =========================

@supplier_product_bp.route('/api/suppliers/<int:supplier_id>/products', methods=['GET'])
def get_supplier_products_map(supplier_id):
    result, status = get_supplier_product_map(supplier_id)
    return jsonify(result), status

@supplier_product_bp.route('/api/suppliers/<int:supplier_id>/products/batch', methods=['POST'])
def batch_link_products(supplier_id):
    data = request.get_json()
    if not isinstance(data, list):
         return jsonify({"error": "Expected a list of changes"}), 400
    result, status = bulk_update_supplier_links(supplier_id, data)
    return jsonify(result), status
