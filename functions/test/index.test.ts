import {expect} from "chai";
import firebaseFunctionsTest from "firebase-functions-test";
import puppeteer from "puppeteer";

const testFunctions = firebaseFunctionsTest();

describe("/", () => {
  let Functions: any;
  let loginUrl: string;
  let token: string;
  let uid: string;

  before(() => {
    Functions = require("../src/index.ts");
  });

  context("getSpotifyOAuthUrl", () => {
    it("스포티파이로 로그인 할 수 있는 주소를 반환합니다.", async () => {
      const result = await testFunctions.wrap(Functions.getSpotifyOAuthUrl)({});
      loginUrl = result; // 웹뷰에서 띄우기 위해 변수로 저장해둠
      expect(result).to.be.a("string"); // 문자열로 반환하는지 테스트
      expect(result).to.include("https://accounts.spotify.com/authorize"); // 유효한 주소인지 확인
    });
  });

  context("실제 로그인 테스트", () => {
    it("웹뷰로 로그인 중...", async () => {
      // 브라우저 실행
      const browser = await puppeteer.launch({
        headless: true, // 백그라운드에서 웹뷰를 띄울지, 실제 배포시에는 true로 변경
        timeout: 15000,
      });
      const page = await browser.newPage(); // 페이지 하나 생성
      await page.goto(loginUrl); // getSpotifyOAuthUrl에서 받은 url로 이동
      await page.type("#login-username", "musicshortsvelog@gmail.com"); // 아이디 input에 테스트계정 아이디 삽입
      await page.type("#login-password", "musicshorts12!@"); // 페스워드 input에 비밀번호 삽입
      await page.waitForTimeout(1000); // 삽입된데이터 적용시간
      await page.click("#login-button"); // 로그인 작동
      await new Promise<void>(res =>
        page.on("response", event => {
          // 302 리다이렉트 요청이 왓을때
          if (event.status() === 302) {
            // 리다이렉트할 주소의 url query에 "code"를 가져와 token 저장
            token = event.headers().location.split("code=")[1].split("&")[0];
            res(); // 프로미스 탈출
          }
        }),
      );
      await browser.close(); // 브라우저 닫기
      expect(token.length).to.be.greaterThanOrEqual(1); // 유효한 토큰인지 테스트
    }).timeout(15000);
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
