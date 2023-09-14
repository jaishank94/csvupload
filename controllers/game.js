const Game = require("../models/Game");
const User = require("../models/User");

exports.createGame = async (req, res) => {
  try {
    const game = await new Game(req.body).save();
    await game.populate("user", "first_name last_name cover picture username");
    res.json(game);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getAllGames = async (req, res) => {
  try {
    const results = await Game.find({ status: "ACTIVE", isActive: true });

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.searchGame = async (req, res) => {
  try {
    const searchTerm = req.params.searchTerm;
    const results = await Game.find({ $text: { $search: searchTerm } }).select(
      "name picture"
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getGamers = async (req, res) => {
  try {
    const gamers = await Game.aggregate([
      {
        $unwind: "$Gamers", // Unwind the Gamers array
      },
      {
        $lookup: {
          from: "users", // Assuming your user collection is named "users"
          localField: "Gamers.user",
          foreignField: "_id",
          as: "userDetails", // Alias for the user details
        },
      },
      {
        $project: {
          _id: 0, // Exclude the _id field if you don't need it
          username: { $arrayElemAt: ["$userDetails.username", 0] }, // Assuming "username" is a field in the User schema
          email: { $arrayElemAt: ["$userDetails.email", 0] }, // Assuming "email" is a field in the User schema
          picture: { $arrayElemAt: ["$userDetails.picture", 0] }, // Assuming "picture" is a field in the User schema
          first_name: { $arrayElemAt: ["$userDetails.first_name", 0] }, // Assuming "first_name" is a field in the User schema
          last_name: { $arrayElemAt: ["$userDetails.last_name", 0] }, // Assuming "last_name" is a field in the User schema
        },
      },
      {
        $group: {
          _id: "$username", // Group by username to get unique gamers
          userDetails: { $first: "$$ROOT" }, // Keep the user details for the first occurrence of each username
        },
      },
      {
        $replaceRoot: {
          newRoot: "$userDetails", // Replace the root with user details
        },
      },
    ]);

    if (!gamers) {
      return res.status(400).json({
        message: "Gamers does not exists.",
      });
    }
    res.json({ gamers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getGameDetails = async (req, res) => {
  try {
    const { gameId } = req.params;

    const game = await Game.findOne({ _id: gameId });

    if (!game) {
      return res.status(400).json({
        message: "Game does not exists.",
      });
    }
    res.json({ game });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.saveGame = async (req, res) => {
  try {
    const gameId = req.params.id;
    const user = await User.findById(req.user.id);
    const check = user?.savedGames.find(
      (game) => game.game.toString() == gameId
    );
    if (check) {
      await User.findByIdAndUpdate(req.user.id, {
        $pull: {
          savedGames: {
            _id: check._id,
          },
        },
      });
    } else {
      await User.findByIdAndUpdate(req.user.id, {
        $push: {
          savedGames: {
            game: gameId,
            savedAt: new Date(),
          },
        },
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.saveGamer = async (req, res) => {
  try {
    const gameId = req.params.id;
    const user = await User.findById(req.user.id);
    const game = await Game.findById(gameId);
    const check = game?.Gamers.find((user) => user.user.toString() == user);
    if (check) {
      await Game.findByIdAndUpdate(gameId, {
        $pull: {
          Gamers: {
            _id: check._id,
          },
        },
      });
    } else {
      await Game.findByIdAndUpdate(gameId, {
        $push: {
          Gamers: {
            user: user,
            savedAt: new Date(),
          },
        },
      });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.deleteGame = async (req, res) => {
  try {
    await Game.findByIdAndRemove(req.params.id);
    res.json({ status: "ok" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Save a game played by the user
exports.saveGamerInfo = async (req, res) => {
  try {
    // const { userId } = req.user;
    const { gameId, userId } = req.body;

    // Find the user
    const user = await User.findById(userId);

    // Check if the game already exists in the user's played games
    if (user.savedGames.some((game) => game.game.equals(gameId))) {
      return res.status(400).json({ error: "Game already saved" });
    }

    // Create a new game entry for the user
    user.savedGames.push({ game: gameId, savedAt: new Date() });
    await user.save();

    res.json({ message: "Game saved successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Retrieve the list of games played by the user
exports.getUserGames = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user and populate the savedGames with game details
    const user = await User.findById(userId).populate({
      path: "savedGames.game",
      model: "Game",
    });

    const userGames = user.savedGames.map((entry) => ({
      game: entry.game,
      savedAt: entry.savedAt,
    }));

    res.json(userGames);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};
