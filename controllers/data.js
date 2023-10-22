const mongoose = require("mongoose");
const { Schema } = mongoose;
const ObjectId = Schema.Types.ObjectId;

const dataSchema = new Schema({
  name: String,
  valuation: Number,
  // Add other fields here
});

const Data = mongoose.model("Data", dataSchema);

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
    if (!client.isConnected()) {
      await client.connect();
    }

    const database = client.db();
    const collection = database.collection("your-collection-name");

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

        await collection.bulkWrite(bulkOps);
        res.status(200).send("CSV data uploaded successfully.");
      });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error uploading CSV data.");
  }
};
