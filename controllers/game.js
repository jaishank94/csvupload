const Game = require("../models/Game");
const User = require("../models/User");

exports.createGame = async (req, res) => {
  try {
    const game = await new Game(req.body).save();
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

exports.getGamer = async (req, res) => {
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
    const { infos } = req.body;
    const gameId = req.params.id;

    const updated = await Game.findByIdAndUpdate(
      gameId,
      {
        name: infos.name,
      },
      {
        picture: infos.picture,
      }
    );
    res.json(updated.details);
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
