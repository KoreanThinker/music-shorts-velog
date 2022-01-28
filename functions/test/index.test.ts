import {expect} from "chai";
import firebaseFunctionsTest from "firebase-functions-test";
import {auth} from "firebase-functions/v1";

// onCall 함수를 실행해주는 모듈
const testFunctions = firebaseFunctionsTest();

// description은 그룹화 라고 보면됨, 보통 "/", "/api/auth"등 폴더, 라우팅 위치등을 title로 사용함
describe("/", () => {
  let Functions: any;
  let testUser: auth.UserRecord;

  // "/"이 스코프 안에 테스트 함수들이 실행되기 전 가장먼저 실행되는 함수, 생상자 같은 느낌
  before(() => {
    // import를 사용하지 않고 require을 사용하는 이유는
    // import로 불러오면 "firebaseFunctionsTest()"이 함수등
    // 기본적으로 필요한 setup들이 있는데 그보다 전에 호출이 되어 test환경이 아닌 dev환경으로 인식됨
    // 다음 챕터에서 확인할 수 있음
    Functions = require("../src/index.ts");
    // 임의의 테스트 유저 생성
    testUser = testFunctions.auth.makeUserRecord({id: "test_user"});
  });

  // 이 스코프 마지막함수 실행후에 실행되는 함수, 소멸자 같은 느낌
  after(async () => {
    // testFunctions 초기화
    await testFunctions.cleanup();
  });

  // context는 description과 일치 하는 기능을 갖지만 주로 실제 실행할 함수의 이름을 title로 사용한다.
  context("isRunning", () => {
    // it는 실제 테스트함수
    it("결과의 타입은 string입니다.", async () => {
      // 실행할 함수를 testFunctions.wrap로 감싸면 실행할 수 있다.
      const result = await testFunctions.wrap(Functions.isRunning)(
        // Data
        {
          testData: "hello",
        },
        // Context
        {auth: testUser},
      );
      // a()함수는 타입체크
      expect(result).to.be.a("string");
      // console.log(result) <= 이러면 안됨
      // async 함수안에서 test할때는 함수의 마지막 줄이 무조건 expect여야함 아닐시 timeout에러 발생
    });

    it("결과값은 server is running 입니다.", async () => {
      const result = await testFunctions.wrap(Functions.isRunning)(
        {
          testData: "hello",
        },
        {auth: testUser},
      );
      expect(result).to.equal("server is running");
    });

    it("Data가 없으면 오류가 발생시킵니다.", async () => {
      // 에러 채크는 .catch후 result를 error로 매핑한다.
      const result = await testFunctions
        .wrap(Functions.isRunning)(undefined, {auth: testUser})
        .catch((e: any) => e);
      // 그후 타입이 error인지 체크
      expect(result).to.be.a("error");
    });

    it("비로그인시 오류가 발생합니다.", async () => {
      const result = await testFunctions
        .wrap(Functions.isRunning)({
          testData: "hello",
        })
        .catch((e: any) => e);
      expect(result).to.be.a("error");
    });
  });
});
