from flask import Blueprint, jsonify
import pandas as pd
from config import get_connection

stats_bp = Blueprint('stats', __name__)

# ──────────────────────────────────────────────────────────────
# GET /api/ia/stats/overview
# ──────────────────────────────────────────────────────────────
@stats_bp.route('/overview', methods=['GET'])
def overview():
    try:
        conn = get_connection()

        total_products = pd.read_sql(
            "SELECT COUNT(*) AS total FROM Deals WHERE active=1", conn
        ).iloc[0]['total']

        sold_products = pd.read_sql(
            "SELECT COUNT(DISTINCT IdDeal) AS sold FROM Orders WHERE Active IN (2,3)", conn
        ).iloc[0]['sold']

        coverage_rate = round((sold_products / total_products * 100), 2) if total_products > 0 else 0

        total_orders = pd.read_sql(
            "SELECT COUNT(*) AS total FROM Orders WHERE Active != 0", conn
        ).iloc[0]['total']

        delivered_orders = pd.read_sql(
            "SELECT COUNT(*) AS total FROM Orders WHERE Active = 2", conn
        ).iloc[0]['total']

        conn.close()

        return jsonify({
            "total_products":   int(total_products),
            "sold_products":    int(sold_products),
            "coverage_rate":    float(coverage_rate),
            "total_orders":     int(total_orders),
            "delivered_orders": int(delivered_orders),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ──────────────────────────────────────────────────────────────
# GET /api/ia/stats/products/purchases
# ──────────────────────────────────────────────────────────────
@stats_bp.route('/products/purchases', methods=['GET'])
def products_purchases():
    try:
        conn = get_connection()

        df = pd.read_sql(
            """
            SELECT
                d.IdDeal       AS product_id,
                d.titleDeal    AS product_name,
                d.priceDeal    AS price,
                c.TitleFr      AS category,
                COUNT(o.IdOrder) AS purchase_count
            FROM Deals d
            LEFT JOIN Orders o ON d.IdDeal = o.IdDeal AND o.Active IN (1,2,3)
            LEFT JOIN Categories c ON d.idCateg = c.IdCateg
            WHERE d.active = 1
            GROUP BY d.IdDeal, d.titleDeal, d.priceDeal, c.TitleFr
            ORDER BY purchase_count DESC
            """, conn
        )
        conn.close()

        total_purchases = df['purchase_count'].sum()
        df['purchase_percentage'] = (
            (df['purchase_count'] / total_purchases * 100).round(2)
            if total_purchases > 0 else 0
        )

        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ──────────────────────────────────────────────────────────────
# GET /api/ia/stats/products/views
# ──────────────────────────────────────────────────────────────
@stats_bp.route('/products/views', methods=['GET'])
def products_views():
    try:
        conn = get_connection()

        df = pd.read_sql(
            """
            SELECT
                d.IdDeal    AS product_id,
                d.titleDeal AS product_name,
                d.priceDeal AS price,
                c.TitleFr   AS category,
                COUNT(pv.IdView) AS view_count
            FROM Deals d
            LEFT JOIN ProductViews pv ON d.IdDeal = pv.IdDeal
            LEFT JOIN Categories c ON d.idCateg = c.IdCateg
            WHERE d.active = 1
            GROUP BY d.IdDeal, d.titleDeal, d.priceDeal, c.TitleFr
            ORDER BY view_count DESC
            """, conn
        )
        conn.close()

        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ──────────────────────────────────────────────────────────────
# GET /api/ia/stats/categories
# ──────────────────────────────────────────────────────────────
@stats_bp.route('/categories', methods=['GET'])
def categories_stats():
    try:
        conn = get_connection()

        df = pd.read_sql(
            """
            SELECT
                c.TitleFr                AS category,
                COUNT(DISTINCT d.IdDeal) AS total_products,
                COUNT(o.IdOrder)         AS total_orders,
                COALESCE(AVG(CAST(d.Likes AS FLOAT)), 0) AS avg_likes
            FROM Categories c
            LEFT JOIN Deals d ON d.idCateg = c.IdCateg AND d.active = 1
            LEFT JOIN Orders o ON o.IdDeal = d.IdDeal AND o.Active IN (1,2,3)
            GROUP BY c.IdCateg, c.TitleFr
            ORDER BY total_orders DESC
            """, conn
        )
        conn.close()

        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        return jsonify({"error": str(e)}), 500
