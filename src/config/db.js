require('dotenv').config();
const mongoose = require("mongoose");


mongoose.connect(process.env.MONGO_URL)
mongoose.connection.on("connected", () => {
  console.log("MongoDB connection established");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});