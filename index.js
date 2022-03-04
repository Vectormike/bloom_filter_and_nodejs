const express = require('express');
const pg = require('pg');
const redis = require('redis');
const dotenv = require('dotenv');
dotenv.config();

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  database: 'indexing',
  password: null,
});

const app = express();
const bloomFilter = redis.createClient();

// parse json request body
app.use(express.json());

// Hash function
String.prototype.hashCode = function () {
  var hash = 0;
  for (var i = 0; i < this.length; i++) {
    var char = this.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
};

// Insert student details
app.post('/create', async (req, res) => {
  const { name, email } = req.body;

  try {
    await bloomFilter.connect();

    pool.query(`CREATE TABLE IF NOT EXISTS students (
    id BIGSERIAL,
    name TEXT,
    email TEXT
   );
`);

    const text = `
    INSERT INTO students (name, email)
    VALUES ($1, $2)
    RETURNING id
  `;

    const values = [name, email];

    pool.query(text, values, async (err, result) => {
      if (err) throw new Error('Unabe to add student record');

      if (!err) {
        const key = email.hashCode();
        bloomFilter.set(key, 1);
        return res.send({ message: 'Student record saved' });
      }
    });
  } catch (error) {
    return res.send({ error });
  }
});

// Get student details by email
app.get('/:email', async (req, res) => {
  try {
    await bloomFilter.connect();

    const { email } = req.params;

    const text = `
    SELECT * FROM students WHERE email = $1
  `;

    const value = [text, email];

    const key = email.hashCode();
    const exists = await bloomFilter.exists(key);

    if (!exists) {
      return res.send('Student does not exist');
    }
    pool.query(text, value, (err, response) => {
      if (err) res.send(err);
      console.log(response);
      return res.send(response);
    });
  } catch (error) {
    return res.send({ error });
  }
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log('\x1b[36m%s\x1b[0m', `Server on port ${port}`);
});
