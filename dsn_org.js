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
    fetch(`https://efdmsapi.nbr.gov.bd/efdms/services/api/inventory/devices/${id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then((response) => response.json());

  const { error, data } = await batchRequest(devicesId, request, {
    batchSize: 500,
    delay: 2000,   
  });

  const dsnLists = data.map((item) => {
    return {
      id: item.id,
      version: item.version,
      deviceNumber: item.deviceNumber,
      androidId: item.androidId,
      deviceTypeId: item.deviceTypeId,
      manufacturer: item.manufacturer,
      maxInvoiceChunk: item.maxInvoiceChunk,
      minInvoiceLevel: item.minInvoiceLevel,
      isActivated: item.isActivated,
      isInitiated: item.isInitiated,
      isLocked: item.isLocked,
      bin: item.bin,
      // outletName: item.outlet.outletNameEn || outletNameBn,
      //outLetAddress: item.outlet.addressLine1 || item.outlet.addressLine2,
      //outletContact: item.outlet.mobile || item.outlet.phone,
      // officeName: item.office.officeNameEn || item.office.officeNameBn,
    };
  });
  console.log("DSN LIST: ",dsnLists )

  const currentMoment = dateFormatter();
  await convertToExcel(dsnLists, `devices-${currentMoment}`);
  // await convertToJson(dsnLists, `devices-${today}`);
};

export default dsnCount;
