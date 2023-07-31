const Banner = require("../models/Banner");
const User = require("../models/User");

exports.createBanner = async (req, res) => {
  try {
    const banner = await new Banner(req.body).save();
    res.json(banner);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getAllBanners = async (req, res) => {
  try {
    const results = await Banner.find({ status: "ACTIVE", isActive: true });

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.saveBanner = async (req, res) => {
  try {
    const { infos } = req.body;
    const bannerId = req.params.id;

    const updated = await Banner.findByIdAndUpdate(
      bannerId,
      {
        name: infos.name,
      },
      {
        picture: infos.picture,
      }
    );
    res.json(updated.details);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteBanner = async (req, res) => {
  try {
    await Banner.findByIdAndRemove(req.params.id);
    res.json({ status: "ok" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
