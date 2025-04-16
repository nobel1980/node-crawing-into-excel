import batchRequest from "batch-request-js";
import "dotenv/config";
import convertToExcel from "./utils/convertToExcel.js";
import dateFormatter from "./utils/dateFormatter.js";
import { setTimeout } from 'timers/promises';
import https from 'https';
import { token } from "./token.js";
import dotenv from 'dotenv';
import fetch from 'node-fetch'; // Make sure to install node-fetch

dotenv.config();

// Configure HTTP agent
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  timeout: 30000
});

const fetchWithRetry = async (url, options, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await setTimeout(1000 * (i + 1));
    }
  }
};

const dsnCount = async (devicesId) => {
  // Define the actual request function for batch-request-js
  const requestFunction = async (record) => {
    try {
      const [deviceData, inUse] = await Promise.all([
        fetchWithRetry(`https://efdmsapi.nbr.gov.bd/efdms/services/api/inventory/devices/${record.id}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          agent
        }),
        fetchWithRetry(`https://efdmsapi.nbr.gov.bd/efdms/services/api/inventory/device-inuse/${record.id}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          agent
        })
      ]);
      
      return {
        ...deviceData,
        deviceStatus: inUse ? "In use" : "Not in use"
      };
    } catch (error) {
      return { ...record, error: error.message };
    }
  };

  // Process in batches
  const processBatch = async (items, batchSize = 100) => {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Use batch-request-js with our request function
      const { data, error } = await batchRequest(batch, {
        request: requestFunction, // Pass the request function here
        batchSize: 50,
        delay: 1000
      });
      
      if (error) {
        console.error(`Error in batch ${i / batchSize + 1}:`, error);
      }
      
      results.push(...data);
      console.log(`Processed ${Math.min(i + batchSize, items.length)}/${items.length} devices`);
      
      if (i + batchSize < items.length) {
        await setTimeout(2000); // Additional delay between batches
      }
    }
    return results;
  };

  // Prepare device records (just IDs for initial processing)
  const deviceRecords = devicesId.map(id => ({ id }));

  // Process all devices
  const results = await processBatch(deviceRecords);

  // Transform results
  const dsnLists = results.map(item => ({
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
    deviceStatus: item.deviceStatus,
    bin: item.bin,
    ...(item.error && { error: item.error })
  }));

  console.log("Processing complete. Generating Excel file...");
  const currentMoment = dateFormatter();
  await convertToExcel(dsnLists, `devices-${currentMoment}`);
  console.log("Excel file generated successfully");
};

export default dsnCount;