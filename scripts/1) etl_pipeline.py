import pandas as pd
from pymongo import MongoClient
import numpy as np

# ======================================
# CONFIG
# ======================================
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "restaurants_db"
COLLECTION_NAME = "restaurants"
CSV_PATH = r"C:\Users\arman\OneDrive\Documentos\Proyectos de programacion\Proyectos sin haberse publicado\ML-DL-SQL-MongoDB\508 MongoDB\data\restaurants.csv"

# ======================================
# CONEXIÓN
# ======================================
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

# ======================================
# LOAD DATA
# ======================================
print("\nCargando CSV...")
df = pd.read_csv(CSV_PATH)

print(f"Filas originales: {len(df)}")

# ======================================
# DATA CLEANING
# ======================================
print("\nData Cleaning...")

def clean_data(df):
    df = df.copy()

    # Normalize column names
    df.columns = df.columns.str.strip().str.lower()

    # Convert numeric types
    df["score"] = pd.to_numeric(df["score"], errors="coerce")
    df["ratings"] = pd.to_numeric(df["ratings"], errors="coerce")

    # Empty strings → NaN
    df["price_range"] = df["price_range"].replace("", np.nan)

    # Delete unnamed records
    df = df.dropna(subset=["name"])

    return df

df = clean_data(df)
print(f"Rows after cleaning: {len(df)}")

# ======================================
# FEATURE ENGINEERING
# ======================================
print("\nFeature Engineering...")

# The function converts any category value into a clean list of strings, with no nulls, no extra spaces, and no empty elements.
def clean_category(category):
    if pd.isna(category):
        return []

    return [
        c.strip()
        for c in str(category).split(",") if c.strip()
    ]

def engineer_features(df):
    df = df.copy()

    # Category -> Array
    df["category"] = df["category"].apply(clean_category)

    # Address -> Embedded Document
    # The `.notna()` method returns a Boolean string indicating which values ​​are not null (True if there is data, False if it's NaN).
    # The `.where(condition, value)` method retains the original values ​​where the condition is True. Where the condition is False (i.e., the value was null), it replaces it with `value`.
    # This line takes the `zip_code` column, replaces null (NaN) values ​​with `None`, and ensures that everything is in object format.
    zip_codes = df["zip_code"].where(df["zip_code"].notna(), None).astype("object")

    # In zip(...) the zip function takes two (or more) iterables and combines them in pairs. In this case, each iteration returns a tuple (address, zip_code)
    df["address"] = [
        {
            "full_address": address,
            "zip_code": str(zip_code) if zip_code is not None else None
        }
        for address, zip_code in zip(df["full_address"], zip_codes)
    ]

    # GeoJSON
    # The `pd.isna(lat)` function checks if `lat` is null (`NaN`, `None`, `empty`). It returns `True` if the latitude is missing.
    df["location"] = [
        None if pd.isna(lat) or pd.isna(lng)
        else {
            "type": "Point",
            "coordinates": [float(lng), float(lat)]
        }
        for lat, lng in zip(df["lat"], df["lng"])
    ]

    # Drop obsolete columns
    df.drop(columns=["full_address", "zip_code", "lat", "lng"], inplace=True)

    return df

df = engineer_features(df)

# ======================================
# CONVERT TO JSON
# ======================================
# The `df.to_dict(...)` method in pandas transforms the DataFrame into a dictionary object.
# The `orient="records"` attribute means that each row of the DataFrame is converted into a dictionary with column-value pairs. The result is a list of dictionaries.
records = df.to_dict(orient="records")

# ======================================
# INSERT INTO MONGO
# ======================================
print("\nCleaning up the collection... ")
# The delete_many({}) method deletes all documents that meet the specified filter.
# The {} argument is an empty filter, meaning there are no conditions; therefore, all documents in the collection are deleted.
collection.delete_many({})

print("Entering data...")
# The `insert_many(records)` command inserts all documents contained in the `records` list.
# Each element of `records` must be a Python dictionary (key: value), which is then converted into a document within MongoDB.
collection.insert_many(records)

print("✅ ETL completed successfully")

# ======================================
# BASIC VALIDATION
# ======================================
print("\nQuick Check:")
# Action: count_documents(...) returns the number of documents that meet that condition.
print("Total documents:", collection.count_documents({}))
# Filter: {"location": {"$ne": None}} $ne means "not equal". Selects documents where the location field is not null (None).
print("With location:", collection.count_documents({"location": {"$ne": None}}))
# Filter: {"category.0": {"$exists": True}} category.0 refers to the first element of the category array. $exists: True means that this element exists.
# Action: Counts documents where the category array has at least one element.
# Result: Number of records with non-empty categories.
print("With categories:", collection.count_documents({"category.0": {"$exists": True}}))