const express = require("express");
const router = express.Router();
const CloudinaryController = require("../controllers/CloudinaryController");
const { upload, checkFileSize } = require("../config/cloudinary");

router.post(
  "/images",
  upload.array("image"),
  CloudinaryController.uploadImages
);
router.post(
  "/videos",
  upload.single("video"),
  CloudinaryController.uploadVideo
);
router.post("/files", upload.single("file"), CloudinaryController.uploadFile);
router.post("/image", upload.single("image"), CloudinaryController.uploadImage);

module.exports = router;
