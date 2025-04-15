import dsnCount from "./dsn.js";
import batchRequest from "batch-request-js";
import {token} from "./token.js"
import "dotenv/config";
// let allDevicesId = [];

import dotenv from 'dotenv';
dotenv.config();

console.log('Running devices.js');
console.log('URL:', process.env.URL);
console.log('NODE_TLS_REJECT_UNAUTHORIZED:', process.env.NODE_TLS_REJECT_UNAUTHORIZED);

const devicesCount = async () => {
  console.log("Please wait, File is downloading...");
  let url = `https://efdmsapi.nbr.gov.bd/efdms/services/api/inventory/devices?page=1&&size=10`;
  // const token = process.env.TOK;

  let totalItems = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      return data.totalPages;
    })
    .catch((error) => console.error("Error:", error));

  // Batch Request
  const records = Array(totalItems)
    .fill(0)
    .map((zero, i) => i);

  const request = (pageNumber) =>
    fetch(
      `https://efdmsapi.nbr.gov.bd/efdms/services/api/inventory/devices?page=${pageNumber}&&size=50`,
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

  const devicesId = data
    .map((cnt) => cnt.content.map((item) => item.id))
    .flat();
  dsnCount(devicesId);
};

devicesCount();
