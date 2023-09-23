const { v4: uuidv4 } = require("uuid");

function generateUniqueID() {
  // Generate a unique  ID
  const id = uuidv4();

  return id;
}

module.exports = generateUniqueID;
