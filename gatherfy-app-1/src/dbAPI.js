const API_URL = "/api";

export const saveSongPair = async (spotifyId, originalSong, pairedSong) => {
  const response = await fetch(`${API_URL}/song-pairs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spotify_id: spotifyId, original_song: originalSong, paired_song: pairedSong }),
  });
  return response.json();
};

export const getSongPairs = async (spotifyId) => {

  const response = await fetch(`${API_URL}/song-pairs/${spotifyId}`);
  //console.log("res:", response.status);
  //const data = await response.json();
  //console.log("Fetched data:", data); // Log the raw data from the backend
  
  return response.json();

};

export const deleteSongPair = async (spotifyId, originalSong) => {
  const response = await fetch(`${API_URL}/song-pairs/${spotifyId}/${originalSong}`, {
    method: "DELETE",
  });
  return response.json();
};
