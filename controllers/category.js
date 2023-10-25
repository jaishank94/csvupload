const Category = require("../models/Category");

// Create or update a category and sub-category
exports.processData = async (records) => {
  try {
    for (const record of records) {
      const category = await Category.findOne({ name: record.category });
      if (category) {
        // Category exists, check and update sub-category
        const subCategoryIndex = category.subCategories.findIndex(
          (sub) => sub.name === record.subcategory
        );
        if (subCategoryIndex !== -1) {
          // Sub-category exists, update it
          category.subCategories[subCategoryIndex].name = record.subcategory;
        } else {
          // Sub-category doesn't exist, delete it if found
          const subCategoryToRemove = category.subCategories.find(
            (sub) => sub.name === record.subcategory
          );
          if (subCategoryToRemove) {
            category.subCategories.pull(subCategoryToRemove);
          }
          // Create a new sub-category entry
          category.subCategories.push({ name: record.subcategory });
        }
        await category.save();
      } else {
        // Category doesn't exist, create it and sub-category
        const newCategory = new Category({
          name: record.category,
          subCategories: [{ name: record.subcategory }],
        });
        await newCategory.save();
      }
    }
  } catch (error) {
    throw error;
  }
};
