import batchRequest from "batch-request-js";
import "dotenv/config";
import convertToExcel from "./utils/convertToExcel.js";
import dateFormatter from "./utils/dateFormatter.js";
import {token} from "./token.js"
import dotenv from 'dotenv';
dotenv.config();

const dsnCount = async (devicesId) => {
  // const token = process.env.TOK;
  const request = (id) =>
      fetch(`https://efdmsapi.nbr.gov.bd/efdms/services/api/inventory/device-inuse/${id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then((response) => response.json());
    // .then((isInUse) => ({
    //   deviceId: id,
    //   deviceStatus: isInUse ? "In use" : "Not in use",
    // })) 
    // .catch((error) => {
    //   console.error("Error fetching device status:", error);
    //   return {
    //     deviceId: id,
    //     deviceStatus: "Unknown (Error)",
    //   };
    // });

    console.log(response);
    return(0);


  const { error, data } = await batchRequest(devicesId, request, {
    batchSize: 500,
    delay: 2000,   
  });

  const dsnLists = data.map((item) => {
    return {
      deviceStatus: item.deviceStatus,
    };
  });
  console.log("DSN LIST: ",dsnLists )

  const currentMoment = dateFormatter();
  await convertToExcel(dsnLists, `devices-${currentMoment}`);
  // await convertToJson(dsnLists, `devices-${today}`);
};

export default dsnCount;
