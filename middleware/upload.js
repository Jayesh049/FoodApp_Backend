const path = require("path");
const multer = require("multer");

const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const VIDEO_MAX_BYTES = 100 * 1024 * 1024; // 100MB

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    let ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});

function imageFilter(req, file, callback) {
  if (
    file.mimetype == "image/png" ||
    file.mimetype == "image/jpg" ||
    file.mimetype == "image/jpeg"
  ) {
    callback(null, true);
  } else {
    callback(new Error("only jpg & png files supported"));
  }
}

function videoFilter(req, file, callback) {
  if (
    file.mimetype == "video/mp4" ||
    file.mimetype == "video/avi" ||
    file.mimetype == "video/quicktime" ||
    file.mimetype == "video/x-ms-wmv" ||
    file.mimetype == "video/mov" ||
    file.mimetype == "video/wmv"
  ) {
    callback(null, true);
  } else {
    callback(new Error("only mp4, avi, mov, wmv files supported"));
  }
}

var upload = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: { fileSize: IMAGE_MAX_BYTES },
});

var uploadMultiple = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: { fileSize: IMAGE_MAX_BYTES },
});

var uploadVideo = multer({
  storage: storage,
  fileFilter: videoFilter,
  limits: { fileSize: VIDEO_MAX_BYTES },
});

module.exports = { upload, uploadMultiple, uploadVideo };
