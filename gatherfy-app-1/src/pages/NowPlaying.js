import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { authenticateWithSpotify, refreshAccessToken, fetchAccessToken, getCurrentlyPlaying, getQueue, searchTracks,
          saveSongPair, saveUserId, getUserSongs, getTrack, checkAndQueueIf, deleteSongPair,
          getUserInfo, logUserOut } from "../useSpotifyAuth";
import arrowImage from '../images/arrow-png-image.png';
import expLyricsIcon from '../images/explicitLyricsIcon.png';
import deleteIcon from '../images/deleteIcon.png';
import settingsIcon from '../images/settingsIcon.png'
import Popup from 'reactjs-popup';
import 'reactjs-popup/dist/index.css';

export default function NowPlaying() {
  
  // user vars
  const [userId, setUserId] = useState(null);
  const [loadedT, setLoadedT] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [loadedUser, setLoadedUser] = useState(false);
  const [savedUser, setSavedUser] = useState(false);
  const userSaved = useRef(false);


  // Current Track vars
  const [currentTrack, setCurrentTrack] = useState(null);
  const [lastQueuedSong, setLastQueuedSong] = useState(() => {
    return localStorage.getItem("lastQueuedSong") || null;
  });
  const lastQueuedSongRef = useRef(lastQueuedSong);

  // Queue vars
  const [queue, setQueue] = useState(0);

  // search vars
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // Main Table vars
  const [tableData, setTableData] = useState([]); // Initialize as an empty array
  const [selectedCell, setSelectedCell] = useState(null);
  const [rowToDelete, setRowToDelete] = useState(null);



  const navigate = useNavigate();
  //const [hasFetched, setHasFetched] = useState(() => {
   // return localStorage.getItem("hasFetched") || false;
  //});
  //const [hasFetched, setHasFetched] = useRef(false);
  const hasFetchedRef = useRef(false);
  const isFirstLogin = useRef(true);



  // Load the user's info

  // Prevent unnecessary re-renders by wrapping `navigate`
  const safeNavigate = useCallback((path) => {
    navigate(path);
  }, [navigate]);

  //useEffect(() => {
    //hasFetchedRef.current = hasFetched;
  //}, [hasFetched]);

  const fetchUserSongs = async () => {

    try {
      console.log("Fetching songs for user:");
      const pairs = await getUserSongs();
      if(pairs.message === "No songs in database") {  // no songs, skip table editing
        console.log("No songs in database, empty table");
        setSavedUser(true);
        setLoadedUser(true);
        return;
      }
      console.log("Getting songs from database", pairs);
      setSavedUser(true);
      setLoadedUser(true);
      const updatedTable = await Promise.all(  // update table with songs received from database
      pairs.map(async (pair) => {

          let song1 = await getTrack(pair.original_song);
          //console.log("frontend song info: ", song1.name);
          let song2 = await getTrack(pair.paired_song);
          return [
            song1
              ? {
                  name: song1.name,
                  id: song1.id,
                  artist: song1.artists,
                  albumArt: song1.albumArt,
                  saved: true, // Mark as saved if coming from DB
                }
              : null,
            { imgSrc: arrowImage },
            song2
              ? {
                  name: song2.name,
                  id: song2.id,
                  artist: song2.artists,
                  albumArt: song2.albumArt,
                  saved: true,
                }
              : null,
          ];
      })
    );
    setTableData((prevTableData) => [...updatedTable, ...prevTableData]);
    
    } catch (error) {
      console.log("Error fetching user's songs:", error);
    }
  };

const fetchUserData = async () => {
    // If user is not fetched, proceed 
  const params = new URLSearchParams(window.location.search);
 console.log(params);
  const code = params.get("code");

  if (!code) {
    console.error("No authorization code found!");
    safeNavigate("/");
    return;
  }
  try {
    console.log("userdata");
    const res = await fetchAccessToken(code);
    //setTableData([]);
    try {
      //const response = await saveUserId(res.userId, userInfo.email);
      //console.log("User saved:", response);
      console.log("hi");

      //fetchUserSongs(); //Fetch songs after saving user
      //setLoadedUser(true);
      //setSavedUser(true);
      setLoadedT(true);
      } catch (error) {
        console.error("Error saving user's ID:", error);
        
      }

  } catch (error) {
  console.error("Error fetching user data:", error);
  }
};


// On initial loading of page
  useEffect(() => {

      const runInitialFetches = async () => {
        if(!hasFetchedRef.current) {
          hasFetchedRef.current = true;
          const hasFetchedDataBefore = localStorage.getItem("hasFetchedData");
          console.log(hasFetchedDataBefore);
          if (hasFetchedDataBefore == "false") {
            console.log("First log in");
            await fetchUserData(); // Wait for data to be fetched first
            localStorage.setItem("hasFetchedData", "true");
          }

          // Always fetch songs afterward (even on refresh)
          await fetchUserSongs();
        };
      
      }
      runInitialFetches();
  }, [safeNavigate]);


  // Refresh token
  useEffect(() => {
    const fetchToken = async () => {
      if (loadedUser && savedUser) {
        try {
          // Call the refreshAccessToken function from authUtils.js
          const res = await refreshAccessToken();
          setLoadedT(true);
        } catch (error) {
          // Handle error if token refresh fails
          console.error("Error refreshing token:", error);
          navigate("/"); // Redirect if refresh fails
        }
      }
    };

    fetchToken();
  }, [navigate]);


  // load user's table
  // default to an empty table if nothing saved in db
  useEffect(() => {
    setTableData(
      Array(5).fill(null)
      .map(() =>
        Array(3).fill(null).map((_, colIndex) => 
          colIndex === 1 ? { imgSrc: arrowImage } : null  // fill second (1) column with arrows
        )));
  }, [loadedUser, savedUser]);


  // This runs whenever lastQueuedSong updates
  useEffect(() => {
    lastQueuedSongRef.current = lastQueuedSong;
  }, [lastQueuedSong]);


  // Fetch Now Playing Track
  useEffect(() => {
    const fetchNowPlaying = async () => {
      if(loadedUser && savedUser){
      try{
        const currentSong = await getCurrentlyPlaying();
        //console.log("Currently Playing:", currentSong.id);
        setCurrentTrack(currentSong);  // set current track for displaying purposes

        //console.log("Last song:", lastQueuedSongRef.current)
        if(currentSong  && (currentSong.id !== lastQueuedSongRef.current)) {
          const result = await checkAndQueueIf(currentSong.id);  // check if current song playing is a paired song
          if(result != "Song is not in database"){
            console.log("###########Queueing Song: ", currentSong.name);
            setLastQueuedSong(currentSong.id);
            lastQueuedSongRef.current = currentSong.id;
            localStorage.setItem("lastQueuedSong", currentSong.id); // Store in local storage
          } else{
            console.log("No songs to queue");
          }
          
        } 
        else{
          
          console.log("no song to queue");
        }
      } catch(error) {
        console.log("Error getting current song: ", error);
        setCurrentTrack(null);  // no song playing
      }
      
    };

  }
    fetchNowPlaying();


    // Refresh every 10 seconds
    const interval = setInterval(fetchNowPlaying, 3000);
    return () => clearInterval(interval);
  }, [loadedUser, lastQueuedSong]);



  // Fetch user's Queue
  // return 3 songs from it for display
  useEffect(() => {
    const fetchQueue = async () => {
      //console.log(loadedUser, savedUser);
      if(loadedUser && savedUser){
      try{
        const queueSongs = await getQueue();
        
        if(queueSongs) {
          setQueue(queueSongs.slice(0, 3));
        } else{
          setQueue(null);  // no songs in queue
        }
      } catch(error) {
        console.log("Error getting queue: ", error);
      }
    };
    }
    fetchQueue();

    // Refresh every 3 seconds
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  
  }, [loadedUser]);



  // Handle search queries on keyup
  const handleSearch = async (e) => {
    const searchTerm = e.target.value;
    setQuery(searchTerm);
    const results = await searchTracks(searchTerm);
    setSearchResults(results);
  };

  // set the selected cell from user click
  const handleCellClick = (row, col) => {
    setSelectedCell({ row, col });
    document.getElementById("search-bar").focus(); // Focus on search bar
  };

  // add song to the table
  // uses selected cell initialized by handleCellClick()
  // also clears search list
  const handleSelectSong = (track) => {
    if (!selectedCell) return; // no cell is selected

    setTableData(prevTable =>
      prevTable.map((row, rowIndex) =>
        row.map((cell, colIndex) =>
          rowIndex === selectedCell.row && colIndex === selectedCell.col
            ? {
                name: track.name,
                id: track.id, 
                artist: track.artists.map((a) => a.name).join(", "),
                albumArt: track.album.images[0]?.url || "",
              }
            : cell
        )
      ),
    );
    setSearchResults([]); // Hide search results
    setQuery(""); // Clear search bar
    setSelectedCell(null); // Reset selected cell
  };


  // Update UI to reflect addition of songs on database
  // runs when user presses "save" button
  const handleSaveSongPair = async (row, rowIndex) => {
    const [originalSong, pairedSong] = row; // Extract the two songs in the row
    console.log("OG: ", originalSong);
    console.log("Pair: ", pairedSong);
    if (savedUser) {
      // Save the song pair to the database
      const result = await saveSongPair(originalSong.id, pairedSong.id);
      console.log("res:" , result);
      if (result == "Song pair saved!") {
        // Change the button text to "Saved!"
        console.log("change to saved");
          // Mark button as disabled
          setTableData((prevTableData) =>
            prevTableData.map((r, i) =>
              i === rowIndex
                ? r.map((cell) =>
                    cell && cell.id ? { ...cell, saved: true } : cell
                  )
                : r
            ));

        };
      
        
    } else {
      console.log('User not authenticated');
    }
  };

  // Update UI to reflect removal of songs from database
  // runs when user presses "Delete" button
  const handleDeleteSongPair = async (row, rowIndex) => {
    const [originalSong, pairedSong] = row; // Extract the two songs in the row
    console.log("OG: ", originalSong);
    console.log("Pair: ", pairedSong);
    if (savedUser) {
      // Save the song pair to the database
      const result = await deleteSongPair(originalSong.id, pairedSong.id);
      console.log("res:" , result);
      if (result == "Song pair deleted!") {

        //console.log("change to deleted");
          // Mark button as disabled
          setRowToDelete(rowIndex);
          setTimeout(() => {
            setTableData((prevTableData) =>
              prevTableData.filter((_, i) => i !== rowIndex)
            );
            setRowToDelete(null);
          }, 300); // match with animation duration

        };
      
        
    } else {
      console.log('User not authenticated');
    }
  };


  // remove things to log user out
  // navigate to welcome screen
  const handleLogOut = async() => {
    const res = true;
    if (res){
      localStorage.removeItem("hasFetchedData");
      safeNavigate("/");
    } else{
      console.log("Error on user log out, try again.. ");
    }
  };

  while(!loadedUser && !loadedT) {
    return <p>Loading</p>;
  }


  // Visual Frontend
  return (
    <div className = "min-h-screen bg-gray-900 pt-10"> 

    {/* Log Out Section */}
    <div className= "fixed top-4 right-4 h-[3rem] w-[4rem] flex flex-col items-center bg-gray-600 rounded ">  
      <Popup
      trigger={<img
        src={settingsIcon}
        alt="Logo"
        className="h-12 w-12 transition-transform duration-700 ease-in-out hover:rotate-[360deg]"
      />}
      position="left top"
      on="hover"
      closeOnDocumentClick
      mouseLeaveDelay={300}
      mouseEnterDelay={0}
      contentStyle={{ padding: '0px', border: 'none' }}
      arrow={false}
    >
      <div className=" bg-gray-500">
        <div className="w-full hover:bg-red-600"><button className="w-full" onClick={() => handleLogOut()}>Log Out</button></div>
        <div className="w-full hover:bg-red-600"><button className="w-full" onClick={() => handleLogOut()}>Delete Account</button> </div>
      </div>
    </Popup>
    </div>


      {/* Search Section */}
        <div className="flex flex-col items-center mt-16 ">
          <div className="w-full max-w-lg text-center">
              <input
                id="search-bar"
                type="text"
                placeholder="Search for a song..."
                value={query}
                onChange={handleSearch}
                className="w-full p-2 border bg-gray-700 hover:bg-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {searchResults?.length > 0 && (
                <ul className="mt-4 bg-gray-700 rounded-lg shadow-lg text-left">
                  {searchResults.map((track) => (
                    <li key={track.id} className="p-2 flex text-white items-center border-b border-gray-200 cursor-pointer hover:-translate-y-1 hover:bg-gray-600 transition" onClick={() => handleSelectSong(track)}>
                      <img src={track.album.images[0]?.url} alt="Album Cover" className="w-12 h-12 mr-4 rounded" />
                      <div>
                        <strong>{track.name} </strong>
                        {track.explicit && <img src={expLyricsIcon} className="w-4 h-4 mr-1 inline"/> }
                        <p className="text-sm text-white max-w-[10rem] overflow-hidden text-ellipsis whitespace-nowrap ">
                          {track.artists.map((a) => a.name).join(", ")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

      {/* Song Table */}
      <div className='mt-10 w-[40rem] flex justify-center bg-gray-600 '>
      <table className="w-full border-collapse">
      <tbody>
        {Array.isArray(tableData) && tableData.map((row, rowIndex) => (
          <tr key={rowIndex} className={`transition-opacity duration-300 ${
            rowToDelete === rowIndex ? "opacity-0" : "opacity-100"
          }`}>
            {Array.isArray(row) && row.map((cell, colIndex) => (
              <td
                key={colIndex}
                className={` ${
                      selectedCell?.row === rowIndex && selectedCell?.col === colIndex 
                        ? "bg-blue-500 text-white"  // Highlighted style
                        : "bg-gray-600 text-gray-300" // Default style
                    } p-4 w-40 h-16 
                  ${
                  colIndex !== 1 ? 'cursor-pointer hover:bg-gray-700 hover:-translate-y-1 transition ' : ''
                  } 
                items-center justify-center`}

                onClick={colIndex !== 1 ? () => handleCellClick(rowIndex, colIndex) : undefined}
              >
                {/* Column 1 (Arrow Image) */}
                {colIndex === 1 ? (
                  <img src={cell?.imgSrc} alt="Arrow" className="w-8 h-8 mx-auto" />
                ) : (
                  // Column 0 or 2 (Song Information and Delete Button)
                  cell ? (
                    <div className="flex flex-col items-center">
                      {cell.albumArt && (
                        <img src={cell.albumArt} alt="Album Cover" className="w-12 h-12 mb-1 rounded" />
                      )}
                      <strong className="max-w-[10rem] overflow-hidden text-ellipsis whitespace-nowrap">{cell.name}</strong>
                      <p className="text-s max-w-[10rem] overflow-hidden text-ellipsis whitespace-nowrap">{cell.artist}</p>
                      {/* Delete Button 
                      <button
                        type="button"
                        id="delete-button"
                        onClick={async (event) => {
                          event.stopPropagation(); // Prevents triggering the cell's onClick
                          
                          try {
                            // Delete the song pair from the database
                            await handleDeleteSongPair(cell, rowIndex, colIndex);
                            
                            // Update the UI by removing the song pair
                            updateTableData(rowIndex, colIndex);
                          } catch (error) {
                            console.error('Error deleting song pair:', error);
                          }
                        }}
                        className="text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm p-2.5 text-center inline-flex items-center me-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-800"
                      >
                        <svg
                          className="w-4 h-4 text-gray-800 dark:text-white"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z"
                          />
                        </svg>
                      </button> */}
                    </div>
                  ) : (
                    'Click to select song'
                  )
                )}
              </td>
      ))}

        {/* Extra Column: Save Button */}
        <td className="border border-gray-600 p-4 w-20 text-center">
        {Array.isArray(row) && row.filter((cell, colIndex) => {
          // Exclude the middle column (index 1) where the arrow image is located
          return colIndex !== 1 && cell !== null && cell.albumArt;
        }).length === 2 ? (
          <div>
          <button
      onClick={() =>{
        const filteredRow = row.filter((_, colIndex) => colIndex !== 1); // Exclude the arrow column
        handleSaveSongPair(filteredRow, rowIndex)}
      }
      disabled={row.some((cell) => cell?.saved)} // Disable if any cell is marked as saved
      className={`w-full px-2 py-1 rounded text-white transition duration-300 ${
        row.some((cell) => cell?.saved)
          ? "bg-gray-500 opacity-50 cursor-not-allowed"
          : "bg-green-500 hover:bg-green-600 hover:-translate-y-1 hover:scale-110"
      }`}
    >
      Save
    </button>
    <button
    onClick={() =>{
    const filteredRow = row.filter((_, colIndex) => colIndex !== 1); // Exclude the arrow column
    handleDeleteSongPair(filteredRow, rowIndex)}
    }
    disabled={!row.some((cell) => cell?.saved)}
    className={`w-full px-2 py-1 rounded text-white transition duration-300 ${
      row.some((cell) => cell?.saved)  // If at least one cell is saved, enable delete
        ? "bg-red-500 hover:bg-red-600 hover:-translate-y-1 hover:scale-110"
        : "bg-gray-500 opacity-50 cursor-not-allowed"
    }`}>
      Delete
      </button>
    </div>

  ): <button> Save</button>}
            </td>
                </tr>
              ))}
            </tbody>
          </table>

          </div>


      {/* Corner Box Showing Current Song Playing and Queue */ }
      <div className=" fixed bottom-4 right-4 h-[20rem] w-[20rem] bg-gray-700 shadow-lg rounded-lg ">
            
            {/* Now Playing */}
            {currentTrack ? (
              <div>
                <h3 className="text-white mb-2 p-1">Now Playing</h3>
                <div className="flex items-center space-x-4">
                  <img src={currentTrack.albumArt} alt="Album cover" className="h-[5rem] w-[5rem] rounded-lg p-1" />
                  <p className="text-white max-w-[10rem] ">
                    <strong>{currentTrack.name}</strong> by {currentTrack.artist}
                  </p>
                </div>
              </div>
            ) : (
              <p>No song currently playing</p>
            )}

            {/* Current Queue */ }
            <h3 className="text-white p-1">Up Next: </h3>
            {queue?.length > 0 ? (
              <table className="w-full border-collapse">
                <tbody className="h-full">
                  {queue.map((song, index) => (
                    <tr key={index} className="h-[3rem] border-b border-gray-500">
                      <td className="w-[3.3rem] p-1">
                        <img src={song.albumArt} alt="Album cover" className='w-full h-full object-cover rounded' />
                      </td>
                      <td className="text-gray-300 text-xs px-2 py-1 max-w-[2rem] overflow-hidden text-ellipsis whitespace-nowrap">      
                            {song.name}
                      </td>
                      <td className="text-gray-300 text-xs px-2 py-1 max-w-[2rem] overflow-hidden text-ellipsis whitespace-nowrap">
                            {song.artist}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="">
              <p>Queue is empty</p>
              </div>
            )}
      </div>

    </div>
  );
}
