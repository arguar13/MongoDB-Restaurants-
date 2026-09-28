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
print("\n4 Documents without a name")
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

// 7b. ZIP code with invalid format
print("\n7b ZIP code not in 5-digit format (should be 0)")
// $not + regex selects values that do not match ^\d{5}$ (exactly 5 digits). A NaN would also be caught here.
printjson(db.restaurants.countDocuments({ "address.zip_code": { $ne: null, $not: /^\d{5}$/ } }))

// 8. Invalid price range
print("\n8 Invalid price range (should be 0)")
// $nin = "not in". Selects documents whose price_range is not one of the valid levels (null means "unknown" and is allowed).
printjson(db.restaurants.countDocuments({ price_range: { $nin: [null, "$", "$$", "$$$", "$$$$"] } }))

// 9. NaN values
print("\n9 NaN scores or ratings (should be 0)")
// NaN is a number in MongoDB, not null: it passes {$ne: null} filters and turns every $avg into NaN.
printjson(db.restaurants.countDocuments({ $or: [{ score: NaN }, { ratings: NaN }] }))

// 10. Exact duplicates (same name and same address)
// This pipeline detects restaurants loaded more than once. Should be 0 after the ETL.
print("\n10 Duplicates by name + address (should be 0)")
// db.restaurants.aggregate([...]) Executes an aggregation pipeline on the restaurants collection
// An aggregation pipeline in MongoDB is a sequence of steps that process documents one by one, transforming them and producing a final result.
printjson(
  db.restaurants.aggregate([
    // Documents without an address cannot be compared, so they are excluded.
    { $match: { "address.full_address": { $ne: null } } },
    {
      // $group Groups documents by a field or expression. Allows accumulators. Groups documents by name and address.
      // For each group, calculates count by adding 1 for each document.
      $group: {
        // _id: Within a $group stage in an aggregation pipeline, the _id field defines the criteria by which documents will be grouped. Each distinct _id value becomes a "group key".
        _id: { name: "$name", address: "$address.full_address" },
        // count: This is the name of the field that will be created in the grouping result. Each group will have its own count value.
        count: { $sum: 1 }
      }
    },
    // `$match` filters documents (similar to `find`, but within the pipeline). It's used to restrict results after a transformation.
    // Filters groups and leaves only those where `count` > 1.
    { $match: { count: { $gt: 1 } } },
    // $count returns a single document with the number of groups that reached this stage.
    { $count: "duplicated_groups" }
  // .toArray() Converts the pipeline output into an array of documents so it can be printed.
  ]).toArray()
)

// 11. Repeated names
// The same name at different addresses is usually a chain, not an error. Only the 10 most repeated are shown.
print("\n11 Most repeated names (chains, not errors)")
printjson(
  db.restaurants.aggregate([
    { $group: { _id: "$name", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]).toArray()
)

// 12. Category spelling variants
// Two labels that only differ in case, "&" vs "and" or separators ("Coffee & Tea" / "coffee and tea") split one category in two.
print("\n12 Category spelling variants (should be [])")
printjson(
  db.restaurants.aggregate([
    { $unwind: "$category" },
    { $group: { _id: "$category" } },
    {
      // Builds a comparison key: lowercase, "&" -> "and", and any run of non-alphanumeric characters -> a single space.
      $project: {
        key: {
          $trim: {
            input: {
              $reduce: {
                input: { $regexFindAll: { input: { $replaceAll: { input: { $toLower: "$_id" }, find: "&", replacement: " and " } }, regex: /[a-z0-9]+/ } },
                initialValue: "",
                in: { $concat: ["$$value", " ", "$$this.match"] }
              }
            }
          }
        }
      }
    },
    // $addToSet collects the distinct labels that share a key. More than one label means spelling variants.
    { $group: { _id: "$key", variants: { $addToSet: "$_id" } } },
    { $match: { "variants.1": { $exists: true } } }
  ]).toArray()
)

print("\n✅ Validation completed\n")