import batchRequest from "batch-request-js";
import "dotenv/config";
import convertToExcel from "./utils/convertToExcel.js";
import dateFormatter from "./utils/dateFormatter.js";
import {token} from "./token.js"
import dotenv from 'dotenv';
dotenv.config();

const dsnCount = async (devicesId, token) => {
  // const token = process.env.TOK;
  const request = async (id) => {
    try {
      const res = await fetch(`https://efdmsapi.nbr.gov.bd/efdms/services/api/inventory/device-inuse/${id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const text = await res.text();

      // Check if the response is JSON (not HTML error page)
      if (text.trim().startsWith('{') || text.trim().startsWith('true') || text.trim().startsWith('false')) {
        const isInUse = JSON.parse(text);
        return {
          deviceId: id,
          deviceStatus: isInUse ? "In use" : "Not in use",
        };
      } else {
        console.error(`Unexpected response for ID ${id}:`, text.slice(0, 100)); // log part of HTML
        return {
          deviceId: id,
          deviceStatus: "Unknown (Invalid response)",
        };
      }
    } catch (error) {
      console.error(`Error fetching status for ID ${id}:`, error);
      return {
        deviceId: id,
        deviceStatus: "Unknown (Error)",
      };
    }
  };

  const results = await Promise.all(devicesId.map(request));
  return results;


};

export default dsnCount;
