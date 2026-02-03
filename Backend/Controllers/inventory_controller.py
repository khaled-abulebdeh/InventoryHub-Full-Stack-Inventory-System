from flask import Blueprint, jsonify, request
from Services.inventory_service import (
    list_inventory, get_dashboard_stats, get_recent_movements, 
    get_inventory_history, update_reorder_level, 
    adjust_inventory, transfer_inventory
)

inventory_bp = Blueprint("inventory_bp", __name__, url_prefix="/api")

@inventory_bp.route("/inventory", methods=["GET"])
def list_inventory_items():
    filters = {
        "warehouse_id": request.args.get('warehouse_id'),
        "search": request.args.get('search'),
        "stock_status": request.args.get('stock_status'),
        "brand_id": request.args.get('brand_id'),
        "category_id": request.args.get('category_id'),
        "sort_by": request.args.get('sort_by'),
        "sort_order": request.args.get('sort_order')
    }
    result, status = list_inventory(filters)
    return jsonify(result), status

@inventory_bp.route("/dashboard/stats", methods=["GET"])
def dashboard_stats():
    result, status = get_dashboard_stats()
    return jsonify(result), status

@inventory_bp.route("/stock-movements", methods=["GET"])
def list_stock_movements():
    filters = {
        "warehouse_id": request.args.get('warehouse_id'),
        "movement_type": request.args.get('movement_type'),
        "date_from": request.args.get('date_from'),
        "date_to": request.args.get('date_to'),
        "search": request.args.get('search'),
        "sort_by": request.args.get('sort_by'),
        "sort_order": request.args.get('sort_order')
    }
    result, status = get_recent_movements(filters)
    return jsonify(result), status

@inventory_bp.route("/inventory/history", methods=["GET"])
def inventory_history():
    pv_id = request.args.get("product_variant_id")
    wh_id = request.args.get("warehouse_id")
    if not pv_id:
        return jsonify({"error": "product_variant_id is required"}), 400
    
    result, status = get_inventory_history(pv_id, wh_id)
    return jsonify(result), status

@inventory_bp.route("/inventory/threshold", methods=["PUT"])
def update_threshold():
    data = request.get_json()
    wh_id = data.get("warehouse_id")
    pv_id = data.get("product_variant_id")
    new_level = data.get("reorder_level")
    
    if wh_id is None or pv_id is None or new_level is None:
        return jsonify({"error": "warehouse_id, product_variant_id, and reorder_level are required"}), 400
        
    result, status = update_reorder_level(wh_id, pv_id, new_level)
    return jsonify(result), status

@inventory_bp.route("/adjust", methods=["POST"])
def adjust_stock():
    data = request.get_json(silent=True) or {}
    result, status = adjust_inventory(data)
    return jsonify(result), status

@inventory_bp.route("/transfer", methods=["POST"])
def transfer_stock():
    data = request.get_json(silent=True) or {}
    result, status = transfer_inventory(data)
    return jsonify(result), status
