print("\n======================================")
print("AUTOMATIC DATABASE SETUP")
print("======================================\n")

// ======================================
// CREATE COLLECTION
// ======================================
// db.getCollectionNames() gets an array with the names of all existing collections in the current database.
// .includes("restaurants") checks if a collection called "restaurants" exists within that array.
// if (! ... ) The ! sign negates the condition → This means: "If a collection called restaurants does NOT exist..."
// db.createCollection("restaurants") Creates a new collection called restaurants.
if (!db.getCollectionNames().includes("restaurants")) {
  db.createCollection("restaurants")
  print("✅ Collection created")
} else {
  print("ℹ️ Collection already exists")
}

// ======================================
// INDEXES
// ======================================
print("\nCreating indexes...")

print("Index: name")
// db.restaurants Refers to the collection named restaurants within the current database.
// .createIndex({ name: 1 }) Creates an index on the name field. The value 1 indicates that the index will be in ascending order (if it were -1, it would be descending).
// printjson(...) Prints the result of the operation to the console in JSON format.
printjson(db.restaurants.createIndex({ name: 1 }))

// A single index on category is not created: the compound index (category + score) below already covers
// every query that filters only by category, because MongoDB can use any prefix of a compound index.
// If an older run created it, it is removed to avoid paying the write/storage cost of a redundant index.
if (db.restaurants.getIndexes().some(idx => idx.name === "category_1")) {
  db.restaurants.dropIndex("category_1")
  print("Redundant index category_1 removed")
}

print("\nIndex: score")
printjson(db.restaurants.createIndex({ score: -1 }))

print("\nIndex: ratings")
printjson(db.restaurants.createIndex({ ratings: -1 }))

print("\nIndex: zip_code")
// .createIndex({ "address.zip_code": 1 }) Creates an index on the zip_code field within the embedded document address.
// This means MongoDB will be able to quickly search and sort by postal code within the address.
printjson(db.restaurants.createIndex({ "address.zip_code": 1 }))

print("\nIndex: geospatial location")
// The type "2dsphere" indicates that the index is designed for geospatial data in GeoJSON format (points, polygons, lines).
printjson(db.restaurants.createIndex({ location: "2dsphere" }))

print("\nIndex: compound (category + score)")
// .createIndex({ category: 1, score: -1 }) Creates an index on two fields at once: category in ascending order (1), score in descending order (-1).
// This means that MongoDB will first organize by category, and within each category, it will order by score from highest to lowest.
// It also serves queries that filter only by category (index prefix).
printjson(db.restaurants.createIndex({ category: 1, score: -1 }))

print("✅ Indexes created")

// ======================================
// STRUCTURE VALIDATION (PRO)
// ======================================
print("\nValidating document structure (schema check)...")

// Saves the result (the total number of documents in the collection) in the constant totalDocs.
const totalDocs = db.restaurants.countDocuments()

if (totalDocs === 0) {
  print("No data in the collection")
} else {

  // The result (the number of invalid documents) is stored in the `invalidDocs` constant.
  // `$or` means that if either condition is true, the document is considered invalid.
  // { name: { $exists: false } } → The `name` field does not exist.
  const invalidDocs = db.restaurants.countDocuments({
    $or: [
      { name: { $exists: false } },
      { category: { $exists: false } },
      { address: { $exists: false } },
      { location: { $exists: false } }
    ]
  })

  if (invalidDocs > 0) {
    // Backticks `...` Indicate a template literal in JavaScript. They allow you to write strings that can include variables or expressions within ${...}.
    // ${invalidDocs} Inserts the value of the variable `invalidDocs` into the string.
    print(`Documents with invalid structure: ${invalidDocs}`)
  } else {
    print("All documents have a valid structure")
  }
}

// ======================================
// SUMMARY
// ======================================
print("\nSummary:")
print("Total documents:", db.restaurants.countDocuments())

print("\n======================================")
print("SETUP COMPLETED")
print("======================================\n")