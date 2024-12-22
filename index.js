const axios = require("axios");
const qs = require("qs");
var SpotifyWebApi = require("spotify-web-api-node");
var express = require("express");
const querystring = require("node:querystring");
const fs = require("fs").promises; // Import the Node.js File System module

var client_id = "CLIENT_ID";
var redirect_uri = "http://localhost:8888/callback";

var app = express();

const secrets = {
  clientId: "b46de3e85ced4b3b90667350bab9e2b3",
  clientSecret: "9ec8b2ebfef44725b58a9f57b8794f52",
  redirectUri: redirect_uri,
};

const data = {
  grant_type: "client_credentials",
  client_id: "b46de3e85ced4b3b90667350bab9e2b3",
  client_secret: "9ec8b2ebfef44725b58a9f57b8794f52",
};

savedTracks = {}

// credentials are optional
var spotifyApi = new SpotifyWebApi(secrets);

var scopes = [
    // Images
    "ugc-image-upload",

    // Spotify Connect
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",

    // Playback
    "app-remote-control",
    "streaming",

    // Playlists
    "playlist-read-private",
    "playlist-read-collaborative",
    "playlist-modify-private",
    "playlist-modify-public",

    // Follow
    "user-follow-modify",
    "user-follow-read",

    // Listening History
    "user-read-playback-position",
    "user-top-read",
    "user-read-recently-played",

    // Library
    "user-library-modify",
    "user-library-read",

    // Users
    "user-read-email",
    "user-read-private",

    // Open Access
    "user-soa-link",
    "user-soa-unlink",
    "soa-manage-entitlements",
    "soa-manage-partner",
    "soa-create-partner",
  ],
  state = "some-state-of-my-choice";
var client_id = "CLIENT_ID";
const options = {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  data: qs.stringify(data),
  url: "https://accounts.spotify.com/api/token",
};

axios(options).then((res) => {
  const token = res.data.access_token;
  spotifyApi.setAccessToken(token);
  var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
});

app.get("/login", function (req, res) {
  var scopeArray = "user-library-read";
  // "user-read-private",
  // "user-read-email",
  // ,
  // "playlist-modify-public"
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: secrets.clientId,
        scope: scopeArray,
        redirect_uri: redirect_uri,
        state: state,
      })
  );
});

app.get("/callback", function (req, res) {
  var code = req.query.code || null;
  var state = req.query.state || null;
  if (state === null) {
    res.redirect(
      "/#" +
        querystring.stringify({
          error: "state_mismatch",
        })
    );
  } else {
    var authOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code",
      },
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          new Buffer.from(
            secrets.clientId + ":" + secrets.clientSecret
          ).toString("base64"),
      },
      json: true,
    };
    spotifyApi
      .authorizationCodeGrant(authOptions.form.code)
      .then(
        function (data) {
          console.log("The token expires in " + data.body["expires_in"]);
          console.log("The access token is " + data.body["access_token"]);
          console.log("The refresh token is " + data.body["refresh_token"]);

          // Set the access token on the API object to use it in later calls
          spotifyApi.setAccessToken(data.body["access_token"]);
          spotifyApi.setRefreshToken(data.body["refresh_token"]);
        },
        function (err) {
          console.log("Something went wrong!", err);
        }
      )
      .then(() => {
        // spotifyApi.getMe().then(
        //   function (data) {
        //     spotifyApi.getUserPlaylists(data.body.id).then(
        //       function (data) {
        //         console.log("Retrieved playlists", data.body);
        //       },
        //       function (err) {
        //         console.log("Something went wrong!", err);
        //       }
        //     );
        //   },
        //   function (err) {
        //     console.log("Something went wrong!", err);
        //   }
        // );

        // let writeTracks = async function get() {
        //   const tracks = await getSpotifyTracks(323);
        //   console.log(tracks);
        // };
        // const promiseA = new Promise(writeTracks());
        // promiseA.then((data) => {
        //     console.log(data);
        // });

        // Async function to fetch and write tracks
        const writeTracksToFile = async () => {
          try {
            // Fetch tracks
            const tracks = await getSpotifyTracks(324);
            console.log(tracks);
            // Write tracks to a JSON file
            await fs.writeFile("tracks.json", JSON.stringify(tracks, null, 2));

            console.log("Tracks successfully written to tracks.json");
          } catch (error) {
            console.error("Error fetching or writing tracks:", error);
          }
        };

        // Call the function
        writeTracksToFile();
      });
  }
});

async function getSpotifyTracks(number) {
  let trackArray = {};
  if (number <= 50) {
    spotifyApi
      .getMySavedTracks({
        limit: number,
        offset: 0,
      })
      .then((data) => {
        trackArray = Object.assign({}, trackArray, data.body.items);
        deconstructeTracks(trackArray);
        return trackArray;
      });
  } else {
    let newnum = number;
    let newoffset = 0;
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let i = 0, p = Promise.resolve(); i < number; i = i + 50) {
      p = p
        .then(() => delay(5 * 1000))
        .then(() => {
          spotifyApi
            .getMySavedTracks({
              limit: 50,
              offset: i,
            })
            .then((data) => {
              trackArray = Object.assign({}, trackArray, data.body.items);
              deconstructeTracks(trackArray);
            });
        });
      newoffset = i;
      console.log("newoff: " + newoffset);
      newnum = newnum - 50;
      console.log("new num: " + newnum);
    }

    if (newnum < 0) {
      spotifyApi
        .getMySavedTracks({
          limit: -1 * newnum,
          offset: newoffset,
        })
        .then((data) => {
          trackArray = Object.assign({}, trackArray, data.body.items);
          console.log("fetched tracks");
          deconstructeTracks(trackArray, number);
          return trackArray;
        });
    }
  }
}

function deconstructeTracks(tracks, number) {
  for (let i = 0; i < Object.keys(tracks).length; i++) {
    const element = Object.values(tracks).at(i);
    const trackName = element.track.name;
    for
    console.log(trackName);
  }
}

app.listen(8888);
