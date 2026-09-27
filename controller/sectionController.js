const SectionModel = require("../model/sectionModel");

async function listSections(req, res) {
  try {
    const sections = await SectionModel.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
    return res.status(200).json({ sections });
  } catch (err) {
    console.log("listSections error:", err);
    return res.status(500).json({ message: err.message });
  }
}

async function listAllSectionsAdmin(req, res) {
  try {
    const sections = await SectionModel.find().sort({ order: 1, createdAt: -1 });
    return res.status(200).json({ sections });
  } catch (err) {
    console.log("listAllSectionsAdmin error:", err);
    return res.status(500).json({ message: err.message });
  }
}

async function createSection(req, res) {
  try {
    const data = req.body || {};
    if (!data.key || !data.title) {
      return res.status(400).json({ message: "key and title are required" });
    }
    const section = await SectionModel.create(data);
    return res.status(201).json({ message: "Section created", section });
  } catch (err) {
    console.log("createSection error:", err);
    return res.status(500).json({ message: err.message });
  }
}

async function updateSection(req, res) {
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
    console.log("updateSection error:", err);
    return res.status(500).json({ message: err.message });
  }
}

async function deleteSection(req, res) {
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
    console.log("deleteSection error:", err);
    return res.status(500).json({ message: err.message });
  }
}

module.exports = { listSections, listAllSectionsAdmin, createSection, updateSection, deleteSection };

