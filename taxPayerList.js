import batchRequest from "batch-request-js";
import "dotenv/config";
import convertToExcel from "./utils/convertToExcel.js";
import dateFormatter from "./utils/dateFormatter.js";
import {token} from "./token.js"

const taxPayerList = async () => {
  console.log("Please wait, File is downloading...");
  // const token = process.env.TOK;
  const url = `https://efdmsapi.nbr.gov.bd/efdms/services/api/taxpayers?page=1&&size=10`;
  let totalItems = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      return data.totalElements;
    })
    .catch((error) => console.error("Error:", error));

  // Batch Request
  const records = Array(totalItems)
    .fill(0)
    .map((zero, i) => i);

  const request = (pageNumber) =>
    fetch(
      `https://efdmsapi.nbr.gov.bd/efdms/services/api/taxpayers?page=${pageNumber}&&size=10`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    ).then((response) => response.json());

  const { error, data } = await batchRequest(records, request, {
    batchSize: 500,
    delay: 2000,
  });
  const currentMoment = dateFormatter();
  const taxpayerData = data.map((item) => item.content).flat();
  convertToExcel(taxpayerData, `taxpayerList- ${currentMoment}`);
};
taxPayerList();
