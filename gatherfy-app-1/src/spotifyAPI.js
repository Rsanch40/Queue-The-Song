const API_BASE_URL = "https://api.spotify.com/v1";

const client_id = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
const client_secret = process.env.REACT_APP_SPOTIFY_CLIENT_SECRET;
const ruri = process.env.REACT_APP_SPOTIFY_REDIRECT_URL;

// 🔹 Exchange Authorization Code for Access and Refresh Token
const exchangeCodeForToken = async (code) => {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(
        `${client_id}:${client_secret}`
      )}`,
    },
    body: new URLSearchParams({
      code,
      redirect_uri: ruri,
      grant_type: "authorization_code",
    }),
  });
  const data = await response.json();
  return data.access_token && data.refresh_token ? data : null;
};

// 🔹 Refresh Access Token using Refresh Token
const refreshAccessToken = async (refreshToken) => {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(
        `${client_id}:${client_secret}`
      )}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const data = await response.json();
  return data.access_token || null;
};

// 🔹 Get Currently Playing Song
const getCurrentlyPlaying = async (accessToken) => {
  const response = await fetch(`${API_BASE_URL}/me/player/currently-playing`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // if no song is playing
  if(response.status == 204){ // 204 = No Content
    return null;
  }

  // error fetching
  if (!response.ok) {
    console.error("Error fetching currently playing song:", response.statusText);
    return null;
  }

  // if successfully got info for current song
  try {
    if (response.ok) {
        const data = await response.json();
        return data.item
        ? {
            name: data.item.name,
            id: data.item.id,
            artist: data.item.artists.map((artist) => artist.name).join(", "),
            albumArt: data.item.album.images[0]?.url,
            }
        : null;
    }
  } catch(error) {
    console.error("Error parsing JSON response: ", error);
    return null;
  }
};

// 🔹 Get User's Queue
const getQueue = async (accessToken) => {
  const response = await fetch(`${API_BASE_URL}/me/player/queue`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

    // if nothing in queue
    if(response.status == 204){ // 204 = No Content
        return null;
    }

    // if received queue response
    try{
        if (response.ok) {
            const data = await response.json();
            return data.queue.map((song) => ({
            name: song.name,
            id: song.id,
            artist: song.artists.map((artist) => artist.name).join(", "),
            albumArt: song.album.images[0]?.url,
            }));
        }
        return [];
    } catch (error){
        console.error("Error parsing JSON response: ", error);
        return null;
    }
};

export const searchTracks = async (accessToken, query) => {
    if (!query.trim() || !accessToken) {
      return [];
    }
  
    try {
      const response = await fetch(
        `${API_BASE_URL}/search?q=${encodeURIComponent(query)}&type=track&limit=4`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!response.ok) {
        throw new Error("Spotify search failed");
      }
      const data = await response.json();
      return data.tracks.items;
    } catch (error) {
      console.error("Error searching Spotify:", error);
      return [];
    }
  };

  export const addToQueue = async (accessToken, trackUri) => {
    try{
      const response = await fetch(`${API_BASE_URL}/me/player/queue?uri=${encodeURIComponent(trackUri)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok){
        console.log("Song added to queue!");
      }

    }catch(error){
      console.error("Error adding song to queue: ", error);
    }
  }

  export const getUserSpotifyId = async (accessToken) => {
    const response = await fetch('https://api.spotify.com/v1/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  
    const data = await response.json();
    return data.id; // This is the user's Spotify ID
  };

// Get track info from Spotify by providing the track's ID
export const getTrack = async (accessToken, trackId) => {
  try {
    // Extract just the track ID (remove "spotify:track:")
    //console.log(trackId);
    const cleanTrackId = trackId.replace("spotify:track:", "");
    //console.log(cleanTrackId);
    const response = await fetch(`https://api.spotify.com/v1/tracks/${encodeURIComponent(cleanTrackId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch track: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log("Fetched track data:", data); // Debugging

    return {
      name: data.name,
      id: data.id,
      artists: data.artists.map((artist) => artist.name).join(", "),
      albumArt: data.album.images[0]?.url || "", // Ensure fallback
    };
  } catch (error) {
    console.error("Error fetching track data:", error);
    return null;
  }
};



export { exchangeCodeForToken, refreshAccessToken, getCurrentlyPlaying, getQueue };
