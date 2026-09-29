import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from config import get_connection


class Recommender:

    def __init__(self):
        self.user_product_matrix = None
        self.similarity_matrix   = None
        self.products_df         = None

    def train(self):
        """Charger les données et entraîner le modèle."""
        try:
            conn = get_connection()

            orders_df = pd.read_sql(
                """
                SELECT IdUser, IdDeal AS IdProduct
                FROM Orders
                WHERE Active IN (1,2,3)
                  AND IdUser IS NOT NULL
                  AND IdDeal IS NOT NULL
                """, conn
            )

            self.products_df = pd.read_sql(
                """
                SELECT d.IdDeal, d.titleDeal, d.priceDeal, d.imageDeal,
                       c.TitleFr AS category
                FROM Deals d
                LEFT JOIN Categories c ON d.idCateg = c.IdCateg
                WHERE d.active = 1
                """, conn
            )
            conn.close()

            if orders_df.empty:
                print("Pas assez de donnees pour le modele de recommandation.")
                return False

            self.user_product_matrix = orders_df.pivot_table(
                index='IdUser',
                columns='IdProduct',
                aggfunc=len,
                fill_value=0
            )

            self.similarity_matrix = cosine_similarity(self.user_product_matrix)
            print(f"Modele recommandation entraine: {self.user_product_matrix.shape[0]} users, "
                  f"{self.user_product_matrix.shape[1]} produits")
            return True

        except Exception as e:
            print(f"Erreur entrainement recommandation: {e}")
            return False

    def recommend_for_user(self, user_id: int, n: int = 6):
        """Retourne les n produits recommandes pour un utilisateur."""
        if self.user_product_matrix is None:
            self.train()

        if self.user_product_matrix is None or user_id not in self.user_product_matrix.index:
            return self._get_best_sellers(n)

        user_idx = list(self.user_product_matrix.index).index(user_id)
        similarities = self.similarity_matrix[user_idx]
        similar_users_idx = np.argsort(similarities)[::-1][1:6]

        user_bought = set(
            self.user_product_matrix.columns[
                self.user_product_matrix.iloc[user_idx] > 0
            ].tolist()
        )

        scores = {}
        for sim_idx in similar_users_idx:
            sim_score = similarities[sim_idx]
            sim_user_row = self.user_product_matrix.iloc[sim_idx]
            for product_id, count in sim_user_row.items():
                if count > 0 and product_id not in user_bought:
                    scores[product_id] = scores.get(product_id, 0) + sim_score

        if not scores:
            return self._get_best_sellers(n)

        top_product_ids = sorted(scores, key=scores.get, reverse=True)[:n]

        if self.products_df is not None:
            result = self.products_df[
                self.products_df['IdDeal'].isin(top_product_ids)
            ].to_dict(orient='records')
            return result

        return self._get_best_sellers(n)

    def recommend_similar(self, product_id: int, n: int = 5):
        """Retourne les n produits similaires a un produit donne."""
        if self.user_product_matrix is None:
            self.train()

        if self.user_product_matrix is None or product_id not in self.user_product_matrix.columns:
            return self._get_best_sellers(n)

        product_vector = self.user_product_matrix[product_id].values.reshape(1, -1)
        all_products = self.user_product_matrix.values.T
        similarities = cosine_similarity(product_vector, all_products)[0]

        columns = list(self.user_product_matrix.columns)
        prod_idx = columns.index(product_id)
        similar_idx = np.argsort(similarities)[::-1]
        similar_idx = [i for i in similar_idx if i != prod_idx][:n]
        similar_ids = [columns[i] for i in similar_idx]

        if self.products_df is not None:
            return self.products_df[
                self.products_df['IdDeal'].isin(similar_ids)
            ].to_dict(orient='records')

        return self._get_best_sellers(n)

    def _get_best_sellers(self, n: int = 6):
        """Retourne les n meilleures ventes (fallback)."""
        try:
            conn = get_connection()
            df = pd.read_sql(
                f"""
                SELECT TOP {n}
                    d.IdDeal, d.titleDeal, d.priceDeal, d.imageDeal,
                    c.TitleFr AS category,
                    COUNT(o.IdOrder) AS purchases
                FROM Deals d
                LEFT JOIN Orders o ON d.IdDeal = o.IdDeal AND o.Active IN (1,2,3)
                LEFT JOIN Categories c ON d.idCateg = c.IdCateg
                WHERE d.active = 1
                GROUP BY d.IdDeal, d.titleDeal, d.priceDeal, d.imageDeal, c.TitleFr
                ORDER BY purchases DESC
                """, conn
            )
            conn.close()
            return df.to_dict(orient='records')
        except Exception as e:
            print(f"Erreur best sellers: {e}")
            return []


recommender = Recommender()
