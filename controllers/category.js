const Category = require("../models/Category");

// Create or update a category and sub-category
exports.processData = async (records) => {
  try {
    const allCategories = [];
    const allSubcategories = [];
    for (const record of records) {
      const categories = record.category
        .split(",")
        .map((category) => category.trim());
      const subcategories = record.subcategory
        .split(",")
        .map((subcategory) => subcategory.trim());

      allCategories.push(...categories);
      allSubcategories.push(...subcategories);

      for (const category of categories) {
        const existingCategory = await Category.findOne({ name: category });
        if (existingCategory) {
          // Category exists, update or add sub-categories
          for (const subcategory of subcategories) {
            const subCategoryIndex = existingCategory.subCategories.findIndex(
              (sub) => sub.name === subcategory
            );
            if (subCategoryIndex !== -1) {
              // Sub-category exists, update it
              existingCategory.subCategories[subCategoryIndex].name =
                subcategory;
            } else {
              // Sub-category doesn't exist, create it
              existingCategory.subCategories.push({ name: subcategory });
            }
          }

          await existingCategory.save();
        } else {
          // Category doesn't exist, create it and sub-categories
          const newCategory = new Category({
            name: category,
            subCategories: subcategories.map((subcategory) => ({
              name: subcategory,
            })),
          });
          await newCategory.save();
        }
      }
    }

    // Remove categories not present in the response
    const existingCategories = await Category.find({});
    for (const existingCategory of existingCategories) {
      if (!allCategories.includes(existingCategory.name)) {
        await Category.findOneAndDelete({ name: existingCategory.name });
      } else {
        // Remove subcategories not present in the response
        existingCategory.subCategories = existingCategory.subCategories.filter(
          (sub) => allSubcategories.includes(sub.name)
        );
        await existingCategory.save();
      }
    }
  } catch (error) {
    throw error;
  }
};
