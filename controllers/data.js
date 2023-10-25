const mongoose = require("mongoose");
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;
const CategoryController = require("./category");
const Data = require("../models/Data");

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
    res.status(500).json({ error: "Error retrieving data" });
  }
};

exports.uploadData = async (req, res) => {
  try {
    const buffer = req.file.buffer.toString();
    const records = [];

    fs.createReadStream(buffer)
      .pipe(csvParser())
      .on("data", (row) => {
        records.push(row);
      })
      .on("end", async () => {
        const uniqueField = "name"; // Specify the field to determine uniqueness

        const bulkOps = records.map((record) => ({
          updateOne: {
            filter: { [uniqueField]: record[uniqueField] },
            update: { $set: record },
            upsert: true, // Insert if not found, update if found
          },
        }));

        await Data.bulkWrite(bulkOps);

        // Process the data and handle categories and sub-categories
        await CategoryController.processData(records);

        res.status(200).send("CSV data uploaded successfully.");
      });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error uploading CSV data.");
  }
};
