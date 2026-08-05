print("\n======================================")
print("KPI 1: Average Rating by Category")
print("========================================\n")

printjson(
  db.restaurants.aggregate([
    { $unwind: "$category" }, 
    {
      $group: {
        _id: "$category",
        avg_rating: { $avg: "$score" },
        total_restaurants: { $sum: 1 }
      }
    },
    { $sort: { avg_rating: -1 } }
  ]).toArray()
)


print("\n======================================")
print("KPI 2: Number of Restaurants by Price Range")
print("========================================\n")

printjson(
  db.restaurants.aggregate([
    {
      $group: {
        _id: "$price_range",
        total_restaurants: { $sum: 1 }
      }
    },
    { $sort: { total_restaurants: -1 } }
  ]).toArray()
)


print("\n======================================")
print("KPI 3: Top 10 Restaurants by Rating")
print("========================================\n")

printjson(
  db.restaurants.aggregate([
    { $match: { score: { $ne: null } } },
    { $sort: { score: -1, ratings: -1 } },
    { $limit: 10 },
    // $project Projects only the relevant fields: name, score, ratings, category. The rest of the document fields are not displayed. It is useful to simplify the output and focus on what is important.
    {$project: {name: 1, score: 1, ratings: 1, category: 1}}
  ]).toArray()
)


print("\n======================================")
print("KPI 4: Average Rating by ZIP Code")
print("========================================\n")

printjson(
  db.restaurants.aggregate([
    { $match: { score: { $ne: null } } },
    {
      $group: {
        _id: "$address.zip_code", 
        avg_rating: { $avg: "$score" },
        total_restaurants: { $sum: 1 }
      }
    },
    { $sort: { avg_rating: -1 } }
  ]).toArray()
)


print("\n======================================")
print("KPI 5: Most Common Restaurant Categories")
print("======================================\n")

printjson(
  db.restaurants.aggregate([
    { $unwind: "$category" },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]).toArray()
)


print("\n======================================")
print("KPI 6: Restaurants with More Than 50 Reviews")
print("========================================\n")

printjson(
  db.restaurants.aggregate([
    {$match: {ratings: { $gt: 50 }}},
    {$project: {name: 1, score: 1, ratings: 1, category: 1}},
    { $sort: { score: -1 } }
  ]).toArray()
)