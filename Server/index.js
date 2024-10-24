const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { diskStorage } = require("multer");
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { readFileSync } = require("fs");

require("dotenv").config();

const PORT = 3000;
const app = express();

app.use(express.json());
app.use(cors("*"));

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// 1. MongoDB connection
mongoose.connect(process.env.MONGO_URI);

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// 2. Define Mongoose Schema and Model for storing file metadata
const fileSchema = new mongoose.Schema({
  fileName: String,
  filePath: String,
  mimeType: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const File = mongoose.model("File", fileSchema);

// 3. Multer storage configuration
const storage = diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix);
  },
});

const upload = multer({ storage: storage }).single("file");

// 4. Upload endpoint that stores file metadata to MongoDB
app.post("/upload", (req, res) => {
  try {
    upload(req, res, async (err) => {
      if (err) {
        return res.status(500).json(err);
      }

      const filePath = req.file.path;
      const fileName = req.file.filename;
      const mimeType = req.file.mimetype;

      // Store file metadata in the database
      const newFile = new File({
        fileName,
        filePath,
        mimeType,
      });

      await newFile.save();

      res.status(200).json({ message: "File uploaded and metadata saved successfully", file: newFile });
    });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong" });
    console.error(err);
  }
});

// 5. Gemini API integration to handle text and image generation
app.post("/gemini", async (req, res) => {
  try {
    function fileToGenerativePart(path, mimeType) {
      return {
        inlineData: {
          data: Buffer.from(readFileSync(path)).toString("base64"),
          mimeType,
        },
      };
    }

    const prompt = req.body.message;

    // Get the file from MongoDB by querying the filePath (you can customize this based on the file you need)
    const file = await File.findOne().sort({ createdAt: -1 }); // Get the most recent file

    if (!file) {
      return res.status(404).json({ error: "No file found" });
    }

    const result = await model.generateContent([
      prompt,
      fileToGenerativePart(file.filePath, file.mimeType),
    ]);

    const text = result.response.text();
    res.send(text);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  }
});

// 6. Start the server
app.listen(PORT, () => {
  console.log(`App listening on PORT: ${PORT}`);
});
