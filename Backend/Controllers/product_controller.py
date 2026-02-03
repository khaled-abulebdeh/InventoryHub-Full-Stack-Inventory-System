from flask import Blueprint, request, jsonify
from Services.product_service import *

product_bp = Blueprint(
    "products",
    __name__,
    url_prefix="/api/products"
)

@product_bp.route("/", methods=["GET"], strict_slashes=False)
@product_bp.route("", methods=["GET"], strict_slashes=False)
def list_products():
    """
    List products with optional filtering.
    Query parameters:
    - brand_id: int
    - category_id: int
    - visibility: ACTIVE/INACTIVE
    - min_price: float
    - max_price: float
    - min_stock: int
    - max_stock: int
    - has_discount: true/false
    - search: text (searches in name and description)
    - sku_search: text (searches in SKU)
    - sort_by: name/price/stock/variant_count/brand/category
    - sort_order: ASC/DESC
    """
    filters = {}
    
    # Integer filters
    if request.args.get('brand_id'):
        try:
            filters['brand_id'] = int(request.args.get('brand_id'))
        except ValueError:
            return jsonify({"error": "Invalid brand_id"}), 400
    
    if request.args.get('category_id'):
        try:
            filters['category_id'] = int(request.args.get('category_id'))
        except ValueError:
            return jsonify({"error": "Invalid category_id"}), 400
    
    # String filters
    if request.args.get('visibility'):
        filters['visibility'] = request.args.get('visibility').upper()
    
    # Float filters
    if request.args.get('min_price'):
        try:
            filters['min_price'] = float(request.args.get('min_price'))
        except ValueError:
            return jsonify({"error": "Invalid min_price"}), 400
    
    if request.args.get('max_price'):
        try:
            filters['max_price'] = float(request.args.get('max_price'))
        except ValueError:
            return jsonify({"error": "Invalid max_price"}), 400
    
    # Integer stock filters
    if request.args.get('min_stock'):
        try:
            filters['min_stock'] = int(request.args.get('min_stock'))
        except ValueError:
            return jsonify({"error": "Invalid min_stock"}), 400
    
    if request.args.get('max_stock'):
        try:
            filters['max_stock'] = int(request.args.get('max_stock'))
        except ValueError:
            return jsonify({"error": "Invalid max_stock"}), 400
    
    # Boolean filters
    if request.args.get('has_discount'):
        filters['has_discount'] = request.args.get('has_discount').lower() in ['true', '1', 'yes']
    
    # Text search filters
    if request.args.get('search'):
        filters['search'] = request.args.get('search')
    
    if request.args.get('sku_search'):
        filters['sku_search'] = request.args.get('sku_search')
    
    # Sorting
    if request.args.get('sort_by'):
        filters['sort_by'] = request.args.get('sort_by')
    
    if request.args.get('sort_order'):
        filters['sort_order'] = request.args.get('sort_order')
    
    products = get_filtered_products(filters)
    return jsonify(products), 200


@product_bp.route("/<int:product_id>", methods=["GET"])
def read_product(product_id):
    product = get_product(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(product), 200


@product_bp.route("", methods=["POST"], strict_slashes=False)
def add_product():
    result = create_product(request.get_json(silent=True) or {})
    status = 400 if "error" in result else 201
    return jsonify(result), status


@product_bp.route("/<int:product_id>", methods=["PUT"])
def edit_product(product_id):
    result = update_product(product_id, request.get_json(silent=True) or {})
    status = 400 if "error" in result else 200
    return jsonify(result), status


@product_bp.route("/<int:product_id>", methods=["DELETE"])
def remove_product(product_id):
    result = delete_product(product_id)
    status = 400 if "error" in result else 200
    return jsonify(result), status

# Add Variant to Product
@product_bp.route("/<int:product_id>/variants", methods=["POST"])
def add_variant(product_id):
    result = add_product_variant(product_id, request.get_json(silent=True) or {})
    status = 400 if "error" in result else 201
    return jsonify(result), status


@product_bp.route("/<int:product_id>/variants/<int:variant_id>", methods=["PUT"])
def edit_variant(product_id, variant_id):
    result = update_product_variant(
        product_id,
        variant_id,
        request.get_json(silent=True) or {}
    )
    status = 400 if "error" in result else 200
    return jsonify(result), status


@product_bp.route("/<int:product_id>/variants/<int:variant_id>", methods=["DELETE"])
def delete_variant(product_id, variant_id):
    result = delete_product_variant(product_id, variant_id)
    status = 400 if "error" in result else 200
    return jsonify(result), status

# Not used yet
@product_bp.route("/variants", methods=["GET"])
def list_variants():
    from Services.product_service import get_all_product_variants
    rows = get_all_product_variants()
    # map to simpler structure
    out = [
        {
            "Product_Variant_ID": r["Product_Variant_ID"],
            "SKU": r["SKU"],
            "Unit_Price": r["Unit_Price"],
            "Product_ID": r["Product_ID"],
            "Product_Name": r["Product_Name"],
        }
        for r in rows
    ]
    return jsonify(out), 200




