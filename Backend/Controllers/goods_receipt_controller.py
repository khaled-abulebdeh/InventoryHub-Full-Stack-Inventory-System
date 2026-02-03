from flask import Blueprint, jsonify, request
from Services.goods_receipt_service import (
    list_goods_receipts,
    get_goods_receipt,
    create_goods_receipt,
    get_receivable_po_items
)

goods_receipt_bp = Blueprint("goods_receipt_bp", __name__, url_prefix="/api")


@goods_receipt_bp.route("/goods-receipts", methods=["GET"])
def get_all_receipts():
    filters = {
        "search": request.args.get('search'),
        "product_search": request.args.get('product_search'),
        "start_date": request.args.get('start_date'),
        "end_date": request.args.get('end_date')
    }
    result, status = list_goods_receipts(filters)
    return jsonify(result), status


@goods_receipt_bp.route("/goods-receipts/<int:receipt_id>", methods=["GET"])
def get_receipt_by_id(receipt_id):
    result, status = get_goods_receipt(receipt_id)
    return jsonify(result), status


@goods_receipt_bp.route("/goods-receipts", methods=["POST"])
def create_receipt():
    data = request.get_json()
    result, status = create_goods_receipt(data)
    return jsonify(result), status


@goods_receipt_bp.route("/purchase-orders/<int:po_id>/receivable-items", methods=["GET"])
def get_po_receivable_items(po_id):
    result, status = get_receivable_po_items(po_id)
    return jsonify(result), status
