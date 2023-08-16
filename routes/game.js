const express = require("express");
const {
  createGame,
  getAllGames,
  saveGame,
  saveGamer,
  deleteGame,
  getGamer,
  searchGame,
} = require("../controllers/game");
const { authUser } = require("../middlwares/auth");

const router = express.Router();

router.post("/createGame", authUser, createGame);
router.post("/getAllGames", getAllGames);
router.put("/saveGame/:id", authUser, saveGame);
router.put("/saveGamer/:id", authUser, saveGamer);
router.delete("/deleteGame/:id", authUser, deleteGame);
router.post("/searchGame/:searchTerm", searchGame);
router.get("/getGamer/:gameId", getGamer);

module.exports = router;
