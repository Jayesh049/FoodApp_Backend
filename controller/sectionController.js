const SectionModel = require("../model/sectionModel");

async function listSections(req, res, next) {
  try {
    const sections = await SectionModel.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
    return res.status(200).json({ sections });
  } catch (err) {
    return next(err);
  }
}

async function listAllSectionsAdmin(req, res, next) {
  try {
    const sections = await SectionModel.find().sort({ order: 1, createdAt: -1 });
    return res.status(200).json({ sections });
  } catch (err) {
    return next(err);
  }
}

async function createSection(req, res, next) {
  try {
    const data = req.body || {};
    if (!data.key || !data.title) {
      return res.status(400).json({ message: "key and title are required" });
    }
    const section = await SectionModel.create(data);
    return res.status(201).json({ message: "Section created", section });
  } catch (err) {
    return next(err);
  }
}

async function updateSection(req, res, next) {
  try {
    const id = req.params.id;
    const updates = req.body || {};

    const section = await SectionModel.findById(id);
    if (!section) return res.status(404).json({ message: "Section not found" });

    Object.keys(updates).forEach((k) => {
      section[k] = updates[k];
    });

    await section.save();
    return res.status(200).json({ message: "Section updated", section });
  } catch (err) {
    return next(err);
  }
}

async function deleteSection(req, res, next) {
  try {
    const id = req.params.id;
    const section = await SectionModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    if (!section) return res.status(404).json({ message: "Section not found" });
    return res.status(200).json({ message: "Section archived", section });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listSections, listAllSectionsAdmin, createSection, updateSection, deleteSection };

