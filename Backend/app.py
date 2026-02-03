from flask import Flask, jsonify
from flask_cors import CORS
from Controllers.supplier_controller import supplier_bp
from Controllers.product_controller import product_bp
from Controllers.category_controller import category_bp
from Controllers.brand_controller import brand_bp
from Controllers.purchase_order_controller import purchase_bp
from Controllers.auth_controller import auth_bp
from Controllers.supplier_product_controller import supplier_product_bp
from Controllers.warehouse_controller import warehouse_bp
from Controllers.goods_receipt_controller import goods_receipt_bp
from Controllers.inventory_controller import inventory_bp
from Controllers.order_controller import order_bp
from Controllers.stock_movement_controller import stock_movement_bp

app = Flask(__name__)
app.url_map.strict_slashes = False

# Enhanced CORS configuration
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# Global error handler to ensure CORS headers on errors
@app.errorhandler(500)
def handle_500(e):
    from flask import jsonify
    response = jsonify({"error": "Internal server error", "details": str(e)})
    response.status_code = 500
    return response

# Register blueprints
app.register_blueprint(supplier_bp)
app.register_blueprint(product_bp)
app.register_blueprint(category_bp)
app.register_blueprint(brand_bp)
app.register_blueprint(purchase_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(supplier_product_bp)
app.register_blueprint(warehouse_bp)
app.register_blueprint(goods_receipt_bp)
app.register_blueprint(inventory_bp)
app.register_blueprint(order_bp)
app.register_blueprint(stock_movement_bp)


@app.route("/")
def home():
    return jsonify({"status": "Flask API running"})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
