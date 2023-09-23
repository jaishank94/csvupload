const express = require("express");
const {
  createGame,
  getAllGames,
  saveGame,
  saveGamer,
  deleteGame,
  getGamers,
  getGameDetails,
  searchGame,
  saveGamerInfo,
  getUserGames,
} = require("../controllers/game");
const { authUser } = require("../middlwares/auth");

const router = express.Router();

router.post("/createGame", authUser, createGame);
router.get("/getAllGames", getAllGames);
router.put("/saveGame/:id", authUser, saveGame);
router.put("/saveGamer/:id", authUser, saveGamer);
router.post("/gamers/save", authUser, saveGamerInfo);
router.get("/gamers/:username", authUser, getUserGames);
router.delete("/deleteGame/:id", authUser, deleteGame);
router.post("/searchGame/:searchTerm", searchGame);
router.get("/getGameDetails/:gameId", getGameDetails);
router.get("/getGamers", getGamers);

module.exports = router;
