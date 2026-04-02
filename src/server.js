import 'dotenv/config'
import app from './app.js'

const PORT = process.env.PORT || 3000

app.listen(3000, "0.0.0.0", () => {
  console.log("API running on port 3000");
});
