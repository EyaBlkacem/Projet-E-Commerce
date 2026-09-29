import pyodbc

# ──────────────────────────────────────────────────────────────
# Connexion à la base de données SQL Server (DealsDB26)
# ──────────────────────────────────────────────────────────────
DB_SERVER = "localhost"
DB_NAME   = "DealsDB26"
DB_DRIVER = "ODBC Driver 17 for SQL Server"

def get_connection():
    """Retourne une connexion active à SQL Server."""
    conn_str = (
        f"DRIVER={{{DB_DRIVER}}};"
        f"SERVER={DB_SERVER};"
        f"DATABASE={DB_NAME};"
        "Trusted_Connection=yes;"
    )
    return pyodbc.connect(conn_str)
