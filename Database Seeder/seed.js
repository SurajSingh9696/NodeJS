const mongoose = require("mongoose");
require("dotenv").config();
const bcrypt = require("bcryptjs");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
};
connectDB();

// ==============================
// Seeder
// ==============================
const seedDatabase = async () => {
  try {
    console.log("\n🌱 Starting database seeding...\n");
    const db = mongoose.connection;
    // ==============================
    // Collections
    // ==============================
    const usersCol = db.collection("users");
    const categoriesCol = db.collection("categories");
    const productsCol = db.collection("products");
    const addressesCol = db.collection("addresses");
    const cartsCol = db.collection("carts");
    const ordersCol = db.collection("orders");
    const paymentsCol = db.collection("payments");
    const reviewsCol = db.collection("reviews");

    // ==============================
    // Clear Existing Data
    // ==============================
    await Promise.all([
      usersCol.deleteMany({}),
      categoriesCol.deleteMany({}),
      productsCol.deleteMany({}),
      addressesCol.deleteMany({}),
      cartsCol.deleteMany({}),
      ordersCol.deleteMany({}),
      paymentsCol.deleteMany({}),
      reviewsCol.deleteMany({})
    ]);

    console.log("🧹 All collections cleared");

    // ==============================
    // Users
    // ==============================
    const password = await bcrypt.hash("password123", 10);

    const users = await usersCol.insertMany([
      {
        name: "Admin User",
        age: 30,
        email: "admin@shopease.com",
        password,
        role: "admin",
        phone: "+1234567890",
        isBlocked: false,
        createdAt: new Date()
      },
      {
        name: "John Doe",
        age: 28,
        email: "john@example.com",
        password,
        role: "customer",
        phone: "+1234567891",
        isBlocked: false,
        createdAt: new Date()
      },
      {
        name: "Jane Smith",
        age: 32,
        email: "jane@example.com",
        password,
        role: "customer",
        phone: "+1234567892",
        isBlocked: false,
        createdAt: new Date()
      },
      {
        name: "Mike Johnson",
        age: 25,
        email: "mike@example.com",
        password,
        role: "customer",
        phone: "+1234567893",
        isBlocked: false,
        createdAt: new Date()
      },
      {
        name: "Sarah Williams",
        age: 35,
        email: "sarah@example.com",
        password,
        role: "customer",
        phone: "+1234567894",
        isBlocked: false,
        createdAt: new Date()
      }
    ]);

    console.log(`👤 Users seeded: ${users.insertedCount}`);

    // ==============================
    // Categories
    // ==============================
    const categories = await categoriesCol.insertMany([
      { name: "Electronics" },
      { name: "Computers & Laptops" },
      { name: "Smartphones" },
      { name: "Tablets" },
      { name: "Home Appliances" },
      { name: "Fashion" },
      { name: "Men's Clothing" },
      { name: "Women's Clothing" },
      { name: "Shoes" },
      { name: "Accessories" },
      { name: "Sports & Outdoors" },
      { name: "Books" },
      { name: "Toys & Games" },
      { name: "Health & Beauty" }
    ]);

    console.log(`📂 Categories seeded: ${categories.insertedCount}`);

    // ==============================
    // Products
    // ==============================
    const products = await productsCol.insertMany([
      {
        title: 'MacBook Pro 16"',
        description: "Apple MacBook Pro with M2 Pro chip",
        price: 2499,
        salePrice: 2299,
        sku: "MBP-16-M2",
        brand: "Apple",
        stock: 25,
        category: ["Electronics", "Computers & Laptops"],
        categoryId: [
          categories.insertedIds["0"],
          categories.insertedIds["1"]
        ],
        images: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8"],
        isActive: true,
        createdAt: new Date()
      },
      {
        title: "iPhone 15 Pro Max",
        description: "Latest Apple flagship smartphone",
        price: 1199,
        salePrice: 1099,
        sku: "IPH-15-PM",
        brand: "Apple",
        stock: 50,
        category: ["Electronics", "Smartphones"],
        categoryId: [
          categories.insertedIds["0"],
          categories.insertedIds["2"]
        ],
        images: ["https://images.unsplash.com/photo-1592286927505-c0d0c1b6e7f1"],
        isActive: true,
        createdAt: new Date()
      }
    ]);

    console.log(`📦 Products seeded: ${products.insertedCount}`);

    // ==============================
    // Addresses
    // ==============================
    const addresses = await addressesCol.insertMany([
      {
        userId: users.insertedIds["1"],
        line1: "123 Main Street",
        city: "New York",
        state: "NY",
        postalCode: "10001"
      }
    ]);

    console.log(`🏠 Addresses seeded: ${addresses.insertedCount}`);

    // ==============================
    // Cart
    // ==============================
    await cartsCol.insertOne({
      userId: users.insertedIds["1"],
      items: [
        { productId: products.insertedIds["0"], quantity: 1 }
      ]
    });

    console.log("🛒 Cart seeded");

    // ==============================
    // Orders
    // ==============================
    const orders = await ordersCol.insertOne({
      userId: users.insertedIds["1"],
      items: [
        {
          productId: products.insertedIds["0"],
          title: "MacBook Pro 16\"",
          quantity: 1,
          price: 2299
        }
      ],
      totalAmount: 2299,
      status: "delivered",
      shippingAddress: addresses.ops?.[0] || addresses.insertedIds,
      createdAt: new Date()
    });

    console.log("📦 Order seeded");

    // ==============================
    // Payments
    // ==============================
    await paymentsCol.insertOne({
      userId: users.insertedIds["1"],
      orderId: orders.insertedId,
      amount: 2299,
      provider: "stripe",
      status: "completed",
      transactionId: `TXN-${Date.now()}`
    });

    console.log("💳 Payment seeded");

    // ==============================
    // Reviews
    // ==============================
    await reviewsCol.insertOne({
      productId: products.insertedIds["0"],
      userId: users.insertedIds["1"],
      rating: 5,
      comment: "Amazing performance and display!"
    });

    console.log("⭐ Review seeded");

    console.log("\n✅ Database seeding completed successfully");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB disconnected\n");
    process.exit(0);
  }
};

// ==============================
// Run Seeder
// ==============================
(async () => {
  await connectDB();
  await seedDatabase();
})();
