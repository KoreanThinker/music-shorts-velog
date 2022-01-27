import * as functions from "firebase-functions";


export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

export const firstFunction = functions.https.onCall((data, context) => {
  // 파이어베이스 auth에 로그인된 서비스에서 호출시 context.auth에 데이터가 반영된다.
  console.log("is loggedin?", !!context.auth);
  console.log(data);
  return;
});
