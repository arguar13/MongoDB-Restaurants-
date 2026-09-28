print("\n===============================")
print("1 Top 10 Best Rated Restaurants")
print("===============================\n")
// db.restaurants.find(...) Searches for documents in the restaurants collection.
// Filter { score: { $ne: null } } Selects only documents where the score field is not null ($ne = not equal).
// Projection { name: 1, score: 1, ratings: 1, category: 1 } Returns only the name, score, ratings, and category fields. The 1 means "include this field".
// .sort({ score: -1, ratings: -1 }) Sorts the results first by score in descending order (-1 = highest to lowest). If there is a tie in score, it uses ratings, also in descending order, as a secondary criterion.
// .forEach(printjson) Iterates over each document in the result and prints it in JSON format to the console.
db.restaurants.find(
  { score: { $ne: null } },
  { name: 1, score: 1, ratings: 1, category: 1 }
)
.sort({ score: -1, ratings: -1 })
.limit(10)
.forEach(printjson)


print("\n==============================")
print("2 Restaurants with the most reviews")
print("==============================\n")

db.restaurants.find(
  { ratings: { $ne: null } },
  { name: 1, ratings: 1, score: 1 }
)
.sort({ ratings: -1 })
.limit(10)
.forEach(printjson)


print("\n==============================")
print("3 High-priced restaurants")
print("===============================\n")

// Filter { price_range: "$$$" } Selects only documents where the price_range field is exactly the string "$$$". This field typically represents the restaurant's price level (e.g., $, $$, $$$, $$$$).
db.restaurants.find(
  { price_range: "$$$" },
  { name: 1, price_range: 1, score: 1 }
)
.sort({ score: -1 })
.limit(20)
.forEach(printjson)


print("\n==============================")
print("4 Restaurants with a score of 4.5 or higher")
print("==============================\n")

// Filter { score: { $gte: 4.5 } } Selects only documents where the score field is greater than or equal to 4.5.
// More than 25k restaurants match, so the total is shown and only the top 20 are printed.
print("Total:", db.restaurants.countDocuments({ score: { $gte: 4.5 } }))
db.restaurants.find(
  { score: { $gte: 4.5 } },
  { name: 1, score: 1, ratings: 1 }
)
.sort({ score: -1, ratings: -1 })
.limit(20)
.forEach(printjson)


print("\n==============================")
print("5 Sushi Restaurants")
print("==============================\n")

// /Sushi/i is a regular expression: /Sushi/ → searches for the word "Sushi" within the field. i → means case-insensitive (ignores uppercase/lowercase letters).
db.restaurants.find(
  { category: /Sushi/i },
  { name: 1, category: 1, score: 1 }
)
.sort({ score: -1 })
.limit(20)
.forEach(printjson)


print("\n==============================")
print("6 Vegetarian restaurants")
print("==============================\n")

db.restaurants.find(
  { category: /Vegetarian/i },
  { name: 1, category: 1, score: 1 }
)
.sort({ score: -1 })
.limit(20)
.forEach(printjson)


print("\n==============================")
print("7 Restaurant Count by Price Range")
print("===============================\n")

// db.restaurants.aggregate([...]) Executes an aggregation pipeline on the restaurants collection.
printjson(
  db.restaurants.aggregate([
    {
      // Groups documents by the price_range field.
      // Groups documents by the price_range field. For each group, creates a total field that counts how many documents are in that price range ($sum: 1).
      $group: {
        _id: "$price_range",
        total: { $sum: 1 }
      }
    },
    // Sorts the groups by the total field in descending order (-1 = from largest to smallest).
    { $sort: { total: -1 } }
    // .toArray() Converts the result into an array of documents so that it can be printed.
  ]).toArray()
)


print("\n==============================")
print("8 Average score by price range")
print("==============================\n")

printjson(
  db.restaurants.aggregate([
    // $match: { score: { $ne: null } } Filters documents from the restaurants collection. Only those with a score field other than null are passed to the pipeline.
    { $match: { score: { $ne: null } } },
    {
      //Groups documents by the price_range field.
      //_id: "$price_range" → the group identifier is the price range.
      //avg_score: { $avg: "$score" } → calculates the average rating of restaurants in that range.
      //total: { $sum: 1 } → counts how many restaurants are in that range.
      $group: {
        _id: "$price_range",
        avg_score: { $avg: "$score" },
        total: { $sum: 1 }
      }
    },
    // The price ranges with the best average rating appear first.
    { $sort: { avg_score: -1 } }
  ]).toArray()
)


print("\n==============================")
print("9 Average score per ZIP code (min. 10 rated restaurants)")
print("=============================\n")

printjson(
  db.restaurants.aggregate([
    { $match: { score: { $ne: null }, "address.zip_code": { $ne: null } } },
    {
      $group: {
        _id: "$address.zip_code",
        avg_score: { $avg: "$score" },
        restaurants: { $sum: 1 }
      }
    },
    // A ZIP code with a single restaurant rated 5.0 would top the ranking. A minimum sample size keeps the average meaningful.
    { $match: { restaurants: { $gte: 10 } } },
    { $sort: { avg_score: -1 } },
    { $limit: 10 }
  ]).toArray()
)
  

print("\n==============================")
print("10 Top 10 Restaurant Categories")
print("==============================\n")

printjson(
  db.restaurants.aggregate([
    // Main function: Takes a field that is an array and converts it into multiple documents, one for each element of the array.
    // In this case: The `category` field is an array (for example: ["Sushi", "Japanese", "Seafood"]).
    // With `$unwind: "$category`, MongoDB generates a separate document for each value in the array.
    { $unwind: "$category" }, 
    {
      $group: {
        _id: "$category",
        total: { $sum: 1 }
      }
    },
    { $sort: { total: -1 } },
    { $limit: 10 }
  ]).toArray()
)

print("\n==============================")
print("11 Restaurants with more than 50 reviews")
print("==============================\n")

print("Total:", db.restaurants.countDocuments({ ratings: { $gt: 50 } }))
db.restaurants.find(
  { ratings: { $gt: 50 } },
  { name: 1, ratings: 1, score: 1 }
)
.sort({ ratings: -1 })
.limit(20)
.forEach(printjson)


print("\n==============================")
print("12 Restaurants with few reviews but high scores")
print("==============================\n")

// Uber Eats only publishes a score after 10 ratings, so the minimum value of ratings is 10.
// "Few reviews" is defined as 20 or less (roughly the lowest fifth of rated restaurants: 19% of them).
db.restaurants.find(
  {
    score: { $gte: 4.5 },
    ratings: { $lte: 20 }
  },
  { name: 1, score: 1, ratings: 1 }
)
.sort({ score: -1, ratings: 1 })
.limit(20)
.forEach(printjson)


print("\n==============================")
print("13 Count of restaurants by category")
print("=============================\n")

printjson(
  db.restaurants.aggregate([
    { $unwind: "$category" }, 
    {
      $group: {
        _id: "$category",
        total_restaurants: { $sum: 1 }
      }
    },
    { $sort: { total_restaurants: -1 } },
    { $limit: 20 }
  ]).toArray()
)


print("\n==============================")
print("14 Restaurants without score")
print("=============================\n")

// Around 28k restaurants have no score: the total is shown and only a sample is printed.
print("Total:", db.restaurants.countDocuments({ score: null }))
db.restaurants.find(
  { score: null },
  { name: 1, category: 1 }
)
.limit(10)
.forEach(printjson)


print("\n==============================")
print("15 Restaurants without a price range")
print("==============================\n")

// The ETL stores a missing price range as null (not as an empty string).
print("Total:", db.restaurants.countDocuments({ price_range: null }))
db.restaurants.find(
  { price_range: null },
  { name: 1, category: 1 }
)
.limit(10)
.forEach(printjson)


print("\n==============================")
print("16 Average number of reviews per category")
print("==============================\n")

printjson(
  db.restaurants.aggregate([
    // $match: { ratings: { $ne: null } } Filters documents so that only those with a ratings field other than null are allowed.
    { $match: { ratings: { $ne: null } } },
    // $unwind: "$category" Breaks down the category array into multiple documents, one for each element.
    { $unwind: "$category" }, 
    {
      $group: {
        _id: "$category",
        avg_ratings: { $avg: "$ratings" },
        restaurants: { $sum: 1 }
      }
    },
    // Categories with very few restaurants are excluded so that one outlier does not define the average.
    { $match: { restaurants: { $gte: 30 } } },
    { $sort: { avg_ratings: -1 } },
    { $limit: 20 }
  ]).toArray()
)


print("\n==============================")
print("17 Most Popular Restaurants by Category")
print("==============================\n")

printjson(
  db.restaurants.aggregate([
    // Filtering and sorting before $unwind works on 35k documents (and can use the ratings index) instead of on every category copy.
    { $match: { ratings: { $ne: null } } },
    { $sort: { ratings: -1 } },
    { $unwind: "$category" },
    {
      $group: {
        _id: "$category",
        // `$first` is an accumulator in MongoDB that returns the first value of a field within each group.
        // The "first value" depends on the order of the documents in the pipeline before reaching `$group`.
        // In this case, just before `$group` there's `$sort: { ratings: -1 }`, which ensures that the first document in each category is the one with the highest rating.
        // `top_restaurant: { $first: "$name" }` Within each group (grouped by category), it takes the first restaurant name. Since the documents are already sorted by descending ratings, that first restaurant will be the highest-rated in the category.
        top_restaurant: { $first: "$name" },
        // max_ratings: { $first: "$ratings" } Returns the first rating value in each group. Since the order is already descending, this value corresponds to the highest rating in the category.
        max_ratings: { $first: "$ratings" }
      }
    },
    { $sort: { max_ratings: -1 } },
    { $limit: 20 }
  ]).toArray()
)


print("\n==============================")
print("18 Top 10 restaurants by Bayesian weighted rating")
print("===============================\n")

// A 5.0 with 10 reviews is weaker evidence than a 4.9 with 500. The Bayesian average (the IMDb Top 250 formula)
// pulls every score towards the global mean, and the pull fades as the number of reviews grows:
//   weighted_rating = (v / (v + m)) * R + (m / (v + m)) * C
//   R = restaurant score, v = its number of reviews, C = mean score of all restaurants, m = prior weight.
// m is the median number of reviews: a restaurant needs as many reviews as a typical one before its own score weighs more than the global mean.

// Step 1: C and m are computed from the data, not hardcoded.
// $percentile (MongoDB 7.0+) returns an array with one value per requested percentile.
const prior = db.restaurants.aggregate([
  { $match: { score: { $ne: null }, ratings: { $ne: null } } },
  {
    $group: {
      _id: null,
      C: { $avg: "$score" },
      m: { $percentile: { input: "$ratings", p: [0.5], method: "approximate" } }
    }
  }
]).toArray()[0]
const C = prior.C
const m = prior.m[0]
print(`Global mean score (C): ${C.toFixed(2)} | Prior weight (m, median reviews): ${m}\n`)

// Step 2: weighted rating per restaurant.
printjson(
  db.restaurants.aggregate([
    { $match: { score: { $ne: null }, ratings: { $ne: null } } },
    {
      // $addFields Adds a new calculated field called weighted_rating with the formula above.
      $addFields: {
        weighted_rating: {
          $add: [
            { $multiply: [{ $divide: ["$ratings", { $add: ["$ratings", m] }] }, "$score"] },
            { $multiply: [{ $divide: [m, { $add: ["$ratings", m] }] }, C] }
          ]
        }
      }
    },
    // Restaurants with the same score and reviews get the same weighted rating: name is only a deterministic tie-breaker.
    { $sort: { weighted_rating: -1, ratings: -1, name: 1 } },
    { $limit: 10 },
    { $project: { name: 1, score: 1, ratings: 1, weighted_rating: { $round: ["$weighted_rating", 3] } } }
  ]).toArray()
)


print("\n==============================")
print("19 Restaurants near a location")
print("==============================\n")

db.restaurants.find({
  // Filter location: { $near: { ... } }. Applies a filter on the location field, which must be a field with geospatial coordinates and have a previously created 2dsphere index.
  location: {
    // The $near operator returns documents ordered by proximity to a given point.
    $near: {
      // $geometry Defines the reference point in GeoJSON format. type: "Point" → indicates that it is a point. coordinates: [-86.80, 33.51] → longitude and latitude of the center point.
      $geometry: {
        type: "Point",
        coordinates: [-86.80, 33.51]
      },
      // $maxDistance: 3000 Limits the results to those whose location is within a radius of 3000 meters (3 km) from the given point.
      $maxDistance: 3000
    }
  }
},
{ name: 1, "address.full_address": 1, score: 1 }
)
.limit(10)
.forEach(printjson)


print("\n==============================")
print("20 Best rated restaurants within a 5 km radius")
print("===============================\n")

// This pipeline uses $geoNear to find the restaurants within 5 km of a geographic point, adds a distance field with the calculated distance in meters,
// and returns the 10 best rated ones. Unlike $near, $geoNear lets the result be re-sorted by another field after the distance filter.
printjson(
  db.restaurants.aggregate([
    {
      // $geoNear is a special aggregation stage that can only go at the beginning of the pipeline. It searches for documents near a geographic point.
      $geoNear: {
        // near: { type: "Point", coordinates: [-86.80, 33.51] } Defines the reference point in GeoJSON format.
        near: {
          type: "Point",
          coordinates: [-86.80, 33.51]
        },
        // distanceField: "distance" Creates an additional field in each document called distance. That field contains the calculated distance between the restaurant and the landmark.
        distanceField: "distance",
        // spherical: true Indicates that distance calculations should be performed on the Earth's sphere (realistic model), not on a Cartesian plane. This is important for geographic coordinates.
        spherical: true,
        // maxDistance: 5000 Only documents within 5000 meters (5 km) of the point are returned.
        maxDistance: 5000,
        // query: Filter applied together with the distance search. Only restaurants with a score.
        query: { score: { $ne: null } }
      }
    },
    { $sort: { score: -1, distance: 1 } },
    { $limit: 10 },
    {
      $project: {
        name: 1,
        score: 1,
        // $round: ["$distance", 0] Rounds the distance in meters to an integer for readability.
        distance_m: { $round: ["$distance", 0] }
      }
    }
  ]).toArray()
)