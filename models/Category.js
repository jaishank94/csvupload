const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

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

// Apply the pagination plugin
categorySchema.plugin(mongoosePaginate);

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
