from flask import Blueprint, jsonify, request
from Services.stock_movement_service import (
    list_stock_movements,
    get_movement_by_id,
    get_movements_by_variant,
    get_movement_summary
)

stock_movement_bp = Blueprint("stock_movement_bp", __name__, url_prefix="/api")


@stock_movement_bp.route("/stock-movements", methods=["GET"])
def get_stock_movements():
    """
    List stock movements with SQL-based filtering.
    
    Query Parameters:
        - warehouse_id: Filter by warehouse ID
        - movement_type: Filter by type (GOODS_RECEIPT, ADJUSTMENT, TRANSFER_IN, TRANSFER_OUT, RETURN, SALE)
        - date_from: Start date (ISO format)
        - date_to: End date (ISO format)
        - search: Search product name, SKU, or movement ID
        - sort_by: Sort column (date, product, quantity)
        - sort_order: Sort direction (asc, desc)
    """
    filters = {
        "warehouse_id": request.args.get('warehouse_id'),
        "movement_type": request.args.get('movement_type'),
        "date_from": request.args.get('date_from'),
        "date_to": request.args.get('date_to'),
        "search": request.args.get('search'),
        "sort_by": request.args.get('sort_by'),
        "sort_order": request.args.get('sort_order')
    }
    result, status = list_stock_movements(filters)
    return jsonify(result), status


@stock_movement_bp.route("/stock-movements/<int:movement_id>", methods=["GET"])
def get_movement(movement_id):
    """Get a single stock movement by ID."""
    result, status = get_movement_by_id(movement_id)
    return jsonify(result), status


@stock_movement_bp.route("/stock-movements/variant/<int:variant_id>", methods=["GET"])
def get_variant_movements(variant_id):
    """Get stock movement history for a specific product variant."""
    warehouse_id = request.args.get('warehouse_id')
    result, status = get_movements_by_variant(variant_id, warehouse_id)
    return jsonify(result), status


@stock_movement_bp.route("/stock-movements/summary", methods=["GET"])
def get_movements_summary():
    """
    Get summary statistics (inbound/outbound totals) with SQL-based filtering.
    
    Query Parameters:
        - warehouse_id: Filter by warehouse ID
        - movement_type: Filter by type
        - date_from: Start date (ISO format)
        - date_to: End date (ISO format)
    """
    filters = {
        "warehouse_id": request.args.get('warehouse_id'),
        "movement_type": request.args.get('movement_type'),
        "date_from": request.args.get('date_from'),
        "date_to": request.args.get('date_to')
    }
    result, status = get_movement_summary(filters)
    return jsonify(result), status
