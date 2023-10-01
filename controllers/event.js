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
