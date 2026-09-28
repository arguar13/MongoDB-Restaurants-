import html
import os
import re
from pathlib import Path

import numpy as np
import pandas as pd
from pymongo import MongoClient

# ======================================
# CONFIG
# ======================================
# Environment variables allow pointing the pipeline to another server/database without editing the code.
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "restaurants_db")
COLLECTION_NAME = "restaurants"
# The CSV path is resolved relative to this file (scripts/ -> project root -> data/), so the project runs on any machine.
CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "restaurants.csv"

# Valid Uber Eats price levels. Anything else (e.g. "$$$$$$$$$$$$$$$$$") is treated as a scraping error.
VALID_PRICE_RANGES = {"$", "$$", "$$$", "$$$$"}


# ======================================
# LOAD DATA
# ======================================
def load_data(path):
    print("\nLoading CSV...")
    # zip_code is read as text: as a number it would lose leading zeros (e.g. "02108" -> 2108).
    df = pd.read_csv(path, dtype={"zip_code": str})
    print(f"Original rows: {len(df)}")
    return df


# ======================================
# DATA CLEANING
# ======================================
# Normalizes a ZIP code to the 5-digit US format.
# "35233-1944" (ZIP+4) -> "35233", "260623720" (ZIP+4 without dash) -> "26062", "3574" (lost leading zero) -> "03574".
# Values that are not ZIP codes ("United States", "WA", "Milwaukee") -> None.
def normalize_zip(zip_code):
    if pd.isna(zip_code):
        return None

    digits = str(zip_code).strip().split("-")[0]
    if not digits.isdigit():
        return None
    if len(digits) == 9:
        return digits[:5]
    if 3 <= len(digits) <= 5:
        return digits.zfill(5)
    return None


def clean_data(df):
    df = df.copy()

    # Normalize column names
    df.columns = df.columns.str.strip().str.lower()

    # Convert numeric types
    df["score"] = pd.to_numeric(df["score"], errors="coerce")
    df["ratings"] = pd.to_numeric(df["ratings"], errors="coerce")

    # Invalid price levels → NaN
    df["price_range"] = df["price_range"].where(df["price_range"].isin(VALID_PRICE_RANGES), np.nan)

    # ZIP code → 5-digit string
    df["zip_code"] = df["zip_code"].apply(normalize_zip)

    # (0, 0) is a placeholder used by the source when the location is unknown, not a real restaurant position.
    unknown_location = (df["lat"] == 0) | (df["lng"] == 0)
    df.loc[unknown_location, ["lat", "lng"]] = np.nan

    # Text columns:
    # html.unescape decodes the HTML entities left by the scraper ("Coffee &amp; Tea" -> "Coffee & Tea").
    # strip trims spaces: "The Ice Cream Shop " and "The Ice Cream Shop" must be the same restaurant.
    for column in ["name", "category", "full_address"]:
        df[column] = df[column].map(html.unescape, na_action="ignore").str.strip()

    # Delete unnamed records (empty strings included)
    df["name"] = df["name"].replace("", np.nan)
    df = df.dropna(subset=["name"])

    # Delete duplicated restaurants (same name at the same address).
    # Rows without an address are kept: several stores of a chain can share the name and have no address.
    duplicated = df.duplicated(subset=["name", "full_address"]) & df["full_address"].notna()
    df = df[~duplicated]

    return df


# ======================================
# FEATURE ENGINEERING
# ======================================
# The function converts any category value into a clean list of strings, with no nulls, no extra spaces, and no empty elements.
def clean_category(category):
    if pd.isna(category):
        return []

    return [
        c.strip()
        for c in str(category).split(",") if c.strip()
    ]


# The source mixes spellings of the same category: "Burgers" / "burger", "Coffee and Tea" / "Coffee & Tea",
# "Sandwich" / "Sandwiches", "Vegetarian Friendly" / "Vegetarian-Friendly".
# This key ignores case, "&" vs "and", spaces, separators and singular/plural ("Barfood" / "Bar Food"), so every variant of a category gets the same key.
def category_key(category):
    text = category.lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", " ", text)

    words = []
    for word in text.split():
        if word.endswith(("ches", "shes", "xes", "sses")):
            word = word[:-2]
        elif word.endswith("ies") and len(word) > 4:
            word = word[:-3] + "y"
        elif word.endswith("s") and not word.endswith("ss") and len(word) > 3:
            word = word[:-1]
        words.append(word)

    return "".join(words)


# Maps each category variant to its canonical label: the most frequent spelling in the dataset.
# Using the data to choose the label avoids maintaining a manual synonyms dictionary.
def build_category_map(category_lists):
    counts = pd.Series([c for categories in category_lists for c in categories]).value_counts()

    canonical = {}
    for category in counts.index:  # value_counts() is sorted by frequency, so the first variant seen for a key wins
        canonical.setdefault(category_key(category), category)

    return {category: canonical[category_key(category)] for category in counts.index}


def engineer_features(df):
    df = df.copy()

    # Category -> Array
    df["category"] = df["category"].apply(clean_category)

    # Category variants -> canonical label.
    # dict.fromkeys(...) removes the duplicates it can create ("Sandwich" + "Sandwiches" in the same restaurant) while keeping the order.
    category_map = build_category_map(df["category"])
    df["category"] = df["category"].apply(lambda categories: list(dict.fromkeys(category_map[c] for c in categories)))

    # Address -> Embedded Document
    # In zip(...) the zip function takes two (or more) iterables and combines them in pairs. In this case, each iteration returns a tuple (address, zip_code)
    df["address"] = [
        {
            # Nested fields are not covered by to_documents(), so NaN is converted to None here.
            "full_address": None if pd.isna(address) else address,
            "zip_code": None if pd.isna(zip_code) else zip_code
        }
        for address, zip_code in zip(df["full_address"], df["zip_code"])
    ]

    # GeoJSON
    # The `pd.isna(lat)` function checks if `lat` is null (`NaN`, `None`, `empty`). It returns `True` if the latitude is missing.
    # GeoJSON stores coordinates as [longitude, latitude], the opposite order of the CSV columns.
    df["location"] = [
        None if pd.isna(lat) or pd.isna(lng)
        else {
            "type": "Point",
            "coordinates": [float(lng), float(lat)]
        }
        for lat, lng in zip(df["lat"], df["lng"])
    ]

    # Drop obsolete columns
    df = df.drop(columns=["full_address", "zip_code", "lat", "lng"])

    return df


# ======================================
# CONVERT TO DOCUMENTS
# ======================================
# pandas represents missing values as NaN, and pymongo would store them as the number NaN instead of null.
# In MongoDB NaN is not null: {score: {$ne: null}} would match it and {$avg: "$score"} would return NaN.
# This function replaces every NaN scalar with None so that it is stored as a real null.
def to_documents(df):
    # The `df.to_dict(...)` method in pandas transforms the DataFrame into a dictionary object.
    # The `orient="records"` attribute means that each row of the DataFrame is converted into a dictionary with column-value pairs. The result is a list of dictionaries.
    records = df.to_dict(orient="records")

    return [
        {
            key: None if isinstance(value, float) and np.isnan(value) else value
            for key, value in record.items()
        }
        for record in records
    ]


# ======================================
# INSERT INTO MONGO
# ======================================
def load_to_mongo(collection, records):
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
def quick_check(collection):
    print("\nQuick Check:")
    # Action: count_documents(...) returns the number of documents that meet that condition.
    print("Total documents:", collection.count_documents({}))
    # Filter: {"location": {"$ne": None}} $ne means "not equal". Selects documents where the location field is not null (None).
    print("With location:", collection.count_documents({"location": {"$ne": None}}))
    # Filter: {"category.0": {"$exists": True}} category.0 refers to the first element of the category array. $exists: True means that this element exists.
    # Action: Counts documents where the category array has at least one element.
    # Result: Number of records with non-empty categories.
    print("With categories:", collection.count_documents({"category.0": {"$exists": True}}))
    # Filter: {"score": {"$type": "number"}} Selects documents where score is a number (null values are excluded).
    print("With score:", collection.count_documents({"score": {"$type": "number"}}))


def main():
    df = load_data(CSV_PATH)

    print("\nData Cleaning...")
    df = clean_data(df)
    print(f"Rows after cleaning: {len(df)}")

    print("\nFeature Engineering...")
    df = engineer_features(df)
    records = to_documents(df)

    # The `with` block closes the connection automatically when the pipeline finishes (or fails).
    with MongoClient(MONGO_URI) as client:
        collection = client[DB_NAME][COLLECTION_NAME]
        load_to_mongo(collection, records)
        quick_check(collection)


if __name__ == "__main__":
    main()
