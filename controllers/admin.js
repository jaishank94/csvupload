const { generateToken } = require("../helpers/tokens");
const User = require("../models/User");
const Event = require("../models/Event");
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
      token: token,
      isAdmin: true,
      verified: adminUser.verified,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.verifyEventRankings = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Find the event
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Mark the event as verified and update the winner
    event.verified = true;

    // Find the event member with the highest ranking (winner)
    const winner = event.eventMembers.reduce((acc, member) => {
      if (member.ranking > acc.ranking) {
        return member;
      }
      return acc;
    }, event.eventMembers[0]);

    if (winner) {
      event.winner = winner.user;
    }

    // Save the changes
    await event.save();

    // Send the donation amount to the winner's wallet (if any)
    if (event.donations && event.donations.length > 0) {
      const winnerDonations = event.donations.filter(
        (donation) => donation.type === "winner"
      );
      const totalDonationAmount = winnerDonations.reduce(
        (acc, donation) => acc + donation.amount,
        0
      );

      if (totalDonationAmount > 0) {
        // Assuming you have a user model and a function to update the user's wallet balance
        const winnerUser = await User.findById(winner.user);

        if (winnerUser) {
          winnerUser.balance += totalDonationAmount;

          // Save the updated balance
          await winnerUser.save();
        }
      }
    }

    const pipeline = [
      {
        $match: {
          _id: mongoose.Types.ObjectId(eventId),
        },
      },
      {
        $unwind: "$eventMembers",
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$eventMembers.amount" },
        },
      },
    ];

    const result = await Event.aggregate(pipeline);

    const eUser = await User.findById(event.user.toString());

    // Calculate the total amount to distribute among event members
    let totalAmountToDistribute =
      event.totalDonationReceivedByHost + result[0].totalAmount;

    // Distribute the total amount based on the division mode
    if (event.percentageDivisionMode === "different") {
      // Distribute based on different percentages for event members
      event.eventMemberPercentages.forEach(async (memberPercentage) => {
        const member = event.eventMembers.find(async (e) =>
          e.user.equals(memberPercentage.user)
        );

        const dUser = await User.findById(member.user.toString());

        if (member) {
          const distributedAmount = distributeAmount(
            totalAmountToDistribute,
            memberPercentage.percentage
          );

          if (eUser) {
            eUser.balance -= distributedAmount;

            // Save the updated balance
            await eUser.save();
          }
          if (dUser) {
            dUser.balance += distributedAmount;

            // Save the updated balance
            await dUser.save();
          }
          totalAmountToDistribute -= distributedAmount;
        }
      });
    } else if (event.percentageDivisionMode === "same") {
      // Distribute based on the same percentage to all event members
      const samePercentage = 100 / event.eventMembers.length;

      event.eventMembers.forEach(async (member) => {
        const distributedAmount = distributeAmount(
          totalAmountToDistribute,
          samePercentage
        );
        // member.amount += distributedAmount;

        const dUser = await User.findById(member.user.toString());

        if (eUser) {
          eUser.balance -= distributedAmount;

          // Save the updated balance
          await eUser.save();
        }
        if (dUser) {
          dUser.balance += distributedAmount;

          // Save the updated balance
          await dUser.save();
        }

        totalAmountToDistribute -= distributedAmount;
      });
    } else if (event.percentageDivisionMode === "ranking") {
      // Distribute based on ranking percentages
      event.eventMembers.forEach(async (member) => {
        const rankingPercentage = event.rankingPercentages.find(
          (rp) => rp.ranking === member.ranking
        );

        if (rankingPercentage) {
          const distributedAmount = distributeAmount(
            totalAmountToDistribute,
            rankingPercentage.percentage
          );
          // member.amount += distributedAmount;

          const dUser = await User.findById(member.user.toString());

          if (eUser) {
            eUser.balance -= distributedAmount;

            // Save the updated balance
            await eUser.save();
          }
          if (dUser) {
            dUser.balance += distributedAmount;

            // Save the updated balance
            await dUser.save();
          }

          totalAmountToDistribute -= distributedAmount;
        }
      });
    }

    event.status = "COMPLETED";
    await event.save();

    res.status(200).json({ message: "Rankings verified successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Define a function to distribute an amount based on percentages
const distributeAmount = (amount, percentage) => {
  return (amount * percentage) / 100;
};

exports.viewDisputes = async (req, res) => {
  try {
    // Find all disputes
    const disputes = await Event.aggregate([
      { $unwind: "$disputes" },
      {
        $lookup: {
          from: "users", // Assuming the name of your users collection
          localField: "disputes.raisedBy",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: "$disputes._id",
          eventId: "$_id",
          eventType: "disputes.type",
          eventMessage: "disputes.message",
          eventImage: "disputes.image",
          eventName: "$title",
          userId: "$user._id",
          userName: "$user.username",
          userFirstName: "$user.first_name",
          userLastName: "$user.last_name",
        },
      },
    ]);

    res.json(disputes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};
