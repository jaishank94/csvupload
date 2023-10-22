const { generateToken } = require("../helpers/tokens");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if a user with the provided username and isAdmin set to true exists
    const adminUser = await User.findOne({ username, isAdmin: true });

    if (!adminUser) {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    const check = await bcrypt.compare(password, adminUser.password);

    if (!check) {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    const token = generateToken({ id: adminUser._id.toString() }, "7d");
    res.send({
      id: adminUser._id,
      username: adminUser.username,
      picture: adminUser.picture,
      first_name: adminUser.first_name,
      last_name: adminUser.last_name,
      gender: adminUser.gender,
      balance: adminUser.balance,
      accessToken: token,
      isAdmin: true,
      verified: adminUser.verified,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};
