print("\n======================================")
print("DATA VALIDATION CHECKS")
print("======================================\n")

// 1. Scores out of range
print("1 Scores greater than 5 (should be 0)")
// The filter { score: { $gt: 5 } } means: Selects documents where the score field is greater than 5 ($gt = greater than).
printjson(db.restaurants.countDocuments({ score: { $gt: 5 } }))

// 2. Negative Scores
print("\n2 Negative scores (should be 0)")
// The filter { score: { $lt: 0 } } means: Selects documents where the score field is less than 0 ($lt = less than).
printjson(db.restaurants.countDocuments({ score: { $lt: 0 } }))

// 3. Negative Ratings
print("\n3 Negative Ratings (should be 0)")
printjson(db.restaurants.countDocuments({ ratings: { $lt: 0 } }))

// 4. Documents without a name
print("\n5 Documents without a name")
// The filter { name: { $in: [null, ""] } } means: Selects documents where the name field is in the list [null, ""].
// That is, documents whose name is null (null) or empty ("").
printjson(db.restaurants.countDocuments({ name: { $in: [null, ""] } }))

// 5. Empty Categories
print("\n5 Uncategorized Documents")
// The filter { category: { $size: 0 } } means: Selects documents where the category field is an empty array (length = 0).
printjson(db.restaurants.countDocuments({ category: { $size: 0 } }))

// 6. No geographic location
print("\n6 No location")
printjson(db.restaurants.countDocuments({ location: null }))

// 7. ZIP code missing
print("\n7 Without ZIP code")
printjson(db.restaurants.countDocuments({ "address.zip_code": null }))

// 8. Duplicates by Name
// This pipeline detects duplicate names in the restaurants collection, showing which ones are repeated and how many times.
print("\n8 Possible duplicates by name")
// db.restaurants.aggregate([...]) Executes an aggregation pipeline on the restaurants collection
// An aggregation pipeline in MongoDB is a sequence of steps that process documents one by one, transforming them and producing a final result.
printjson(
  db.restaurants.aggregate([
    {
      // $group Groups documents by a field or expression. Allows accumulators. Groups documents by the name field.
      // For each group, calculates count by adding 1 for each document, basically counting how many restaurants have the same name.
      $group: {
        // _id: Within a $group stage in an aggregation pipeline, the _id field defines the criteria by which documents will be grouped. Each distinct _id value becomes a "group key".
        _id: "$name",
        // count: This is the name of the field that will be created in the grouping result. Each group will have its own count value.
        count: { $sum: 1 }
      }
    },
    // `$match` filters documents (similar to `find`, but within the pipeline). It's used to restrict results after a transformation.
    // Filters groups and leaves only those where `count` > 1. That is, names that appear more than once → potential duplicates.
    { $match: { count: { $gt: 1 } } }
  // .toArray() Converts the pipeline output into an array of documents so it can be printed.
  ]).toArray()
)

print("\n✅ Validation completed\n")