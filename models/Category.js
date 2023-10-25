const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true, // Ensures uniqueness
  },
  subCategories: [
    {
      name: String,
      // Add other sub-category fields here
    },
  ],
});

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
