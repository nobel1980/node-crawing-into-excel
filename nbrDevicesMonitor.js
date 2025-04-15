import "dotenv/config";
import https from "https";

const agent = new https.Agent({
  rejectUnauthorized: false,
});

const devicesMonitor = () => {
  const TOK = process.env.NBR_TOK;
  const url = `${process.env.NBR_URL}/services/transactionmonitoring/api/device/get-heart-beat?page=0&size=100&sort=binNo%2Casc`;
  fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${TOK}`,
      "Content-Type": "application/json",
    },
    agent: agent,
  })
    .then((res) => res.json())
    .then((data) => console.log(data))
    .catch((error) => console.log(error));
};

devicesMonitor();
