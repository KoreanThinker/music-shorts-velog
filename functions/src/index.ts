import {https} from "firebase-functions";
import {HttpsError} from "firebase-functions/v1/https";

export const isRunning = https.onCall(async (data, context) => {
  // 데이터 없으면 차단
  if (!data) throw new HttpsError("data-loss", "데이터가 없습니다.");
  // 비로그인 차단
  if (!context.auth)
    throw new HttpsError("unauthenticated", "로그인이 필요한 작업입니다.");
  // 비동기 테스트를 위한 1초 딜레이
  await new Promise(res => setTimeout(res, 1000));

  return "server is running";
});
