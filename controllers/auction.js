const Auction = require("../models/Auction");
const User = require("../models/User");
const Game = require("../models/Game");
const Rating = require("../models/Rating");
const mongoose = require("mongoose");

exports.createAuction = async (req, res) => {
  try {
    const auction = await new Auction(req.body).save();
    await auction.populate(
      "user",
      "first_name last_name cover picture username"
    );
    await auction.populate("game", "name picture");
    res.json(auction);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
exports.getAllAuctions = async (req, res) => {
  try {
    // const followingTemp = await User.findById(req.user.id).select("following");
    // const following = followingTemp.following;
    // const promises = following.map((user) => {
    //   return Auction.find({ user: user })
    //     .populate("user", "first_name last_name picture username cover")
    //     .populate("comments.commentBy", "first_name last_name picture username")
    //     .sort({ createdAt: -1 })
    //     .limit(10);
    // });
    // const followingPosts = await (await Promise.all(promises)).flat();
    const allAuctions = [];

    const { status } = req.body;

    const auctions = await Auction.find({ status })
      .populate("user", "first_name last_name picture username cover")
      .populate("game", "name picture")
      .populate("bids.bidBy", "first_name last_name picture username")
      .sort({ createdAt: -1 })
      .limit(10);
    allAuctions.push(...[...auctions]);
    allAuctions.sort((a, b) => {
      return b.createdAt - a.createdAt;
    });
    res.json(allAuctions);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.bid = async (req, res) => {
  try {
    const { amount, image, auctionId, userId } = req.body;
    // const { userId } = req.user;

    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({ error: "Auction not found" });
    }

    if (auction.status !== "ACTIVE") {
      return res.status(400).json({ error: "Auction is not in progress" });
    }

    const user = await User.findById(userId);

    if (!user.balance || user?.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Block the bid amount in the user's wallet
    user.balance -= amount;
    user.blockedBalance += amount;

    // Save the user's updated balances
    await user.save();

    // Add the bid to the auction's bids array
    let newBids = await Auction.findByIdAndUpdate(
      auctionId,
      {
        $push: {
          bids: {
            amount: amount,
            image: image,
            bidBy: req.user.id,
            bidAt: new Date(),
          },
        },
      },
      {
        new: true,
      }
    ).populate("bids.bidBy", "picture first_name last_name username");
    res.json(newBids.bids);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Function to release blocked bids
exports.releaseBids = async (bids) => {
  for (const bid of bids) {
    const user = await User.findById(bid.user);
    user.blockedBalance -= bid.amount;
    user.balance += bid.amount;
    await user.save();
  }
};

exports.saveAuction = async (req, res) => {
  try {
    const auctionId = req.params.id;
    const user = await User.findById(req.user.id);
    const check = user?.savedAuctions.find(
      (auction) => auction.auction.toString() == auctionId
    );
    if (check) {
      await User.findByIdAndUpdate(req.user.id, {
        $pull: {
          savedAuctions: {
            _id: check._id,
          },
        },
      });
    } else {
      await User.findByIdAndUpdate(req.user.id, {
        $push: {
          savedAuctions: {
            auction: auctionId,
            savedAt: new Date(),
          },
        },
      });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.deleteAuction = async (req, res) => {
  try {
    await Auction.findByIdAndRemove(req.params.id);
    res.json({ status: "ok" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.searchAuctions = async (req, res) => {
  try {
    const {
      id,
      playerId,
      expiryTime,
      priceToEnter,
      status,
      gameId,
      page,
      limit,
      sortBy,
      gender,
    } = req.query;

    const user = await User.findById(playerId);
    const game = await Game.findById(gameId);

    let query = Auction.find();

    // Apply filters
    if (id) {
      query = query.where("_id").equals(id);
    }
    if (playerId) {
      query = query.where("playerId").equals(user);
    }
    if (expiryTime) {
      query = query.where("expiryTime").equals(new Date(expiryTime));
    }
    if (priceToEnter) {
      query = query.where("priceToEnter").equals(priceToEnter);
    }
    if (status) {
      query = query.where("status").equals(status);
    }
    if (gameId) {
      query = query.where("gameId").equals(game);
    }
    if (gender) {
      query = query.where("gender").equals(gender);
    }

    // Apply sorting
    if (sortBy === "highestRated") {
      query = query.sort("-averageRating");
    } else if (sortBy === "lowestBasePrice") {
      query = query.sort("basePrice");
    } else if (sortBy === "highestBasePrice") {
      query = query.sort("-basePrice");
    }

    // Pagination
    const options = {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
    };

    const auctions = await Auction.paginate(query, options);

    res.json(auctions);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while searching auctions." });
  }
};

// Rate an auction
exports.createRating = async (req, res) => {
  try {
    const { userId, auctionId, rating } = req.body;

    // Check if the user has already rated this auction
    const existingRating = await Rating.findOne({
      user: userId,
      auction: auctionId,
    });

    if (existingRating) {
      return res
        .status(400)
        .json({ error: "User has already rated this auction." });
    }

    const newRating = new Rating({ user: userId, auction: auctionId, rating });
    await newRating.save();

    // Update the auction's ratings array
    await Auction.findByIdAndUpdate(auctionId, {
      $push: { ratings: newRating._id },
    });

    res.status(201).json(newRating);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getAuctionsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const auctions = await Auction.find({
      user: mongoose.Types.ObjectId(userId),
    })
      .populate("user", "first_name last_name username email") // Specify the fields you want to include from the User collection
      .populate("game", "name picture numberOfPayers description status");
    res.json(auctions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.updateAuction = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { userId } = req.user; // Get the logged-in user's ID from the JWT payload

    // Check if the logged-in user is the creator of the auction
    const auction = await Auction.findById(auctionId);
    if (auction.user.toString() !== userId) {
      return res
        .status(403)
        .json({ error: "You do not have permission to edit this auction" });
    }

    // Perform the update
    const updatedAuction = await Auction.findByIdAndUpdate(
      auctionId,
      req.body,
      { new: true }
    );

    res.json(updatedAuction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.cancelAuction = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { id } = req.user; // Get the logged-in user's ID from the JWT payload
    console.log("User", req.user);

    // Check if the logged-in user is the creator of the auction
    const auction = await Auction.findById(auctionId);

    if (auction.user.toString() !== id) {
      return res
        .status(403)
        .json({ error: "You do not have permission to cancel this auction" });
    }

    if (!auction) {
      return res.status(404).json({ error: "Auction not found" });
    }

    // Check if the auction is in progress
    if (auction.status === "ACTIVE") {
      // Release blocked bids if the auction is in progress
      await this.releaseBids(auction.bids);
    }

    // Perform the cancellation
    const updatedAuction = await Auction.findByIdAndUpdate(
      auctionId,
      { status: "Cancelled" },
      { new: true }
    );

    res.json(updatedAuction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};
