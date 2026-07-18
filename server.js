require("dotenv").config();

const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const methodOverride = require("method-override");
const session = require("express-session");
const expressLayouts = require("express-ejs-layouts");

const connectDB = require("./config/db");
const seedAdmin = require("./utils/seedAdmin");
const seedSettings = require("./utils/seedSettings");
const seedCatalogData = require("./utils/seedCatalogData");
const { attachUser } = require("./middleware/authMiddleware");
const { notFoundHandler, errorHandler } = require("./middleware/errorMiddleware");
const authService = require("./services/authService");

const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const accessoryRoutes = require("./routes/accessoryRoutes");
const orderRoutes = require("./routes/orderRoutes");
const userRoutes = require("./routes/userRoutes");
const financeRoutes = require("./routes/financeRoutes");
const noteRoutes = require("./routes/noteRoutes");

const app = express();
const port = process.env.PORT || 3000;
const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
});
const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short"
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", "layouts/main");

app.use(expressLayouts);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(methodOverride("_method"));
app.use(
  session({
    secret: process.env.JWT_SECRET || "session-secret",
    resave: false,
    saveUninitialized: false
  })
);
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  res.locals.success = req.session.success || null;
  res.locals.error = req.session.error || null;
  res.locals.formatCurrency = (value) => vndFormatter.format(Number(value) || 0);
  res.locals.formatDateTime = (value) => {
    if (!value) {
      return "-";
    }

    return dateTimeFormatter.format(new Date(value));
  };
  delete req.session.success;
  delete req.session.error;
  next();
});

app.use(attachUser);

app.get("/", (req, res) => {
  if (req.user) {
    return res.redirect(authService.getDefaultRouteForUser(req.user));
  }

  return res.redirect("/auth/login");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/categories", categoryRoutes);
app.use("/products", productRoutes);
app.use("/accessories", accessoryRoutes);
app.use("/orders", orderRoutes);
app.use("/finance", financeRoutes);
app.use("/notes", noteRoutes);
app.use("/cash", (req, res) => res.redirect("/users"));
app.use("/users", userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  await connectDB();
  const admin = await seedAdmin();
  await seedSettings();
  await seedCatalogData(admin);

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
