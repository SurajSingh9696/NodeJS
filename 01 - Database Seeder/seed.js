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

// ==============================
// Seeder
// ==============================
const seedDatabase = async () => {
  try {
    await connectDB();
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

    // Drop legacy indexes that may conflict
    try {
      await ordersCol.dropIndex("orderId_1");
      console.log("🧽 Dropped old orderId index");
    } catch (err) {
      // Index might not exist; ignore
    }

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
      { name: "Electronics", parentId: null },
      { name: "Computers & Laptops", parentId: null },
      { name: "Smartphones", parentId: null },
      { name: "Tablets", parentId: null },
      { name: "Home Appliances", parentId: null },
      { name: "Fashion", parentId: null },
      { name: "Men's Clothing", parentId: null },
      { name: "Women's Clothing", parentId: null },
      { name: "Shoes", parentId: null },
      { name: "Accessories", parentId: null },
      { name: "Sports & Outdoors", parentId: null },
      { name: "Books", parentId: null },
      { name: "Toys & Games", parentId: null },
      { name: "Health & Beauty", parentId: null }
    ]);

    console.log(`📂 Categories seeded: ${categories.insertedCount}`);

    // ==============================
    // Products
    // ==============================
    const productsData = [
      {
        title: 'MacBook Pro 16"',
        description: "Apple MacBook Pro 16-inch with M2 Pro chip, 16GB RAM, 512GB SSD. Perfect for professionals and content creators.",
        price: 2499,
        category: ["Electronics", "Computers & Laptops"],
        categoryId: [categories.insertedIds["0"], categories.insertedIds["1"]],
        salePrice: 2299,
        sku: "MBP-16-M2-512",
        brand: "Apple",
        images: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500", "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=500"],
        stock: 25,
        isActive: true,
        createdAt: new Date()
      },
      {
        title: "iPhone 15 Pro Max",
        description: "Latest iPhone 15 Pro Max with A17 Pro chip, 256GB storage, Titanium design, and advanced camera system.",
        price: 1199,
        category: ["Electronics", "Smartphones"],
        categoryId: [categories.insertedIds["0"], categories.insertedIds["2"]],
        salePrice: 1099,
        sku: "IPH-15-PM-256",
        brand: "Apple",
        images: ["https://images.unsplash.com/photo-1592286927505-c0d0c1b6e7f1?w=500", "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500"],
        stock: 50,
        isActive: true,
        createdAt: new Date()
      },
      {
        title: "Samsung Galaxy S24 Ultra",
        description: "Samsung flagship phone with 200MP camera, S Pen, 12GB RAM, 512GB storage, and stunning display.",
        price: 1299,
        category: ["Electronics", "Smartphones"],
        categoryId: [categories.insertedIds["0"], categories.insertedIds["2"]],
        salePrice: null,
        sku: "SAM-S24U-512",
        brand: "Samsung",
        images: ["https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=500"],
        stock: 35,
        isActive: true,
        createdAt: new Date()
      },
      {
        title: "iPad Air 5th Gen",
        description: "iPad Air with M1 chip, 10.9\" Liquid Retina display, 256GB storage. Perfect for productivity and entertainment.",
        price: 749,
        category: ["Electronics", "Tablets"],
        categoryId: [categories.insertedIds["0"], categories.insertedIds["3"]],
        salePrice: 699,
        sku: "IPAD-AIR-M1-256",
        brand: "Apple",
        images: ["https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500"],
        stock: 40,
        isActive: true,
        createdAt: new Date()
      },
      {
        title: "Sony WH-1000XM5 Headphones",
        description: "Industry-leading noise canceling wireless headphones with premium sound quality and 30-hour battery life.",
        price: 399,
        category: ["Electronics", "Accessories"],
        categoryId: [categories.insertedIds["0"], categories.insertedIds["9"]],
        salePrice: 349,
        sku: "SONY-WH1000XM5",
        brand: "Sony",
        images: ["https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500"],
        stock: 60,
        isActive: true,
        createdAt: new Date()
      },
      {
        title: "Dell XPS 15",
        description: "Premium laptop with Intel i7-13700H, 16GB RAM, 512GB SSD, and stunning 15.6\" OLED display.",
        price: 1699,
        category: ["Electronics", "Computers & Laptops"],
        categoryId: [categories.insertedIds["0"], categories.insertedIds["1"]],
        salePrice: 1599,
        sku: "DELL-XPS15-512",
        brand: "Dell",
        images: ["https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500"],
        stock: 20,
        isActive: true,
        createdAt: new Date()
      },
      {
        title: "Dyson V15 Detect",
        description: "Powerful cordless vacuum with laser detection, intelligent suction, and up to 60 minutes runtime.",
        price: 749,
        category: ["Home Appliances"],
        categoryId: [categories.insertedIds["4"]],
        salePrice: 699,
        sku: "DYSON-V15-DET",
        brand: "Dyson",
        images: ["https://images.unsplash.com/photo-1558317374-067fb5f30001?w=500"],
        stock: 30,
        isActive: true,
        createdAt: new Date()
      },
      {
        title: "Nespresso Vertuo Next",
        description: "Premium coffee maker with one-touch brewing, produces barista-quality coffee and espresso.",
        price: 199,
        category: ["Home Appliances"],
        categoryId: [categories.insertedIds["4"]],
        salePrice: 179,
        sku: "NESP-VERT-NEXT",
        brand: "Nespresso",
        images: ["https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=500"],
        stock: 45,
        isActive: true,
        createdAt: new Date()
      },
      {
        title: "Men's Classic Denim Jacket",
        description: "Timeless denim jacket made from premium cotton. Perfect for casual wear in any season.",
        price: 89,
        category: ["Fashion", "Men's Clothing"],
        categoryId: [categories.insertedIds["5"], categories.insertedIds["6"]],
        salePrice: 69,
        sku: "MEN-DENIM-JKT-BL",
        brand: "Levi's",
        images: ["https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500"],
        stock: 100,
        isActive: true,
        createdAt: new Date()
      },
      {
        title: "Women's Floral Summer Dress",
        description: "Beautiful floral pattern summer dress, lightweight and comfortable for warm weather.",
        price: 79,
        category: ["Fashion", "Women's Clothing"],
        categoryId: [categories.insertedIds["5"], categories.insertedIds["7"]],
        salePrice: 59,
        sku: "WOM-FLORAL-DRS-01",
        brand: "Zara",
        images: ["https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500"],
        stock: 80,
        isActive: true,
        createdAt: new Date()
      },
      {
        title: "Nike Air Max 270",
        description: "Iconic Nike Air Max sneakers with maximum cushioning and style. Available in multiple colors.",
        price: 150,
        category: ["Fashion", "Shoes"],
        categoryId: [categories.insertedIds["5"], categories.insertedIds["8"]],
        salePrice: 129,
        sku: "NIKE-AM270-BLK",
        brand: "Nike",
        images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500"],
        stock: 120,
        isActive: true,
        createdAt: new Date()
      },
      {
        title: "Ray-Ban Aviator Sunglasses",
        description: "Classic aviator sunglasses with polarized lenses and UV protection. Timeless style.",
        price: 165,
        category: ["Fashion", "Accessories"],
        categoryId: [categories.insertedIds["5"], categories.insertedIds["9"]],
        salePrice: 149,
        sku: "RAY-AVI-GOLD",
        brand: "Ray-Ban",
        images: ["https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500"],
        stock: 75,
        isActive: true,
        createdAt: new Date()
      },
      {
        title: "Yoga Mat Premium",
        description: "Extra thick yoga mat with non-slip surface, perfect for yoga, pilates, and fitness exercises.",
        price: 39,
        category: ["Sports & Outdoors"],
        categoryId: [categories.insertedIds["10"]],
        salePrice: 29,
        sku: "YOGA-MAT-PREM-PUR",
        brand: "Manduka",
        images: ["https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500"],
        stock: 150,
        isActive: true,
        createdAt: new Date()
      },
      {
        title: "Adjustable Dumbbell Set",
        description: "Space-saving adjustable dumbbells, 5-52.5 lbs per dumbbell. Perfect for home gym.",
        price: 299,
        category: ["Sports & Outdoors"],
        categoryId: [categories.insertedIds["10"]],
        salePrice: 279,
        sku: "DUMB-ADJ-SET-52",
        brand: "Bowflex",
        images: ["https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=500"],
        stock: 40,
        isActive: true,
        createdAt: new Date()
      },
      {
        title: "The Art of Programming",
        description: "Comprehensive guide to modern programming practices, algorithms, and software design patterns.",
        price: 49,
        category: ["Books"],
        categoryId: [categories.insertedIds["11"]],
        salePrice: 39,
        sku: "BOOK-ART-PROG-01",
        brand: "O'Reilly",
        images: ["https://images.unsplash.com/photo-1532012197267-da84d127e765?w=500"],
        stock: 200,
        isActive: true,
        createdAt: new Date()
      },
      {
        title: "LEGO Star Wars Millennium Falcon",
        description: "Iconic LEGO set with 7500+ pieces. Build the legendary Millennium Falcon from Star Wars.",
        price: 849,
        category: ["Toys & Games"],
        categoryId: [categories.insertedIds["12"]],
        salePrice: 799,
        sku: "LEGO-SW-MF-7541",
        brand: "LEGO",
        images: ["https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=500"],
        stock: 15,
        isActive: true,
        createdAt: new Date()
      },
      {
        title: "Vitamin C Serum",
        description: "Premium vitamin C serum for face. Anti-aging, brightening, and hydrating properties.",
        price: 29,
        category: ["Health & Beauty"],
        categoryId: [categories.insertedIds["13"]],
        salePrice: 24,
        sku: "VITC-SERUM-30ML",
        brand: "The Ordinary",
        images: ["https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500"],
        stock: 300,
        isActive: true,
        createdAt: new Date()
      },
      {
        title: "Electric Toothbrush Pro",
        description: "Smart electric toothbrush with pressure sensor, 5 cleaning modes, and 2-week battery life.",
        price: 129,
        category: ["Health & Beauty"],
        categoryId: [categories.insertedIds["13"]],
        salePrice: 99,
        sku: "ORAL-B-PRO-9000",
        brand: "Oral-B",
        images: ["https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=500"],
        stock: 90,
        isActive: true,
        createdAt: new Date()
      }
    ];

    const products = await productsCol.insertMany(productsData);

    console.log(`📦 Products seeded: ${products.insertedCount}`);

    // ==============================
    // Addresses
    // ==============================
    const addressesData = [
      {
        userId: users.insertedIds["1"],
        line1: "123 Main Street",
        line2: "Apt 4B",
        city: "New York",
        state: "NY",
        postalCode: "10001",
        createdAt: new Date()
      },
      {
        userId: users.insertedIds["1"],
        line1: "456 Oak Avenue",
        line2: "",
        city: "Brooklyn",
        state: "NY",
        postalCode: "11201",
        createdAt: new Date()
      },
      {
        userId: users.insertedIds["2"],
        line1: "789 Pine Road",
        line2: "Suite 200",
        city: "Los Angeles",
        state: "CA",
        postalCode: "90001",
        createdAt: new Date()
      },
      {
        userId: users.insertedIds["3"],
        line1: "321 Elm Street",
        line2: "",
        city: "Chicago",
        state: "IL",
        postalCode: "60601",
        createdAt: new Date()
      },
      {
        userId: users.insertedIds["4"],
        line1: "654 Maple Drive",
        line2: "Unit 12",
        city: "Houston",
        state: "TX",
        postalCode: "77001",
        createdAt: new Date()
      }
    ];

    const addresses = await addressesCol.insertMany(addressesData);

    console.log(`🏠 Addresses seeded: ${addresses.insertedCount}`);

    // ==============================
    // Cart
    // ==============================
    const carts = await cartsCol.insertMany([
      {
        userId: users.insertedIds["1"],
        items: [
          { productId: products.insertedIds["1"], quantity: 1 },
          { productId: products.insertedIds["4"], quantity: 2 }
        ],
        createdAt: new Date()
      },
      {
        userId: users.insertedIds["2"],
        items: [
          { productId: products.insertedIds["0"], quantity: 1 },
          { productId: products.insertedIds["8"], quantity: 3 }
        ],
        createdAt: new Date()
      },
      {
        userId: users.insertedIds["3"],
        items: [
          { productId: products.insertedIds["10"], quantity: 2 },
          { productId: products.insertedIds["12"], quantity: 1 }
        ],
        createdAt: new Date()
      }
    ]);

    console.log(`🛒 Carts seeded: ${carts.insertedCount}`);

    // ==============================
    // Orders
    // ==============================
    const ordersData = [
      {
        userId: users.insertedIds["1"],
        items: [
          {
            productId: products.insertedIds["0"],
            title: productsData[0].title,
            quantity: 1,
            price: productsData[0].salePrice || productsData[0].price
          }
        ],
        totalAmount: 2299,
        status: "delivered",
        shippingAddress: {
          line1: addressesData[0].line1,
          line2: addressesData[0].line2,
          city: addressesData[0].city,
          state: addressesData[0].state,
          postalCode: addressesData[0].postalCode
        },
        createdAt: new Date()
      },
      {
        userId: users.insertedIds["2"],
        items: [
          {
            productId: products.insertedIds["2"],
            title: productsData[2].title,
            quantity: 1,
            price: productsData[2].price
          },
          {
            productId: products.insertedIds["4"],
            title: productsData[4].title,
            quantity: 1,
            price: productsData[4].salePrice || productsData[4].price
          }
        ],
        totalAmount: 1648,
        status: "shipped",
        shippingAddress: {
          line1: addressesData[2].line1,
          line2: addressesData[2].line2,
          city: addressesData[2].city,
          state: addressesData[2].state,
          postalCode: addressesData[2].postalCode
        },
        createdAt: new Date()
      },
      {
        userId: users.insertedIds["3"],
        items: [
          {
            productId: products.insertedIds["10"],
            title: productsData[10].title,
            quantity: 2,
            price: productsData[10].salePrice || productsData[10].price
          }
        ],
        totalAmount: 258,
        status: "processing",
        shippingAddress: {
          line1: addressesData[3].line1,
          line2: addressesData[3].line2,
          city: addressesData[3].city,
          state: addressesData[3].state,
          postalCode: addressesData[3].postalCode
        },
        createdAt: new Date()
      },
      {
        userId: users.insertedIds["4"],
        items: [
          {
            productId: products.insertedIds["15"],
            title: productsData[15].title,
            quantity: 1,
            price: productsData[15].salePrice || productsData[15].price
          }
        ],
        totalAmount: 799,
        status: "pending",
        shippingAddress: {
          line1: addressesData[4].line1,
          line2: addressesData[4].line2,
          city: addressesData[4].city,
          state: addressesData[4].state,
          postalCode: addressesData[4].postalCode
        },
        createdAt: new Date()
      }
    ];

    const orders = await ordersCol.insertMany(ordersData);

    console.log(`📦 Orders seeded: ${orders.insertedCount}`);

    // ==============================
    // Payments
    // ==============================
    const txnBase = Date.now();
    const payments = await paymentsCol.insertMany([
      {
        userId: users.insertedIds["1"],
        orderId: orders.insertedIds["0"],
        amount: 2299,
        provider: "stripe",
        status: "completed",
        transactionId: `TXN-${txnBase}-001`,
        createdAt: new Date()
      },
      {
        userId: users.insertedIds["2"],
        orderId: orders.insertedIds["1"],
        amount: 1648,
        provider: "paypal",
        status: "completed",
        transactionId: `TXN-${txnBase}-002`,
        createdAt: new Date()
      },
      {
        userId: users.insertedIds["3"],
        orderId: orders.insertedIds["2"],
        amount: 258,
        provider: "razorpay",
        status: "pending",
        transactionId: `TXN-${txnBase}-003`,
        createdAt: new Date()
      }
    ]);

    console.log(`💳 Payments seeded: ${payments.insertedCount}`);

    // ==============================
    // Reviews
    // ==============================
    const reviews = await reviewsCol.insertMany([
      {
        productId: products.insertedIds["0"],
        userId: users.insertedIds["1"],
        rating: 5,
        comment: "Absolutely love this MacBook! The M2 Pro chip is incredibly fast and the display is stunning. Perfect for video editing.",
        createdAt: new Date()
      },
      {
        productId: products.insertedIds["0"],
        userId: users.insertedIds["2"],
        rating: 4,
        comment: "Great laptop but quite expensive. Performance is top-notch though!",
        createdAt: new Date()
      },
      {
        productId: products.insertedIds["1"],
        userId: users.insertedIds["3"],
        rating: 5,
        comment: "Best iPhone yet! The camera quality is amazing and the titanium build feels premium.",
        createdAt: new Date()
      },
      {
        productId: products.insertedIds["2"],
        userId: users.insertedIds["2"],
        rating: 5,
        comment: "The S Pen integration is fantastic. Best Android phone on the market!",
        createdAt: new Date()
      },
      {
        productId: products.insertedIds["4"],
        userId: users.insertedIds["1"],
        rating: 5,
        comment: "These headphones are worth every penny. Noise cancellation is incredible!",
        createdAt: new Date()
      },
      {
        productId: products.insertedIds["4"],
        userId: users.insertedIds["4"],
        rating: 4,
        comment: "Great sound quality and comfortable to wear for long periods.",
        createdAt: new Date()
      },
      {
        productId: products.insertedIds["6"],
        userId: users.insertedIds["3"],
        rating: 5,
        comment: "Best vacuum I've ever owned. The laser detection feature is amazing!",
        createdAt: new Date()
      },
      {
        productId: products.insertedIds["8"],
        userId: users.insertedIds["4"],
        rating: 4,
        comment: "Good quality denim jacket. Fits well and looks great!",
        createdAt: new Date()
      },
      {
        productId: products.insertedIds["10"],
        userId: users.insertedIds["1"],
        rating: 5,
        comment: "Super comfortable sneakers. Great for everyday wear and running.",
        createdAt: new Date()
      },
      {
        productId: products.insertedIds["12"],
        userId: users.insertedIds["2"],
        rating: 5,
        comment: "Best yoga mat I've used. Non-slip and very comfortable!",
        createdAt: new Date()
      },
      {
        productId: products.insertedIds["15"],
        userId: users.insertedIds["3"],
        rating: 5,
        comment: "Amazing LEGO set! Took a while to build but absolutely worth it.",
        createdAt: new Date()
      },
      {
        productId: products.insertedIds["17"],
        userId: users.insertedIds["4"],
        rating: 5,
        comment: "This toothbrush has improved my oral health significantly. Highly recommend!",
        createdAt: new Date()
      }
    ]);

    console.log(`⭐ Reviews seeded: ${reviews.insertedCount}`);

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
  await seedDatabase();
})();
