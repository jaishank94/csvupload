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
        // const category = await Category.findOne({ name: record.category });
        // if (category) {
        //   // Category exists, check and update sub-category
        //   const subCategoryIndex = category.subCategories.findIndex(
        //     (sub) => sub.name === record.subcategory
        //   );
        //   if (subCategoryIndex !== -1) {
        //     // Sub-category exists, update it
        //     category.subCategories[subCategoryIndex].name = record.subcategory;
        //   } else {
        //     // Sub-category doesn't exist, delete it if found
        //     const subCategoryToRemove = category.subCategories.find(
        //       (sub) => sub.name === record.subcategory
        //     );
        //     if (subCategoryToRemove) {
        //       category.subCategories.pull(subCategoryToRemove);
        //     }
        //     // Create a new sub-category entry
        //     category.subCategories.push({ name: record.subcategory });
        //   }
        //   await category.save();
        // } else {
        //   // Category doesn't exist, create it and sub-category
        //   const newCategory = new Category({
        //     name: record.category,
        //     subCategories: [{ name: record.subcategory }],
        //   });
        //   await newCategory.save();
        // }
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

          // Remove sub-categories that are not present in the current data
          // existingCategory.subCategories =
          //   existingCategory.subCategories.filter((sub) =>
          //     subcategories.includes(sub.name)
          //   );

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
