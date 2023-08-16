const Auction = require("../models/Auction");
const User = require("../models/User");

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
    const { amount, image, auctionId } = req.body;
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
