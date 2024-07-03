var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('data/database.db');
const axios = require('axios');

/* Stores current user's information */
var username;
var password;
var user_role = null; // R1.3 user1, pass1 is the only account with 'admin' status
var songData;

/* R1.4 API for fetching songs */
const YOUTUBE_API_KEY = 'AIzaSyCJAkNmbcsjnARhsWOSDLD1jzbENBaB0J8';

/**
 * Searches database to see if username and passcode exist
 */
function hasUserPass(username, password, callback) {
    let flag = false; // True if username and passcode is in database

    db.all("SELECT username, passcode, role FROM users WHERE username = ? AND passcode = ?", [username, password], function (err, rows) {
        if (err) {
            console.error(err.message);
            return callback(err, flag);
        }
        if (rows.length > 0) {
            flag = true;
            user_role = rows[0].role;
            ifLoggedIn = true;
        }
        callback(null, flag, user_role, false);
    });
}

/**
 * Login as a previous user
 * R1.1 Allows users to log back into the application with a username and passcode previously saved to the database
 */
exports.login = function (request, response) {
    username = request.body.username;
    password = request.body.password;

    // Determines if user's name and passcode is in database
    hasUserPass(username, password, function (err, flag, ifLoggedIn) {
        if (err) {
            console.error(err.message);
            response.status(500).json({ error: 'Database error' });
            return;
        }

        /* If false, go back to login page */
        if (!flag) {
            response.render('index', { title: 'Login', invalidLogin: true });
            return;
        }

        request.user_role = user_role;
        console.log("User Role: ", request.user_role)

        /* Render homepage with buttons*/
        response.render('index', {
            title: 'Home',
            ifLoggedIn: ifLoggedIn,
            userName: username,
            userRole: user_role,
            ifAdmin: user_role === 'admin' ? true : false // If true, user is able view all the other users in the database
        });

    });
}

/**
 * Sign up new user
 * R1.2 Allows a new "guest" user to register and create a new "guest" account to be saved to the database
 * All new users automatically have "guest" status
 */
exports.signup = function (request, response) {
    username = request.body.username;
    password = request.body.password;

    // Check if the user already exists
    hasUserPass(username, password, function (err, flag, ifLoggedIn) {
        if (err) {
            console.error(err.message);
            response.status(500).json({ error: 'Database error' });
            return;
        }

        /* If username and password exist, return to home screen*/
        if (flag) {
            response.render('index', { title: 'Home', invalidSignUp: true });
            return;
        }

        // If user doesn't exist, insert into database
        db.run(`INSERT INTO users (username, passcode, role) VALUES (?, ?, 'guest')`, [username, password], function (err) {
            if (err) {
                console.error(err.message);
                response.status(500).json({ error: 'Database error' });
                return;
            }
            user_role = 'guest'
            response.render('index', {
                title: 'Home',
                ifLoggedIn: ifLoggedIn,
                userName: username,
                userRole: user_role
            });
        });
    });
}

/**
 * Show signup and login form
 */
exports.index = function (request, response) {
    response.render('index', { title: 'Home' });
};

/**
 * Only 'admin' status users can see information from database
 * R1.3 Displays all the usernames, passcodes and user roles saved to the database, only to the admin
 */
exports.users = function (request, response) {
    console.log('USER ROLE: ' + user_role);

    // Check if user has admin privileges
    if (user_role !== 'admin') {
        response.writeHead(200, { 'Content-Type': 'text/html' }); // Change content type to 'text/html'
        response.end('<strong style="font-size: 40px;">ERROR: Admin Privileges Required to See Users</strong>');
        return;
    }

    db.all("SELECT username, passcode, role FROM users", function (err, rows) {
        response.render('users', { title: 'Users', userEntries: rows });
    })
}

/**
 * Displays all the song saved to the particular user's playlist
 */
exports.showPlaylist = function (request, response) {
    /* Prevents unauthorized users from accessing this page */
    if (user_role === null) {
        response.writeHead(200, { 'Content-Type': 'text/html' }); // Change content type to 'text/html'
        response.end('<strong style="font-size: 40px;">ERROR: Non-registered User</strong>');
        console.log("USER ROLE:", user_role)
        return;
    }

    db.all("SELECT videoId, videoTitle, videoUrl FROM playlist WHERE username = ?", [username], function (err, rows) {
        if (err) {
            console.error(err.message);
            response.status(500).json({ error: 'Database error' });
            return;
        }

        response.render('show', { title: 'Playlist', playlistEntries: rows, username: username });

    });
}

/**
 * Add song to playlist
 * R1.7 Allows users to contribute content to the database by adding their songs to the "playlist" table
 */
exports.addToPlaylist = async function (request, response) {
    const { videoId, videoTitle, videoUrl } = request.body;

    /* Adds song information to playlist table */
    db.run(`INSERT INTO playlist (username, videoId, videoTitle, videoUrl) VALUES (?, ?, ?, ?)`, [username, videoId, videoTitle, videoUrl], function (err) {
        if (err) {
            console.error(err.message);
            response.status(500).json({ error: 'Database error' });
            return;
        }
        /* Lets user know song has been added to playlist */
        const message = `Song "${videoTitle}" has been added to playlist "${username}"`;
        console.log(message);
        response.render('search', { title: 'Search', song: songData, message: message });
    });
}

/**
 * Delete song from playlist
 * R1.7 Allows users to manipulate the content in the database by deleting a song in the "playlist" table
 */
exports.deleteFromPlaylist = function (request, response) {
    const { videoId } = request.body;

    db.run(`DELETE FROM playlist WHERE videoId = ? AND username = ?`, [videoId, username], function (err) {
        if (err) {
            console.error(err.message);
            response.status(500).json({ error: 'Database error' });
            return;
        }

        response.redirect('/showPlaylist');
    });
}

/**
 * Fetches songs from YouTube
 * R1.4 Uses the YouTube Data API v3 to fetch the songs from YouTube
 */
async function searchSongOnYouTube(songTitle, artistName) {
    const query = encodeURIComponent(`${songTitle} ${artistName}`);
    const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&q=${query}&key=${YOUTUBE_API_KEY}`;

    try {
        const response = await axios.get(apiUrl);

        if (response.data.items.length > 0) {
            const videoId = response.data.items[0].id.videoId;
            const videoTitle = response.data.items[0].snippet.title;
            const videoThumbnail = response.data.items[0].snippet.thumbnails.default.url;

            /* Get video details including the duration */
            const videoDetailUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`;
            const videoDetailResponse = await axios.get(videoDetailUrl);
            const duration = videoDetailResponse.data.items[0].contentDetails.duration;

            songData = { videoId, videoTitle, videoThumbnail, duration, artistName };
            console.log('Song Data:', songData); // Logging the song data


            return { videoId, videoTitle, videoThumbnail, duration, artistName };
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error searching song on YouTube:', error);
        throw error;
    }
}

/**
 * Search action
 * Displays search page and allows users to search for a song
 */
exports.search = async function (request, response) {

    /* Prevents unauthorized users from accessing this page */
    if (user_role === null) {
        response.writeHead(200, { 'Content-Type': 'text/html' }); // Change content type to 'text/html'
        response.end('<strong style="font-size: 40px;">ERROR: Non-registered User</strong>');
        console.log("USER ROLE:", user_role)
        return;
    }

    const { song, artist } = request.query;

    if (!song) {
        response.render('search', { title: 'Search page' });
        return;
    }

    const songData = await searchSongOnYouTube(song, artist);

    if (!songData) {
        response.render('search', { title: 'Search page', notFound: true });
        return;
    }

    response.render('search', { title: 'Search page', song: songData });
};