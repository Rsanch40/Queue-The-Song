import { useState } from "react";

const SearchBar = ({ accessToken }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const searchSpotify = async (searchTerm) => {
    if (!searchTerm.trim() || !accessToken) {
      setResults([]);
      return;
    }

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchTerm)}&type=track&limit=4`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!response.ok) throw new Error("Spotify search failed");

      const data = await response.json();
      setResults(data.tracks.items);
    } catch (error) {
      console.error("Error searching Spotify:", error);
      setResults([]);
    }
  };

  return (
    <div className="flex flex-col items-center mt-10">
      {/* Search Input */}
      <input
        type="text"
        placeholder="Search for a song..."
        className="w-1/2 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          searchSpotify(e.target.value);
        }}
      />

      {/* Search Results */}
      {results.length > 0 && (
        <ul className="mt-4 w-1/2 bg-gray-900 text-white rounded-lg shadow-lg">
          {results.map((track) => (
            <li key={track.id} className="p-2 flex items-center border-b border-gray-700">
              <img src={track.album.images[0]?.url} alt="Album Cover" className="w-12 h-12 mr-4 rounded" />
              <div>
                <strong>{track.name}</strong>
                <p className="text-sm">{track.artists.map((a) => a.name).join(", ")}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
