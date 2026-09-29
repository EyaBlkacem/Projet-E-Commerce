from flask import Blueprint, jsonify
from models.recommender import recommender

recommandation_bp = Blueprint('recommandation', __name__)


# GET /api/ia/recommend/<user_id>
@recommandation_bp.route('/<int:user_id>', methods=['GET'])
def recommend_for_user(user_id):
    """Retourne les produits recommandes pour un utilisateur."""
    try:
        results = recommender.recommend_for_user(user_id, n=6)
        return jsonify({"user_id": user_id, "recommendations": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# GET /api/ia/recommend/similar/<product_id>
@recommandation_bp.route('/similar/<int:product_id>', methods=['GET'])
def recommend_similar(product_id):
    """Retourne les produits similaires a un produit."""
    try:
        results = recommender.recommend_similar(product_id, n=5)
        return jsonify({"product_id": product_id, "similar": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# POST /api/ia/recommend/retrain
@recommandation_bp.route('/retrain', methods=['POST'])
def retrain():
    """Reentrainer le modele de recommandation."""
    try:
        ok = recommender.train()
        return jsonify({"message": "Modele reentrainé." if ok else "Donnees insuffisantes."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
