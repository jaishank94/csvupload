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
} = require("../controllers/game");
const { authUser } = require("../middlwares/auth");

const router = express.Router();

router.post("/createGame", authUser, createGame);
router.get("/getAllGames", getAllGames);
router.put("/saveGame/:id", authUser, saveGame);
router.put("/saveGamer/:id", authUser, saveGamer);
router.delete("/deleteGame/:id", authUser, deleteGame);
router.post("/searchGame/:searchTerm", searchGame);
router.get("/getGameDetails/:gameId", getGameDetails);
router.get("/getGamers", getGamers);

module.exports = router;
