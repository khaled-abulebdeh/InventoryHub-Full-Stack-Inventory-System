from flask import Blueprint, jsonify
from Services.warehouse_service import get_all_warehouses, get_warehouse

warehouse_bp = Blueprint("warehouse_bp", __name__, url_prefix="/api")


@warehouse_bp.route("/warehouses", methods=["GET"])
def list_warehouses():
    result, status = get_all_warehouses()
    return jsonify(result), status


@warehouse_bp.route("/warehouses/<int:warehouse_id>", methods=["GET"])
def get_warehouse_by_id(warehouse_id):
    result, status = get_warehouse(warehouse_id)
    return jsonify(result), status
