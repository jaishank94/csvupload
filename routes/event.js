const express = require("express");
const router = express.Router();
const eventController = require("../controllers/event");
const { authUser } = require("../middlwares/auth");

// Create a new event
router.post("/events", authUser, eventController.createEvent);

// Get a list of events (with pagination)
router.get("/events", eventController.getEvents);

// Get event details by ID
router.get("/events/:id", eventController.getEventById);

// Update event details by ID
router.put("/events/:id", authUser, eventController.updateEvent);

// Delete an event by ID
router.delete("/events/:id", authUser, eventController.deleteEvent);

// Purchase event tickets
router.post(
  "/events/purchase-ticket",
  authUser,
  eventController.purchaseEventTicket
);

module.exports = router;
