from flask import Blueprint, request, jsonify
from Services.purchase_order_service import list_purchase_orders, get_purchase_order, create_purchase_order, cancel_purchase_order

purchase_bp = Blueprint(
    "purchase_orders",
    __name__,
    url_prefix="/api/purchase-orders"
)

@purchase_bp.route("", methods=["GET"])
def list_purchase_orders_route():
    filters = {
        "status": request.args.get("status"),
        "search": request.args.get("search"),
        "start_date": request.args.get("start_date"),
        "end_date": request.args.get("end_date"),
        "product_search": request.args.get("product_search")
    }
    items = list_purchase_orders(filters)
    return jsonify(items), 200

@purchase_bp.route("/<int:po_id>", methods=["GET"])
def read_purchase_order(po_id):
    po = get_purchase_order(po_id)
    if not po:
        return jsonify({"error": "Purchase order not found"}), 404
    return jsonify(po), 200

@purchase_bp.route("", methods=["POST"])
def create_po():
    data = request.get_json(silent=True) or {}
    po, err = create_purchase_order(data)
    if err:
        return jsonify({"error": err}), 400
    return jsonify(po), 201

@purchase_bp.route("/<int:po_id>/cancel", methods=["POST"])
def cancel_po(po_id):
    result, status = cancel_purchase_order(po_id)
    return jsonify(result), status
