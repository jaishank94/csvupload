const Event = require("../models/Event");
const User = require("../models/User");
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
    const { page = 1, limit = 10 } = req.query;
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const events = await Event.paginate({}, options);
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Purchase event ticket
exports.purchaseEventTicket = async (req, res) => {
  try {
    const { amount, image, eventId, userId } = req.body;
    // const { userId } = req.user;

    const event = await Event.findById(eventId);
    if (!event || event.numberOfTickets === event.eventMembers.length) {
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

    // Add the purchase to the event's member array
    let newPurchase = await Auction.findByIdAndUpdate(
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
    const event = await Event.findById(id);
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

      await eventUser.save();
      await user.save();
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
    });

    await event.save();

    res.status(200).json({ message: "Donation successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};
