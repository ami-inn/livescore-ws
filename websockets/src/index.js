import express from "express";
import { matchesRouter } from "./routes/matches.js";


const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello from Express!");
});

app.use('/matches', matchesRouter);

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}/`);
});
