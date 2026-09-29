from flask import Blueprint, jsonify
from models.predictor import predictor

prediction_bp = Blueprint('prediction', __name__)


# GET /api/ia/predict/<product_id>
@prediction_bp.route('/<int:product_id>', methods=['GET'])
def predict_product(product_id):
    """Score de reussite d'un produit."""
    try:
        result = predictor.predict_product(product_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# GET /api/ia/predict/all
@prediction_bp.route('/all', methods=['GET'])
def predict_all():
    """Score de reussite pour tous les produits."""
    try:
        results = predictor.predict_all_products()
        return jsonify({"products": results, "count": len(results)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# POST /api/ia/predict/train
@prediction_bp.route('/train', methods=['POST'])
def train_model():
    """Entrainer / reentrainer le modele de prediction."""
    try:
        ok = predictor.train()
        return jsonify({"message": "Modele entraine avec succes." if ok else "Donnees insuffisantes."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
