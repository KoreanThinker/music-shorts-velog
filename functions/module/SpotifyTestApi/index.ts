/* eslint-disable require-jsdoc */
import SpotifyWebApi from "spotify-web-api-node";

class SpotifyTestApi extends SpotifyWebApi {
  searchTracks(): any {
    return require("./searchTracks_mock.json");
  }
  authorizationCodeGrant(): any {
    return require("./authorizationCodeGrant_mock.json");
  }
  getMe(): any {
    return require("./getMe_mock.json");
  }
  createAuthorizeURL(): any {
    return "https://accounts.spotify.com/authorize";
  }
}

export default SpotifyTestApi;

// require('fs').writeFileSync(
//   'mock.json',
//   JSON.stringify(result),
// );
