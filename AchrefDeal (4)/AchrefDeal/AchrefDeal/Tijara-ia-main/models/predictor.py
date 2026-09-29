import re
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from config import get_connection


class Predictor:

    def __init__(self):
        self.model        = None
        self.encoder      = LabelEncoder()
        self.feature_cols = ['price_num', 'category_encoded',
                             'vendor_verified', 'likes', 'days_online']

    def _extract_price(self, s):
        nums = re.findall(r'\d+[\.,]?\d*', str(s or '0'))
        return float(nums[0].replace(',', '.')) if nums else 0.0

    def train(self):
        """Charger les donnees et entrainer le modele Random Forest."""
        try:
            conn = get_connection()
            df = pd.read_sql(
                """
                SELECT
                    d.IdDeal,
                    d.priceDeal,
                    d.idCateg,
                    d.DatePublication,
                    COALESCE(d.Likes, 0)      AS likes,
                    COALESCE(u.IsVerified, 0) AS vendor_verified,
                    CASE WHEN EXISTS (
                        SELECT 1 FROM Orders o
                        WHERE o.IdDeal = d.IdDeal AND o.Active IN (1,2,3)
                    ) THEN 1 ELSE 0 END       AS is_sold
                FROM Deals d
                LEFT JOIN Users u ON d.idUser = u.IdUser
                WHERE d.active = 1
                """, conn
            )
            conn.close()

            if len(df) < 5:
                print("Pas assez de donnees pour le modele de prediction.")
                return False

            df['price_num'] = df['priceDeal'].apply(self._extract_price)
            df['category_encoded'] = self.encoder.fit_transform(
                df['idCateg'].fillna(0).astype(str)
            )
            df['DatePublication'] = pd.to_datetime(df['DatePublication'], errors='coerce')
            df['days_online'] = (
                pd.Timestamp.now() - df['DatePublication']
            ).dt.days.fillna(0).clip(lower=0)

            X = df[self.feature_cols]
            y = df['is_sold']

            # Si tous les labels sont identiques, pas besoin de split
            if y.nunique() < 2:
                self.model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=5)
                self.model.fit(X, y)
                print("Modele prediction entraine (donnees uniformes).")
                return True

            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            self.model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=5)
            self.model.fit(X_train, y_train)
            score = self.model.score(X_test, y_test)
            print(f"Modele prediction entraine - Precision: {score:.1%}")
            return True

        except Exception as e:
            print(f"Erreur entrainement prediction: {e}")
            return False

    def predict_product(self, product_id: int):
        """Retourne la probabilite de succes d'un produit (0-100%)."""
        if self.model is None:
            trained = self.train()
            if not trained:
                return {"product_id": product_id, "success_score": 50,
                        "label": "Donnees insuffisantes", "features_used": {}}

        try:
            conn = get_connection()
            df = pd.read_sql(
                """
                SELECT d.priceDeal, d.idCateg, d.DatePublication,
                       COALESCE(d.Likes, 0)      AS likes,
                       COALESCE(u.IsVerified, 0) AS vendor_verified
                FROM Deals d
                LEFT JOIN Users u ON d.idUser = u.IdUser
                WHERE d.IdDeal = ?
                """, conn, params=[product_id]
            )
            conn.close()

            if df.empty:
                return {"error": "Produit introuvable"}

            row = df.iloc[0]
            price_num = self._extract_price(row['priceDeal'])

            try:
                cat_encoded = self.encoder.transform([str(row['idCateg'] or '0')])[0]
            except Exception:
                cat_encoded = 0

            pub_date = pd.to_datetime(row['DatePublication'], errors='coerce')
            days_online = int((pd.Timestamp.now() - pub_date).days) if pd.notna(pub_date) else 0

            features = pd.DataFrame([{
                'price_num':        price_num,
                'category_encoded': cat_encoded,
                'vendor_verified':  int(row['vendor_verified']),
                'likes':            int(row['likes']),
                'days_online':      max(0, days_online),
            }])

            proba = self.model.predict_proba(features)[0]
            # proba[1] = probabilite classe "vendu"
            score = round(float(proba[1]) * 100, 1) if len(proba) > 1 else round(float(proba[0]) * 100, 1)

            if score >= 70:
                label = "Fort potentiel"
            elif score >= 40:
                label = "Potentiel moyen"
            else:
                label = "Faible potentiel"

            return {
                "product_id":    product_id,
                "success_score": score,
                "label":         label,
                "features_used": {
                    "price":           price_num,
                    "days_online":     days_online,
                    "likes":           int(row['likes']),
                    "vendor_verified": bool(row['vendor_verified']),
                }
            }
        except Exception as e:
            return {"error": str(e)}

    def predict_all_products(self):
        """Score de succes pour tous les produits actifs."""
        if self.model is None:
            trained = self.train()
            if not trained:
                return []

        try:
            conn = get_connection()
            df = pd.read_sql(
                """
                SELECT d.IdDeal, d.titleDeal, d.priceDeal, d.idCateg,
                       d.DatePublication,
                       COALESCE(d.Likes, 0)      AS likes,
                       COALESCE(u.IsVerified, 0) AS vendor_verified
                FROM Deals d
                LEFT JOIN Users u ON d.idUser = u.IdUser
                WHERE d.active = 1
                """, conn
            )
            conn.close()

            if df.empty:
                return []

            df['price_num'] = df['priceDeal'].apply(self._extract_price)
            try:
                df['category_encoded'] = self.encoder.transform(
                    df['idCateg'].fillna(0).astype(str)
                )
            except Exception:
                df['category_encoded'] = 0

            df['DatePublication'] = pd.to_datetime(df['DatePublication'], errors='coerce')
            df['days_online'] = (
                pd.Timestamp.now() - df['DatePublication']
            ).dt.days.fillna(0).clip(lower=0)

            X = df[self.feature_cols]
            probas = self.model.predict_proba(X)
            col_idx = 1 if probas.shape[1] > 1 else 0
            df['success_score'] = (probas[:, col_idx] * 100).round(1)

            return df[['IdDeal', 'titleDeal', 'success_score']].rename(columns={
                'IdDeal':     'product_id',
                'titleDeal':  'product_name'
            }).sort_values('success_score', ascending=False).to_dict(orient='records')

        except Exception as e:
            print(f"Erreur predict_all: {e}")
            return []


predictor = Predictor()
