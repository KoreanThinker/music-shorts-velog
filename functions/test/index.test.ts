import {expect} from "chai";
import firebaseFunctionsTest from "firebase-functions-test";

const testFunctions = firebaseFunctionsTest();

describe("/", () => {
  let Functions: any;
  let token: string;
  let uid: string;

  before(() => {
    Functions = require("../src/index.ts");
  });

  context("getSpotifyOAuthUrl", () => {
    it("스포티파이로 로그인 할 수 있는 주소를 반환합니다.", async () => {
      const result = await testFunctions.wrap(Functions.getSpotifyOAuthUrl)({});
      expect(result).to.be.a("string"); // 문자열로 반환하는지 테스트
      expect(result).to.include("https://accounts.spotify.com/authorize"); // 유효한 주소인지 확인
    });
  });

  context("getSpotifyFirebaseCustomToken", () => {
    it("함수 호출시 파이어베이스 토큰과 uid를 반환합니다.", async () => {
      const result = await testFunctions.wrap(
        Functions.getSpotifyFirebaseCustomToken,
      )({spotifyCode: token});
      uid = result.uid; // uid 캐싱
      expect(result.token).to.be.a("string"); // 토큰을 반환하는지
      expect(result.uid).to.be.a("string"); // uid를 반환하는지
    }).timeout(5000);
  });

  context("searchTracks", () => {
    it("함수 호출시 트랙 리스트를 반환합니다.", async () => {
      const result = await testFunctions.wrap(Functions.searchTracks)(
        {query: "just the two of us"},
        {auth: {uid}}, // 위에서 생성한 테스트 계정으로 로그인
      );
      expect(result.items).to.be.a("array");
    }).timeout(5000);

    it("로그인 필수 입니다.", async () => {
      const result = await testFunctions
        .wrap(Functions.searchTracks)({query: "just the two of us"})
        .catch((e: any) => e);
      expect(result).to.be.a("error");
    });
  });
});
