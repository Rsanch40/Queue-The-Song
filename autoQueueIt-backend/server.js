import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import pg from "pg";
import fs, { access } from "fs";
import path from "path";
import url from 'url';
import { v4 as uuidv4 } from "uuid";
import cookieParser from "cookie-parser";

dotenv.config();
const app = express();

const origin_url = process.env.ORIGIN_URL;

app.use(cookieParser());
app.use(express.json());
app.use(cors({ origin: origin_url,
  credentials: true // Allow credentials (cookies, tokens, etc.)
 }));

const { Pool } = pg;
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for AWS RDS
});

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI =process.env.SPOTIFY_REDIRECT_URI;

//console.log("CLIENT_ID from .env:", process.env.SPOTIFY_CLIENT_ID);
//console.log("REDIRECT_URI: ", REDIRECT_URI);

app.get("/test", (req, res) => {
  res.json({ message: "API test successful!" });
});


app.post("/save-user", async (req, res) => {
  const { user_id, user_email } = req.body;

  //console.log("user in server: ", user_id, user_email);

  const query = `INSERT INTO users (email, spotify_id, id)
                  VALUES ($1, $2, gen_random_uuid()) ON CONFLICT (spotify_id) DO NOTHING`;

  try{
    const result = await pool.query(query, [user_email, user_id]);

    //res.status(200).json({ message: "User saved successfully" });
    // Check if a row was inserted or if the user already exists
    if (result.rowCount === 0) {
      return res.status(200).json({ message: "User already exists" });
    }

    return res.status(201).json({ message: "User saved successfully", email: user_email, userId: user_id });
  } catch(error) {
    console.error("Error saving user in db: ", error);
    res.status(500).json({error: "Database error"});
  }

  
});


// get user's uuid using their spotifyId
const getUserUUID = async (spotifyId) => {
  const query = `SELECT id FROM users WHERE spotify_id = $1;`;
  const values = [spotifyId];

  try {
      const res = await pool.query(query, values);
      return res.rows.length > 0 ? res.rows[0].id : null; // Return UUID if found
  } catch (error) {
      console.error("Error fetching user UUID:", error);
      throw error;
  }
};



// Get user ID from spotify
app.get("/auth/userInfo", async (req, res) => {
  const { access_token } = req.query;

  try {
    const response = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    //const data = response.data;

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching user ID:", error.response?.data || error);
    res.status(400).json({ error: "Failed to retrieve user ID" });
  }
});


// Store token in the database
const saveToken = async (userId, accessToken, refreshToken, expiresAt) => {
  await pool.query(
    `INSERT INTO spotify_tokens (spotify_id, access_token, refresh_token, expires_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (spotify_id) 
     DO UPDATE SET access_token = $2, refresh_token = $3, expires_at = $4`,
    [ userId, accessToken, refreshToken, expiresAt]
  );

};

// Store user in the database**
const saveUser = async (userEmail, userId) => {
  await pool.query(
    `INSERT INTO users (email, spotify_id, id)
                  VALUES ($1, $2, gen_random_uuid()) ON CONFLICT (spotify_id) DO NOTHING`,
    [ userEmail, userId]
  );

};


// **Exchange authorization code for access token**
app.post("/auth/token", async (req, res) => {
 //console.log("Server entered');
  const { code } = req.body;
  //console.log("code: ", code);
  //console.log("once");


  try {
    //("hi");
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    //console.log(response.data);

    const { userId, access_token, refresh_token, expires_in } = response.data;
    const expiresAt = Date.now() + expires_in * 1000;

    //("try");

    // Fetch user profile from Spotify
    const spotifyRes = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    //console.log("usr in /auth/token:", spotifyRes.data.id);

    // Save token to database**
    await saveToken(spotifyRes.data.id, access_token, refresh_token, expiresAt);
    
    // Save user to database
    await saveUser(spotifyRes.data.email, spotifyRes.data.id);

    // Set the cookies
    res.cookie("access_token", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 3600000, // 1 hour
    });

    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 3600000, // 1 hour
    });

    res.cookie("userId", spotifyRes.data.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 3600000,
    });

    //console.log("user: ", spotifyRes.data.id, access_token);


    res.status(200).send("User authenticated and cookies set!");
  } catch (error) {
    console.error("Error exchanging code for token:", error.response?.data || error);
    res.status(400).json({ error: "Token exchange failed" });
  }
});


// **Refresh Spotify Token**
app.post("/auth/refresh", async (req, res) => {
  if(req.cookies.userId == null) {
    return;
  }
  const { userId } = req.cookies.userId;
  //console.log("refreshing");

  try {
    // Get the refresh token from DB
    const { rows } = await pool.query(
      "SELECT refresh_token FROM spotify_tokens WHERE spotifyid = $1",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    const refresh_token = rows[0].refresh_token;

    // Request new access token from Spotify
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token, expires_in } = response.data;
    const expiresAt = Date.now() + expires_in * 1000;

    // Update the new access token in the database
    await pool.query(
      "UPDATE spotify_tokens SET access_token = $1, expires_at = $2 WHERE spotify_id = $3",
      [access_token, expiresAt, userId]
    );

    // Set access token in HttpOnly cookie
    res.cookie("access_token", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: expiresAt, 
    });

    res.status(200).json({message: "Token refreshed successfully!"});
  } catch (error) {
    console.error("Error refreshing token:", error);
    res.status(400).json({ error: "Token refresh failed" });
  }
});


// **Get currently playing track**
app.get("/nowPlaying", async (req, res) => {
  const { userId } = req.cookies;
  //console.log("user now playing:", userId);

  try {
    
    const { rows } = await pool.query(
      "SELECT access_token FROM spotify_tokens WHERE spotify_id = $1",
      [userId]
    );

    if (rows.length === 0) return res.status(400).json({ error: "User not found" });

    const accessToken = rows[0].access_token;
    //console.log("Ac: ", accessToken);

    const response = await axios.get("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching currently playing track:", error.response?.data || error);
    res.status(400).json({ error: "Failed to fetch track" });
  }
});


// Get user's Queue 
app.get("/currentQueue", async (req, res) => {
  const { userId } = req.cookies;
  try{
    const { rows } = await pool.query(
      "SELECT access_token FROM spotify_tokens WHERE spotify_id = $1",
      [userId]
    );

    if (rows.length === 0) return res.status(400).json({ error: "User not found" });

    const accessToken = rows[0].access_token;

    const response = await axios.get("https://api.spotify.com/v1/me/player/queue", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching current Queue:", error.response?.data || error);
    res.status(400).json({ error: "Failed to fetch Queue" });
  }

});

// get search results from spoitfy's API
app.get("/spotify/search", async (req, res) => {
  const { query } = req.query;
  const { userId } = req.cookies;
  //console.log("user id in search", userId);
    try{
      const { rows } = await pool.query(
        "SELECT access_token FROM spotify_tokens WHERE spotify_id = $1",
        [userId]
      );
      

      if (rows.length === 0) return res.status(400).json({ error: "User not found" });

      const accessToken = rows[0].access_token;
      // Make request to Spotify's search API
      const response = await axios.get("https://api.spotify.com/v1/search", {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          q: query,
          type: "track,artist,album",
          limit: 4,
        },

      });

      res.json(response.data);
    } catch (error) {
      console.error("Error fetching search results:", error);
      res.status(500).json({ error: "Failed to fetch search results" });
    }
});

// store songs into database
app.post("/save-pairs", async (req, res) =>  {
  const {first_song, second_song} = req.body;
  const { userId } = req.cookies;
  //console.log("Saving pairs for user: ", userId);

  try{
    await pool.query(
      `INSERT INTO song_pairs (user_id, original_song, paired_song)
      VALUES ($1, $2, $3)
      ON CONFLICT (original_song, paired_song) DO NOTHING`,
      [userId, first_song, second_song]
    );

    res.status(200).json({ message: "Song pair saved!" });
  } catch (error) {
    console.log("Error saving songs in server database: ", error);
    res.status(500).json({error: "Failed to save songs in db"});
  }

});

// delete songs into database
app.delete("/delete-pairs", async (req, res) =>  {

  const { userId } = req.cookies;
  const {firstSong, secondSong} = req.query;

  //console.log("before deleting", userId, firstSong, secondSong);
  try{
    await pool.query(
      `Delete FROM song_pairs 
      WHERE user_id = $1 AND original_song = $2 AND paired_song = $3`,
      [userId, firstSong, secondSong]
    );

    res.status(200).json({ message: "Song pair deleted!" });
  } catch (error) {
    console.log("Error deleting songs from server database: ", error);
    res.status(500).json({error: "Failed to delete songs in db"});
  }

});


// get user's paired songs from database
app.get("/get-pairs", async (req, res) =>  {

  const { userId } = req.cookies;
  //console.log("Getting pairs from user: ", userId);

  if (!userId) {
    console.log("No userId to get pairs from");
    return res.status(401).json({ error: "User is not authenticated" });
  }

  try{

  const { rows } = await pool.query(
    `SELECT original_song, paired_song FROM song_pairs WHERE user_id = $1`,
    [userId]
  );
  if(rows.length > 0) {
    //console.log(rows);
    return res.json(rows);
  } else{
    res.json({ message: "No songs in database" });
  }
  }catch (error) {
    console.log("Error fetching pairs from database: ", error);
    res.status(500).json({error: "Failed to fetch paired songs"});
  }
});


// get track info from Spotify's API
app.get("/get-track", async(req, res) => {
  const { trackId } = req.query;
  const { access_token } = req.cookies;

  if (!access_token || !trackId) {
    return res.status(400).json({ error: "Missing access_token or trackId" });
  }

  try{

    //console.log("query: ", token, trackId);
    const response = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching track data in server: ", error);
    return null;
  }
});

app.post("/check-track", async(req, res) => {
  const { userId } = req.cookies;
  const { access_token } = req.cookies;
  const { trackId } = req.body;

  //console.log("in server: ", userId, trackId);
  
  try{
    const {rows} = await pool.query(
      `SELECT paired_song FROM song_pairs 
        WHERE user_id = $1 AND original_song = $2`,
        [userId, trackId]
    );


    // song is not in db
    if(rows.length === 0) {
      //console.log("Song is not in db");
      res.json({ message: "Song is not in database" });
      return;
    }

    // song is in database, try to queue
    try{
      let song = `spotify:track:${rows[0].paired_song}`;
      
      const response = await axios.post(
        `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(song)}`, 
        {}, // Empty body since Spotify's API expects no request body
        {
          headers: { Authorization: `Bearer ${access_token}` }
        }
      );
      
      //console.log("Song added to queue");
      res.status(200).json({ message: "Song added to Queue!" });

    } catch (error) {
      console.log("Error adding track to queue: ", error);
      res.status(500).json({error: "Failed to queue paired song"});
    }

  } catch(error) {
    console.log("Error checking db for track: ", error);
  }
});



const PORT = process.env.PORT;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
