import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authenticateWithSpotify, fetchAccessToken } from "../useSpotifyAuth";

export default function WelcomePage() {
  const navigate = useNavigate();

  const handleLogin = () => {
    //localStorage.removeItem("spotify_access_token");
    //localStorage.removeItem("spotify_user_id");
    localStorage.setItem("hasFetchedData", "false");
    authenticateWithSpotify();
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
      <h1 className="text-white text-3xl mb-6">Welcome</h1>
      <button
        onClick={handleLogin}
        className="bg-green-500 text-white px-6 py-3 rounded-lg text-xl font-bold hover:bg-green-600 transition"
      >
        Log in with Spotify
      </button>
    </div>
  );
}
