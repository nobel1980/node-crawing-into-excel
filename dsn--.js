import batchRequest from "batch-request-js";
// import "dotenv/config";
import convertToExcel from "./utils/convertToExcel.js";
import dateFormatter from "./utils/dateFormatter.js";
import {token} from "./token.js"
import dotenv from 'dotenv';
dotenv.config();

const Bearer_token = "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ6YW1hbiIsImlhdCI6MTc0NDc3NjM2NiwiZXhwIjoxNzQ0ODYyNzY2fQ.XpBYLtmYIelrB2LeH5bXYEXH70LPTyc5VUzmPwARl0HT_Tfddp2DIiWzkAj4yBfGsIj1TPsFLzipvLrkmUUtaA";
const dsnCount = async (devicesId) => {
  // const token = process.env.TOK;
  const request = async (id) => {
    try {
      const res = await fetch(`https://efdmsapi.nbr.gov.bd/efdms/services/api/inventory/device-inuse/${id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${Bearer_token}`,
        },
      });
  
      const text = await res.text();
  
      if (text.trim().startsWith("true") || text.trim().startsWith("false")) {
        const isInUse = JSON.parse(text);
        return {
          deviceId: id,
          deviceStatus: isInUse ? "In use" : "Not in use",
        };
      } else {
        console.error(`Invalid response for device ${id}:`, text.slice(0, 100));
        return {
          deviceId: id,
          deviceStatus: "Unknown (Invalid response)",
        };
      }
    } catch (error) {
      console.error(`Error fetching device status for ${id}:`, error);
      return {
        deviceId: id,
        deviceStatus: "Unknown (Error)",
      };
    }
  };
  

  const { error, data } = await batchRequest(devicesId, request, {
    batchSize: 500,
    delay: 2000,   
  });

  const dsnLists = data.map((item) => {
    return {
      deviceId: item.deviceId,
      deviceStatus: item.deviceStatus,
    };
  });
  console.log("DSN LIST: ",dsnLists )

  const currentMoment = dateFormatter();
  await convertToExcel(dsnLists, `devices-${currentMoment}`);
  // await convertToJson(dsnLists, `devices-${today}`);
};

export default dsnCount;
