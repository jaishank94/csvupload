const mongoose = require("mongoose");
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;
const CategoryController = require("./category");
const Data = require("../models/Data");
const Category = require("../models/Category");
const csv = require("csvtojson");

// Retrieve category data with pagination and search
exports.getCategoryData = async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } }, // Case-insensitive name search
        { "subCategories.name": { $regex: new RegExp(search, "i") } },
      ];
    }

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
    };

    // const result = await Category.paginate(query, options);
    const result = await Category.find(query);

    res.json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error retrieving data" });
  }
};

// Retrieve data with pagination and search
exports.getData = async (req, res) => {
  try {
    const { page, limit, search, category, subcategory, sortField, sortOrder } =
      req.body;
    const query = {};

    const integerFields = [
      "TotalFundingAmountMUSD",
      "Valuation",
      "LastFundingAmountMUSD",
    ];

    if (search && Array.isArray(search) && search.length > 0) {
      // Initialize the query with logical AND conditions
      query.$and = search.map((column) => {
        // Initialize each condition with logical AND conditions for multiple key-value pairs
        return {
          $and: Object.entries(column).map(([key, value]) => {
            return integerFields.includes(key)
              ? { [key]: { $gte: parseInt(value) } }
              : { [key]: { $regex: value, $options: "i" } }; // Perform an exact match
          }),
        };
      });
    }

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      // sort: {
      //   [sortField || "Valuation"]: -1,
      // },
    };

    if (category) {
      // query.category = category;
      query.category = { $in: category.split(",") };
    }

    if (subcategory) {
      // query.subcategory = subcategory;
      query.subcategory = { $in: subcategory.split(",") };
    }

    console.log("options", options);
    console.log("query", query);

    const result = await Data.paginate(query, options);

    // Ensure the pagination starts at the correct point based on the page number
    const totalCount = await Data.countDocuments(query);
    const totalPages = Math.ceil(totalCount / options.limit);

    result.totalCount = totalCount;
    result.currentPage = options.page;
    result.totalPages = totalPages;

    res.json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error retrieving data" });
  }
};

exports.uploadData = async (req, res) => {
  try {
    // const buffer = req.file.buffer.toString();
    const records = [];
    let schemaFields = {};

    csv()
      .fromFile(req.file.path)
      .then(async (response) => {
        records.push(response);
        // Collect unique keys (columns) from the CSV as fields for the schema
        for (const key of Object.keys(response[0])) {
          schemaFields[key] = String; // You can set the data type as needed
        }

        // Specify the fields that should be parsed as integers
        const integerFields = [
          "TotalFundingAmountMUSD",
          "Valuation",
          "LastFundingAmountMUSD",
        ];

        // Update the schema with the new fields from the CSV
        const schema = Data.schema;
        for (const key in schemaFields) {
          if (key === "category" || key === "subcategory") continue;
          if (integerFields.includes(key)) {
            schema.add({ [key]: Number });
          } else {
            schema.add({ [key]: schemaFields[key] });
          }
        }

        const uniqueField = "name"; // Specify the field to determine uniqueness

        // await Data.insertMany(response);

        // const bulkOps = response.map((record) => ({
        //   updateOne: {
        //     filter: { [uniqueField]: record[uniqueField] },
        //     update: { $set: record },
        //     upsert: true, // Insert if not found, update if found
        //   },
        // }));

        const bulkOps = response.map((record) => {
          // Modify category and subcategory fields to save as arrays split by comma
          const updatedRecord = {
            ...record,
            category: record.category
              ? record.category.split(",").map((category) => category.trim())
              : [],
            subcategory: record.subcategory
              ? record.subcategory
                  .split(",")
                  .map((subcategory) => subcategory.trim())
              : [],
          };
          return {
            updateOne: {
              filter: { [uniqueField]: record[uniqueField] },
              update: { $set: updatedRecord },
              upsert: true,
            },
          };
        });

        // Find and delete records that are not present in the CSV
        const uniqueValuesInCSV = response.map((record) => record[uniqueField]);
        await Data.deleteMany({ [uniqueField]: { $nin: uniqueValuesInCSV } });

        await Data.bulkWrite(bulkOps);
        await CategoryController.processData(response);
        res.status(200).send("CSV data uploaded successfully.");
      });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error uploading CSV data.");
  }
};
