# Summary
- This is a web application which allows users to create a playlist consisting of their favourite songs.
- Employs YouTube's Data API v3 to fetch videos from YouTube and add them to the users playlist.
- Utilizes SQLite3 to save and sort each users' playlist and maintain persistent user song information.

# Ensure node_modules is deleted

## Install Instructions:
    npm install

## Launch Instructions:
    node server.js

## Testing Instructions:
    To test application: http://localhost:3000
    
#### To test (with admin priviledges) 
    Username: user1
    Passcode: pass1

#### To test (with guest priviledges)
    Username: user2
    Passcode: pass2

#### To test non-registered users:
    http://localhost:3000/users
    http://localhost:3000/search
    http://localhost:3000/showPlaylist

## YouTube Video Walkthrough: 
    https://youtu.be/e-VJwFCIWsA 