import {https} from "firebase-functions";
import Spotify from "spotify-web-api-node";

const spotify = new Spotify({
  clientId: "9ed1177dd6a4429db6fd2a025cb8ffb1",
  clientSecret: "97081903623b4ffb8654043f8c8d553e",
  redirectUri: "http://localhost/callback",
});

export const getSpotifyOAuthUrl = https.onCall(async () => {
  const url = spotify.createAuthorizeURL(["user-read-email"], "");
  return url;
});

import _admin from "firebase-admin";
import {UserRecord} from "firebase-functions/v1/auth";

export const admin =
  process.env.NODE_ENV === "test" // 테스트 환경이라면
    ? _admin.initializeApp({
        // 로컬에서 인증서를 가져옴
        credential: _admin.credential.cert(
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          require("../testServiceAccountKey.json"),
        ),
      })
    : // 테스트 환경이 아니라면 firebase의 명령어로 실행하기에 자동으로 초기화됨
      _admin.initializeApp();

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

    // 앱에서 firebase auth를 사용하여 로그인을 관리할 수 있도록 firebase token을 생성
    const token = await admin.auth().createCustomToken(user.uid);
    return token;
  },
);
