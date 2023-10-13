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
          from: "users",
          localField: "disputes.raisedBy",
          foreignField: "_id",
          as: "raisedByUser",
        },
      },
      { $unwind: "$raisedByUser" },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "eventUser",
        },
      },
      { $unwind: "$eventUser" },
      {
        $lookup: {
          from: "games", // Assuming there is a "games" collection
          localField: "game",
          foreignField: "_id",
          as: "gameInfo",
        },
      },
      { $unwind: "$gameInfo" },
      {
        $project: {
          _id: "$disputes._id",
          eventId: "$_id",
          eventName: "$title",
          eventCreatedAt: "$createdAt",
          eventType: "$disputes.type",
          disputeMessage: "$disputes.message",
          disputeImage: "$disputes.image",
          disputeCreatedAt: "$disputes.createdAt",
          eventImage: "$images",
          gameName: "$gameInfo.name",
          disputeRaisedBy: {
            username: "$raisedByUser.username",
            firstname: "$raisedByUser.first_name",
            picture: "$raisedByUser.picture",
            lastname: "$raisedByUser.last_name",
          },
          eventUserDetails: {
            username: "$eventUser.username",
            firstname: "$eventUser.first_name",
            picture: "$eventUser.picture",
            lastname: "$eventUser.last_name",
          },
        },
      },
    ]);

    res.json(disputes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Initiate refund for a dispute
exports.initiateRefund = async (req, res) => {
  try {
    const { eventId, disputeId, refundUserId, refundReciveUsrId } = req.params;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const dispute = event.disputes.id(disputeId);

    if (!dispute) {
      return res.status(404).json({ error: "Dispute not found" });
    }

    // Check the dispute type (e.g., "donation" or "ticket")
    const disputeType = dispute.type;

    if (disputeType === "donation") {
      // Handle donation refund
      // Check whom the user made a donation and refund the amount
      // const donation = event.donations.id(disputeId);
      const donationReceiverId = refundUserId;

      const user = await User.findById(refundReciveUsrId);
      const donationReceiver = await User.findById(donationReceiverId);

      if (!user || !donationReceiver) {
        return res.status(404).json({ error: "User not found" });
      }

      // Refund the amount to the user who made the donation
      user.balance += dispute.amount;
      await user.save();

      // Deduct the amount from the user who received the donation
      donationReceiver.balance -= dispute.amount;
      await donationReceiver.save();
    } else if (disputeType === "ticket") {
      // Handle ticket auction refund
      // Refund from the host wallet
      const hostUser = await User.findById(event.user);

      const refundUser = await User.findById(refundUserId);

      if (!hostUser || !refundUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Refund the ticket amount from the host
      hostUser.balance -= dispute.amount;
      await hostUser.save();

      refundUser.balance += dispute.amount;
      await refundUser.save();
    } else {
      // Handle other dispute types if necessary
      // Your additional dispute resolution logic here
    }

    // Update the dispute status to 'resolved'
    dispute.status = "resolved";

    await event.save();

    res.status(200).json({ message: "Refund initiated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Hold the event for a dispute
exports.holdEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Find the event
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Check the current status of the event
    const currentStatus = event.status;

    if (currentStatus === "ACTIVE" || currentStatus === "IN_PROGRESS") {
      // Hold the event
      event.status = "HOLD";
      await event.save();
      res.status(200).json({ message: "Event is now on hold" });
    } else if (currentStatus === "HOLD") {
      // Unhold the event (set it back to ACTIVE)
      event.status = "ACTIVE";
      await event.save();
      res.status(200).json({ message: "Event is now active again" });
    } else {
      // Handle other status transitions if needed
      res
        .status(400)
        .json({ error: "Invalid operation for the current event status" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Close a dispute
exports.closeDispute = async (req, res) => {
  try {
    const { eventId, disputeId } = req.params;

    // Find the event
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Find the specific dispute within the event
    const dispute = event.disputes.id(disputeId);

    if (!dispute) {
      return res.status(404).json({ error: "Dispute not found" });
    }

    // Update the dispute status to 'closed'
    dispute.status = "closed";

    // Save the changes to the event
    await event.save();

    res.status(200).json({ message: "Dispute closed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Ask the host to reupload event results
exports.askHostToReuploadResults = async (req, res) => {
  try {
    const { eventId, userId } = req.params;

    // Find the event
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Check if the event status is "ACTIVE"
    if (event.status !== "RESULT_VERIFICATION") {
      return res.status(400).json({ error: "Event is not active" });
    }

    // Check if the user making the request is an admin or authorized to ask for re-upload
    // You can add an authorization check here

    // Update the event status to "RESULT_VERIFICATION"
    event.status = "RESULT_VERIFICATION";
    event.reUploadResult = true;

    // Save the changes to the event
    await event.save();

    res.status(200).json({ message: "Host asked to re-upload event results" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};
