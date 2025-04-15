import axios from "axios";

const CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.REACT_APP_SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI =process.env.REACT_APP_SPOTIFY_REDIRECT_URL;

const API_URL = process.env.REACT_APP_API_URL;

const authenticateWithSpotify = () => {
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=user-read-playback-state user-modify-playback-state user-read-email user-read-private`;
  window.location.href = authUrl;
  console.log(window.location.href);
};


const fetchAccessToken = async (code) => {
  try {
    const response = await axios.post(`${API_URL}/auth/token`, { code }, { withCredentials: true });
    //console.log("Access Token Response:", response);
    if(response.status == 200) {
      //console.log("u: ", response.data);
    } else {
      console.error("Failed to get access token.");
      return null;
    }
  } catch (error) {
    console.error("Error fetching access token:", error);
    return null;
  }
};


const refreshAccessToken = async () => {
  try {
    const response = await axios.post(`${API_URL}/auth/refresh`, {
      withCredentials: true,
    });

    if (!response.ok) throw new Error("Failed to refresh access token");

    return response;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
};

/*

export const getUserInfo = async() => {

  try{
  const response = await axios.get(`${API_URL}/auth/userInfo?access_token=${token}`);

  console.log("user data: ", response.data.email);

  return response.data;
  } catch(error) {
    console.error("Error fetching user data from backend:", error);
  }


};
*/



/*
const getUserId = async () => {

  try {
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

    // Save the refreshed token and expiry information
    return { access_token, expires_at: expiresAt };
  } catch (error) {
    console.error("Error refreshing token:", error.response?.data || error.message || error);
    throw new Error("Token refresh failed");
  }
};
*/


const saveUserId = async(userId, userEmail) => {
  try{
    //console.log("user email before call: ", userEmail);
    const response = await axios.post(`${API_URL}/save-user`, {
      user_id: userId,
      user_email: userEmail
    });
    //console.log("User saved!: ", response);
    return response;

  } catch(error) {
    console.log("Error saving user id: ", error);
  }
};

// Fetch User's Now Playing Song through Spotify's API
const getCurrentlyPlaying = async() => {
  try {
    //console.log(userId);
    let response = await axios.get(`${API_URL}/nowPlaying`, {
      withCredentials: true,
    });
    //console.log("got: ", response.data.item.name);


    if(response.status == 204){ // 204 = No Content
      return null;
    }

    // get data from response and turn into easier-to-read data
    // return data or null if no song 
    const data = response.data;
    //console.log(data);
    return data.item
    ? {
        name: data.item.name,
        id: data.item.id,
        artist: data.item.artists.map((artist) => artist.name).join(", "),
        albumArt: data.item.album.images[0]?.url,
        }
    : null;
  } catch (err) {
    console.error("Failed to fetch currently playing song: ", err);
  }
};

// Fetch User's Queue through Spotify's API
const getQueue = async() => {
  try {
    let response = await axios.get(`${API_URL}/currentQueue`, {
      withCredentials: true,
    });
    //console.log("got: ", response.data.item.name);


    if(response.status == 204){ // 204 = No Content
      return null;
    }

    // get data from response and turn into easier-to-read data
    // return data
    const data = response.data;
    return data.queue.map((song) => ({
      name: song.name,
      id: song.id,
      artist: song.artists.map((artist) => artist.name).join(", "),
      albumArt: song.album.images[0]?.url,
    }));
  } catch (err) {
    console.error("Failed to fetch user's queue: ", err);
  }
};

// Fetch search result's from user's query
const searchTracks = async (query) => {
  if (!query.trim()) {
    return [];
  }
  try {

    const response = await axios.get(`${API_URL}/api/spotify/search?query=${encodeURIComponent(query)}`, {
      withCredentials: true,
    });

    const data = response.data;
    return data.tracks.items;
  } catch (error) {
    console.error("Error searching Spotifys:", error);
    return [];
  }
};

// save songs to database
const saveSongPair = async(firstSong, secondSong) => {
  try{
    const response = await axios.post(`${API_URL}/save-pairs`, {
      first_song: firstSong,
      second_song: secondSong
    }, {withCredentials: true,});

    const message = response.data.message;
    return message;
  }catch(error){
    console.error("Error saving songs: ", error);
  }
};

// save songs to database
const deleteSongPair = async(firstSong, secondSong) => {
  try{
    const response = await axios.delete(`${API_URL}/delete-pairs?firstSong=${firstSong}&secondSong=${secondSong}`, {
      withCredentials: true,
    });

    const message = response.data.message;
    return message;
  }catch(error){
    console.error("Error deleting songs: ", error);
  }
};

// get song from database
const getUserSongs = async() => {
  try{
    const response = await axios.get(`${API_URL}/get-pairs`, {
      withCredentials: true,
    });
    //console.log("Response from getting songs: ", response);
    return response.data;
  } catch(error) {
    console.log("Error fetching pairs from database", error);
  }
};

// get track info for displaying purposes
const getTrack = async(trackId) => {
  try{
    const response = await axios.get(`${API_URL}/get-track?trackId=${trackId}`, {
      withCredentials: true,
    });
    
    if(response == null) {
      console.log("No track data received");
      return null;
    }

    return {
      name: response.data.name,
      id: response.data.id,
      artists: response.data.artists.map((artist) => artist.name).join(", "),
      albumArt: response.data.album.images[0]?.url || "", // Ensure fallback
    };
  } catch (error) {
    console.log("Error getting track from Spotify API: ", error);
  }
};

const checkAndQueueIf = async(trackId) => {

  try{
    //console.log("Before checking: ", userId, trackId);
    const response = await axios.post(`${API_URL}/check-track`,{
      trackId: trackId
    } ,{withCredentials: true,});
    //console.log("was it in the db?", response.data.message);
    const mess = response.data.message;
    return mess;

  } catch (error){
    console.log("Error checking or queueing track: ", error);
  }

};

export const logUserOut = async() => {
  try{
    const response = await axios.post(`${API_URL}/log-out`, {
      withCredentials: true,
    });

    if(response.data.message) {
      return true;
    }

  } catch(error) {
    console.log("Error logging out user: ", error);
    return false;
  }
};

export { authenticateWithSpotify, fetchAccessToken, refreshAccessToken, getCurrentlyPlaying, 
  getQueue, searchTracks, saveSongPair, saveUserId, getUserSongs, getTrack, checkAndQueueIf, deleteSongPair };
