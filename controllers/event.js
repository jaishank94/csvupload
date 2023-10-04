const Event = require("../models/Event");
const User = require("../models/User");
const Game = require("../models/Game");
const mongoose = require("mongoose");

// Create a new event
exports.createEvent = async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();
    res.status(201).json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get a list of events with pagination
exports.getEvents = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.body;
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
    };

    if (status && status !== "") {
      options.status = status;
    }

    const events = await Event.paginate({}, options);

    // Populate the necessary fields
    const populatedEvents = await Event.populate(events.docs, [
      {
        path: "game",
        select: "name picture description",
      },
      {
        path: "eventMembers.user",
        select: "picture first_name last_name username",
      },
      {
        path: "user",
        select: "picture first_name last_name username",
      },
    ]);

    // Replace the original docs with the populated ones
    events.docs = populatedEvents;

    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Purchase event ticket
exports.purchaseEventTicket = async (req, res) => {
  try {
    const { image, eventId, userId } = req.body;
    // const { userId } = req.user;

    const event = await Event.findById(eventId);
    if (!event || event.numberOfTickets === event.eventMembers.length) {
      return res.status(201).json({ error: "Event not found" });
    }

    const amount = event.ticketPrice;

    if (event.status !== "ACTIVE") {
      return res.status(201).json({ error: "Event is not in progress" });
    }

    const user = await User.findById(userId);

    if (!user.balance || user?.balance < amount) {
      return res.status(201).json({ error: "Insufficient balance" });
    }

    const eventUser = await User.findById(event.user.toString());

    user.balance -= amount;
    eventUser.balance += parseInt(amount);

    // Save the user's updated balances
    await user.save();
    await eventUser.save();

    // Add the purchase to the event's member array
    let newPurchase = await Event.findByIdAndUpdate(
      eventId,
      {
        $push: {
          eventMembers: {
            amount: amount,
            image: image,
            user: req.user.id,
            createdAt: new Date(),
          },
        },
      },
      {
        new: true,
      }
    ).populate("eventMembers.user", "picture first_name last_name username");
    res.json(newPurchase.eventMembers);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Get event details by ID
exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id)
      .populate({
        path: "game",
        select: "name picture description",
      })
      .populate({
        path: "eventMembers.user",
        select: "picture first_name last_name username",
      })
      .populate({
        path: "user",
        select: "picture first_name last_name username",
      });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update event details by ID
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedEvent = await Event.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updatedEvent) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json(updatedEvent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete an event by ID
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedEvent = await Event.findByIdAndRemove(id);
    if (!deletedEvent) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json({ message: "Event deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Make a donation to an event
exports.makeDonation = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { type, amount, donationReceiver, userId } = req.body;
    // const userId = req.user._id; // Assuming you have user information in the request

    // Find the event
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Find the user making the donation
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if the user has sufficient balance
    if (user.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Handle donation based on the type
    if (type === "host") {
      // Find the user making the donation
      const eventUser = await User.findById(event.user.toString());

      if (!eventUser) {
        return res.status(404).json({ error: "Event User not found" });
      }

      // Send the donation amount to the user's wallet
      user.balance -= amount;

      // Send the donation amount directly to the event user's wallet balance
      eventUser.balance += amount;

      event.totalDonationReceivedByHost += amount;

      await eventUser.save();
      await user.save();

      await event.save();
    } else if (type === "player") {
      // Check if the user is an event member
      const isEventMember = event.eventMembers.some((member) =>
        member.user.equals(donationReceiver)
      );

      if (!isEventMember) {
        return res.status(400).json({ error: "User is not an event member" });
      }

      // Find the user making the donation
      const donationReceiverUser = await User.findById(donationReceiver);

      if (!donationReceiverUser) {
        return res
          .status(404)
          .json({ error: "Donation Receiver User not found" });
      }

      // Send the donation amount to the user's wallet
      user.balance -= amount;

      donationReceiverUser.balance += amount;
      await donationReceiverUser.save();

      await user.save();
    } else if (type === "winner") {
      // Implement winner verification logic here
      // Once the winner is verified, send the donation amount to the winner's wallet
      // You can add your winner verification logic here
    } else {
      return res.status(400).json({ error: "Invalid donation type" });
    }

    // Add the donation record to the event
    event.donations.push({
      type,
      donationReceiver: donationReceiver,
      amount,
      image: user.picture,
      user: userId,
      createdAt: new Date(),
    });

    await event.save();

    res.status(200).json({ message: "Donation successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.submitRankings = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { rankings, screenshotUrl, usrId } = req.body;
    // const hostId = req.user._id;
    const hostId = usrId;

    // Find the event
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Check if the user submitting rankings is the host of the event
    if (!event.user.equals(hostId)) {
      return res
        .status(403)
        .json({ error: "Only the event host can submit rankings" });
    }

    // Update the rankings for eventMembers
    for (const { userId, ranking } of rankings) {
      const member = event.eventMembers.find((member) =>
        member.user.equals(userId)
      );
      if (member) {
        member.ranking = ranking;
      }
    }

    // Save the rankings and screenshot URL
    event.rankingsScreenshotUrl = screenshotUrl;
    await event.save();

    res.status(200).json({ message: "Rankings submitted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.cancelEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Find the event
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Ensure the event is not already canceled
    if (event.status !== "ACTIVE") {
      return res.status(400).json({ error: "Event is not active to cancel" });
    }

    // Mark the event as canceled
    event.status = "CANCELLED";

    // Calculate the total refund amount
    let totalRefundAmount = 0;

    // Refund event members' ticket price
    event.eventMembers.forEach(async (member) => {
      totalRefundAmount += event.ticketPrice;
      if (member.amount > 0) {
        // Assuming you have a user model and a function to update the user's wallet balance
        const memberUser = await User.findById(member.user);
        if (memberUser) {
          memberUser.balance += event.ticketPrice;
          await memberUser.save();
        }
        const eUser = await User.findById(event.user.toString());
        if (eUser) {
          eUser.balance -= event.ticketPrice;
          await eUser.save();
        }
      }
    });

    // Refund donation members (if any)
    if (event.donations && event.donations.length > 0) {
      event.donations.forEach(async (donation) => {
        totalRefundAmount += donation.amount;
        // Assuming you have a user model and a function to update the user's wallet balance
        const donationUser = await User.findById(donation.user);
        if (donationUser) {
          donationUser.balance += donation.amount;
          await donationUser.save();
        }

        if (donation.type === "player" || donation.type === "host") {
          // Find the user made the donation
          const donationReceiverUser = await User.findById(
            donation.donationReceiver.toString()
          );

          if (donationReceiverUser) {
            donationReceiverUser.balance -= donation.amount;
            await donationReceiverUser.save();
          }
        }
      });
    }

    // Save the event changes
    await event.save();

    res.status(200).json({ message: "Event canceled successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.viewEventRankings = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Find the event
    const event = await Event.findById(eventId).populate("eventMembers.user");

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.status(200).json(event.eventMembers);
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
      const samePercentage =
        event.eventMemberPercentages.length > 0
          ? event.eventMemberPercentages[0].percentage
          : 0;

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

exports.defineTotalDonation = async (eventData) => {
  try {
    const { eventId, totalDonationReceived, userId } = eventData;
    const eventUser = userId;

    // Find the event
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Check if the user defining the donation is the event user
    if (!event.user.equals(eventUser)) {
      return res
        .status(403)
        .json({ error: "Only the event user can define the donation" });
    }

    // Update the total donation received
    event.totalDonationReceived = totalDonationReceived;
    await event.save();

    res
      .status(200)
      .json({ message: "Total donation received defined successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getUserEventsHistory = async (req, res) => {
  try {
    const { userId } = req.params; // Assuming you have user authentication in req.user

    // Find events created by the user
    const userCreatedEvents = await Event.find({ user: userId })
      .populate("game", "name picture description")
      .populate("user", "picture first_name last_name username");

    // Find events where the user is an eventMember
    const userEventMemberships = await Event.find({
      "eventMembers.user": userId,
    }).populate("game", "name picture description");

    res.json({
      createdEvents: userCreatedEvents,
      eventMemberships: userEventMemberships,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};
