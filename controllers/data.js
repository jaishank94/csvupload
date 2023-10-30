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
    const { page, limit, search } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } }, // Case-insensitive name search
        { valuation: parseFloat(search) || 0 }, // Search for numbers in valuation
      ];
    }

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
    };

    const result = await Data.paginate(query, options);

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

        // Update the schema with the new fields from the CSV
        const schema = Data.schema;
        for (const key in schemaFields) {
          schema.add({ [key]: schemaFields[key] });
        }

        const uniqueField = "name"; // Specify the field to determine uniqueness

        // await Data.insertMany(response);

        const bulkOps = response.map((record) => ({
          updateOne: {
            filter: { [uniqueField]: record[uniqueField] },
            update: { $set: record },
            upsert: true, // Insert if not found, update if found
          },
        }));
        await Data.bulkWrite(bulkOps);
        // let i = 1;
        // for (const record of response) {
        //   console.log(record);
        //   // Create or update the data entry
        //   await Data.updateOne(
        //     { [uniqueField]: record[uniqueField] }, // Replace with your unique field
        //     { $set: record },
        //     { upsert: true }
        //   );

        //   // Process the data and handle categories and sub-categories
        //   i++;
        // }
        await CategoryController.processData(response);
        res.status(200).send("CSV data uploaded successfully.");
      });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error uploading CSV data.");
  }
};
