//manages database queries
/*
require("dotenv").config();
const {Pool} = require("pg");

// Set up postgre connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Required for AWS RDS
    },
  });
module.exports = pool;
*/
  /*
  // Insert user data into the database
const insertUser = async (spotifyId) => {
    try {
      const query = 'INSERT INTO users (spotify_id) VALUES ($1) RETURNING *';
      const values = [spotifyId];
      const result = await pool.query(query, values);
      console.log('Inserted user:', result.rows[0]); // Display the inserted row
    } catch (err) {
      console.error('Error inserting user:', err);
    }
  };
  
  // Example usage
  insertUser('spotify:user:sample-spotify-id');
  */