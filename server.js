const app = require('express')();
const dotenv = require('dotenv');
dotenv.config();

const port = process.env.PORT | 5000;

app.listen(port, () => {
  console.log('\x1b[36m%s\x1b[0m', `Server on port ${port}`);
});
