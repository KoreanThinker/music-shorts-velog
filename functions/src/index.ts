/* eslint-disable @typescript-eslint/no-var-requires */
import {https} from "firebase-functions";
import Spotify from "spotify-web-api-node";
import _admin from "firebase-admin";
import {UserRecord} from "firebase-functions/v1/auth";
import {HttpsError} from "firebase-functions/v1/https";

export const admin =
  process.env.NODE_ENV === "test" // 테스트 환경이라면
    ? _admin.initializeApp({
        // 로컬에서 인증서를 가져옴
        credential: _admin.credential.cert(
          require("../testServiceAccountKey.json"),
        ),
      })
    : // 테스트 환경이 아니라면 firebase의 명령어로 실행하기에 자동으로 초기화됨
      _admin.initializeApp();

const spotify: Spotify =
  process.env.NODE_ENV === "test" // 테스트 환경에서 테스트 모듈을 사용
    ? (() => {
        // import사용시 tsc과정에서 module폴더까지 빌드가 되기때문에 require 사용
        const SpotifyTestApi = require("../module/SpotifyTestApi").default;
        return new SpotifyTestApi();
      })()
    : new Spotify({
        clientId: "9ed1177dd6a4429db6fd2a025cb8ffb1",
        clientSecret: "97081903623b4ffb8654043f8c8d553e",
        redirectUri: "http://localhost/callback",
      });

export const getSpotifyOAuthUrl = https.onCall(async () => {
  const url = spotify.createAuthorizeURL(["user-read-email"], "");
  return url;
});

export const getSpotifyFirebaseCustomToken = https.onCall(
  async (data: {spotifyCode: string}) => {
    const {spotifyCode} = data;

    // 로그인 토큰을 받아와서 accessToken과 refreshToken으로 변환함
    const credential = await spotify.authorizationCodeGrant(spotifyCode);
    // 유저 세부 정보를 가져옴
    spotify.setAccessToken(credential.body.access_token); // getMe() accessToken을 기준으로 정보를 가져오기 때문에 적용
    const me = await spotify.getMe();

    const uid = me.body.id; // firebase auth에서 id로 사용할 값
    const email = me.body.email; // firebase auth에 저장할 이메일

    let user: UserRecord;

    try {
      // 이미 유저가 있다면 내용을 업데이트함
      user = await admin.auth().updateUser(uid, {email});
    } catch (_error) {
      // 유저가 없다는 내용의 에러인지 확인
      const error = _error as any;
      if (error.errorInfo.code !== "auth/user-not-found") throw error;
      // 없다면 유저를 생성함
      user = await admin.auth().createUser({uid, email});
    }

    // User 데이터에 spotify refreshToken, accessToken 저장해둠
    await admin.auth().setCustomUserClaims(uid, {
      refreshToken: credential.body.refresh_token,
      accessToken: credential.body.access_token,
    });
    // 앱에서 firebase auth를 사용하여 로그인을 관리할 수 있도록 firebase token을 생성
    const token = await admin.auth().createCustomToken(user.uid);
    return {token, uid};
  },
);

export const searchTracks = https.onCall(
  async (data: {query: string}, context) => {
    const {query} = data;
    // 비로그인 차단
    if (!context.auth)
      throw new HttpsError("unauthenticated", "로그인을 해주세요");

    // 유저정보 조회
    const user = await admin.auth().getUser(context.auth.uid);
    const accessToken = user.customClaims?.accessToken;
    const refreshToken = user.customClaims?.refreshToken;

    // 기본 적으로 accessToken을 기준으로 API를 사용함
    spotify.setAccessToken(accessToken);

    let result: any;

    try {
      // 요청
      result = await spotify.searchTracks(query, {limit: 20});
    } catch (error) {
      // accessToken 이 만료되어 오류가 발생했다면
      // accessToken이 만료되어 refreshToken을 사용하여 제발급 받음
      spotify.setRefreshToken(refreshToken);
      const {body} = await spotify.refreshAccessToken(); // 제발급 API
      // firebase auth에 변경된 accessToken 저장
      await admin
        .auth()
        .setCustomUserClaims(user.uid, {accessToken: body.access_token});
      // 다시 accessToken 지정
      spotify.setAccessToken(body.access_token);
      // 다시 호출
      result = await spotify.searchTracks(query, {limit: 20});
    }

    return result.body.tracks;
  },
);
