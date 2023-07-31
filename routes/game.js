const express = require("express");
const {
  createGame,
  getAllGames,
  comment,
  saveGame,
  deleteGame,
  getGamer,
  searchGame,
} = require("../controllers/game");
const { authUser } = require("../middlwares/auth");

const router = express.Router();

router.post("/createGame", authUser, createGame);
router.get("/getAllGames", getAllGames);
router.put("/comment", comment);
router.put("/saveGame/:id", authUser, saveGame);
router.delete("/deleteGame/:id", authUser, deleteGame);
router.post("/searchGame/:searchTerm", searchGame);
router.get("/getGamer/:gameId", getGamer);

module.exports = router;
