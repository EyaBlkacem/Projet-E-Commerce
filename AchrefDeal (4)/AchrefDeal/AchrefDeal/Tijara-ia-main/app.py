from flask import Flask, jsonify
from flask_cors import CORS
from routes.stats import stats_bp
from routes.recommandation import recommandation_bp
from routes.prediction import prediction_bp
from models.recommender import recommender
from models.predictor import predictor

app = Flask(__name__)
CORS(app)   # Autorise Angular (port 4200) a appeler cette API

# ──────────────────────────────────────────────────────────────
# Enregistrement des routes
# ──────────────────────────────────────────────────────────────
app.register_blueprint(stats_bp,          url_prefix='/api/ia/stats')
app.register_blueprint(recommandation_bp, url_prefix='/api/ia/recommend')
app.register_blueprint(prediction_bp,     url_prefix='/api/ia/predict')


# ──────────────────────────────────────────────────────────────
# Route de test
# ──────────────────────────────────────────────────────────────
@app.route('/api/ia/health')
def health():
    return jsonify({
        "status": "OK",
        "app":    "Tijara IA API (Flask)",
        "endpoints": {
            "stats_overview":   "/api/ia/stats/overview",
            "stats_purchases":  "/api/ia/stats/products/purchases",
            "stats_views":      "/api/ia/stats/products/views",
            "stats_categories": "/api/ia/stats/categories",
            "recommend_user":   "/api/ia/recommend/<user_id>",
            "recommend_similar":"/api/ia/recommend/similar/<product_id>",
            "predict_product":  "/api/ia/predict/<product_id>",
            "predict_all":      "/api/ia/predict/all",
        }
    })


# ──────────────────────────────────────────────────────────────
# Demarrage : entrainer les modeles au lancement
# ──────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("Entrainement du modele de recommandation...")
    recommender.train()

    print("Entrainement du modele de prediction...")
    predictor.train()

    print("Tijara IA API demarree sur http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, debug=True)
