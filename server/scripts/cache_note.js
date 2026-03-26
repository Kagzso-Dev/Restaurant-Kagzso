require('dotenv').config({ path: 'd:/kagzso-kot-appwrite-main/Restaurant-Kagzso/server/.env' });
// Since we can't easily reach the singleton in the running process, 
// we'll just wait for the 60s TTL or the user can refresh with query param.
console.log("Note: Server cache clears every 60 seconds. Refresh with ?refresh=true in URL to bypass immediately.");
