const Event = require("../models/Event");
const User = require("../models/User");
const Game = require("../models/Game");
const mongoose = require("mongoose");
const moment = require("moment");

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
    const { page = 1, limit = 10, gender, status } = req.body;
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
    };

    // Create a filter object for the MongoDB query
    const filters = {};

    // Apply filters if provided in the query parameters
    if (gender) {
      filters.gender = gender;
    }

    if (status) {
      filters.status = status;
    }

    const events = await Event.paginate(filters, options);

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
        path: "donations.user",
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
    )
      .populate("eventMembers.user", "picture first_name last_name username")
      .populate("donations.user", "picture first_name last_name username");

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
        path: "donations.user",
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
    const { type, amount, donationReceiver, userId, message } = req.body;
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
      message,
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
    const { rankings, screenshotUrl, userId } = req.body;
    // const hostId = req.user._id;
    const hostId = userId;

    // Find the event
    const event = await Event.findById(eventId)
      .where("status")
      .in(["IN_PROGRESS", "RESULT_VERIFICATION"]);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Check if the user submitting rankings is the host of the event
    console.log(event.user, hostId);
    if (!event.user.equals(hostId)) {
      // if (event.user.equals !== hostId) {
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
    event.screenshotUploadedAt = new Date();

    event.resultScreenshots.push({
      imageUrl: screenshotUrl, // Assuming the image URL is provided in the request body
      requestedBy: hostId, // The admin/user requesting the re-upload
      requestedAt: new Date(), // Timestamp of the request
    });

    event.reUploadResult = false;
    event.status = "RESULT_VERIFICATION";
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
    const event = await Event.findById(eventId)
      .where("status")
      .nin(["CANCELLED", "COMPLETED"]);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Ensure the event is not already canceled
    if (event.status !== "ACTIVE") {
      return res.status(400).json({ error: "Event is not active to cancel" });
    }

    // Check if the event is in progress
    if (event.status === "ACTIVE") {
      // Release blocked bids if the event is in progress
      await this.releaseBids(event.bids);
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
    const event = await Event.findById(eventId)
      .populate("eventMembers.user", "picture first_name last_name username")
      .populate("donations.user", "picture first_name last_name username");

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.status(200).json(event.eventMembers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
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

exports.placeBid = async (req, res) => {
  try {
    const { amount, image, eventId, userId } = req.body;
    // const { userId } = req.user;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(201).json({ error: "Event not found" });
    }

    if (event.status !== "ACTIVE") {
      return res.status(201).json({ error: "Event is not in progress" });
    }

    const user = await User.findById(userId);

    if (!user.balance || user?.balance < amount) {
      return res.status(201).json({ error: "Insufficient balance" });
    }

    // Block the bid amount in the user's wallet
    user.balance -= amount;
    user.blockedBalance += parseInt(amount);

    // Save the user's updated balances
    await user.save();

    // Add the bid to the event's bids array
    let newBids = await Event.findByIdAndUpdate(
      eventId,
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

// Get a list of events where the user has placed bids
exports.getUserBids = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find events where the user has placed a bid
    const events = await Event.find({
      "bids.bidBy": mongoose.Types.ObjectId(userId),
    })
      .populate("game", "name picture") // Populate game information
      .populate("user", "first_name last_name username email picture gender") // Populate game information
      .lean();

    // Determine eligibility for each auction
    const eventsWithEligibility = events.map((event) => {
      // Determine if the user's bid is in the top 4 bids
      const userBid = event.bids.find((bid) => bid.bidBy.toString() === userId);
      const topBids = event.bids
        .sort((a, b) => b.amount - a.amount)
        .slice(0, event.numberOfTickets);

      const isEligible = topBids.some((bid) => bid.bidBy.toString() === userId);

      return {
        _id: event._id,
        title: event.title,
        eventDetails: event,
        isEligible,
        userBid,
      };
    });

    res.json(eventsWithEligibility);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.raiseDispute = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { type, message, image, userId } = req.body;
    const raisedBy = userId; // Assuming the user is authenticated

    // Find the event
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Check if the user is a participant in the event
    const isParticipant = event.eventMembers.some((member) =>
      member.user.equals(userId)
    );

    // Check if the user has donated an amount
    const hasDonated = event.donations.some((donation) =>
      donation.user.equals(userId)
    );

    if (!isParticipant && !hasDonated) {
      return res
        .status(400)
        .json({ error: "User is not eligible to raise a dispute" });
    }

    // Add the dispute
    event.disputes.push({
      raisedBy,
      type,
      message,
      image,
      createdAt: new Date(),
    });

    // Save the event
    await event.save();

    res.status(200).json({ message: "Dispute raised successfully" });
  } catch (e) {}
};

// To check and process disputes
exports.checkAndProcessDisputes = async (req, res) => {
  try {
    // Find events where the last screenshot was uploaded 24 hours ago or more
    const cutoffTime = moment().subtract(24, "hours");

    const eventsToReleaseFunds = await Event.find({
      screenshotUploadedAt: { $lte: cutoffTime },
    });

    for (const event of eventsToReleaseFunds) {
      // Check if there are disputes raised for this event
      if (event.disputes && event.disputes.length > 0) {
        // If there are disputes, ask the host to re-upload the screenshot
        // You can implement the logic to notify the host here
      } else {
        // If there are no disputes, release the funds
        // Implement the logic to release the funds to the event members and host here

        // Reset the lastScreenshotUploadTime to null
        event.screenshotUploadedAt = null;
        await event.save();
      }
    }

    res.status(200).json({ message: "Cron job executed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getDisputeDetails = async (req, res) => {
  try {
    // Get event ID and dispute ID from the request
    const { eventId, disputeId } = req.params;

    // Find the event
    const event = await Event.findById(eventId)
      .populate("user")
      .populate("game");

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Find the dispute within the event
    const dispute = event.disputes.id(disputeId);

    if (!dispute) {
      return res.status(404).json({ error: "Dispute not found" });
    }

    // Find the user who raised the dispute
    const disputeUser = await User.findById(dispute.raisedBy);

    if (!disputeUser) {
      return res.status(404).json({ error: "Dispute User not found" });
    }

    res.json({
      event: event,
      dispute: {
        id: dispute._id,
        type: dispute.type,
        status: dispute.status,
        message: dispute.message,
        image: dispute.image,
        createdAt: dispute.createdAt,
        raisedBy: {
          id: disputeUser._id,
          image: disputeUser.image,
          username: disputeUser.username,
          firstname: disputeUser.first_name,
          lastname: disputeUser.last_name,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};
