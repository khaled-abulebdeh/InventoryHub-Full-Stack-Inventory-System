from flask import Blueprint, request, jsonify
from Services.order_service import list_orders, get_order_details, update_order_status

order_bp = Blueprint('order_bp', __name__)

@order_bp.route('/api/orders', methods=['GET'])
def get_orders():
    filters = {
        "status": request.args.get('status'),
        "search": request.args.get('search'),
        "product_search": request.args.get('product_search'),
        "start_date": request.args.get('start_date'),
        "end_date": request.args.get('end_date')
    }
    result, status = list_orders(filters)
    return jsonify(result), status

@order_bp.route('/api/orders/<int:order_id>', methods=['GET'])
def get_details(order_id):
    result, status = get_order_details(order_id)
    return jsonify(result), status

@order_bp.route('/api/orders/<int:order_id>/status', methods=['PUT'])
def update_status(order_id):
    data = request.get_json()
    new_status = data.get('status')
    if not new_status:
        return jsonify({"error": "Status is required"}), 400
        
    result, status = update_order_status(order_id, new_status)
    return jsonify(result), status
