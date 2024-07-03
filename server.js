/**
 * 
 * # This web application allows users to create a playlist of their favourite songs
 * # Their playlist is saved to the database and accessible after each session 
 * # This project uses YouTube Data API v3 to capture and display the songs in the user's playlist
 * # This project uses Handlebars to render the template
 * 
 * @date 2024/04/01
 * @author Isaiah Aganon
 */

const express = require('express');
const path = require('path');
const logger = require('morgan');

//read routes modules
const routes = require('./routes/index');
const app = express(); 

app.locals.pretty = true; 
const PORT = process.env.PORT || 3000;

// Middleware
app.use(logger('dev'));
app.use(express.json());  
app.use(express.urlencoded({ extended: true }));  
app.set('view engine', '.hbs');

// For css
app.use('/styles', express.static(path.join(__dirname, 'styles')));

// Routes
app.get('/', routes.index);
app.post('/signup', routes.signup);  // In index.hbs
app.post('/login', routes.login); // In index.hbs
app.get('/users', routes.users); // Shows all the users in the database to 'admin' status user
app.get('/search', routes.search); // Search for songs to add to playlist
app.post('/addToPlaylist', routes.addToPlaylist); // Add song to playlist
app.post('/deleteFromPlaylist', routes.deleteFromPlaylist); // Delete song from playlist
app.get('/showPlaylist', routes.showPlaylist);   // Show user's playlis

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('http://localhost:3000')
    console.log('\n------------------------------\nTo test with admin priviledges\n\tUsername: user1\n\tPassword: pass1\n\nTo test with guest priviledges\n\tUsername: user2\n\tPassword: pass2\n------------------------------\n')
	
    /* To test non-registered users */
    // console.log("Test Unauthorized Users\nhttp://localhost:3000/users\nhttp://localhost:3000/search\nhttp://localhost:3000/showPlaylist")
});
